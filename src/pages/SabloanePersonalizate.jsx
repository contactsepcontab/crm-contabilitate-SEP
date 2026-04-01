import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Loading } from "../components/UI";

// ============================================================
// VARIABILE DISPONIBILE — explicatii pentru utilizator
// ============================================================
const VARIABILE = [
  { grup: "Prestator (firma de contabilitate)", vars: [
    { var: "{{prestator_denumire}}", desc: "Denumirea firmei tale" },
    { var: "{{prestator_cui}}", desc: "CUI firma ta" },
    { var: "{{prestator_j}}", desc: "Nr. Reg. Com. firma ta" },
    { var: "{{prestator_adresa}}", desc: "Adresa completă firma ta" },
    { var: "{{prestator_telefon}}", desc: "Telefon firma ta" },
    { var: "{{prestator_email}}", desc: "Email firma ta" },
    { var: "{{prestator_administrator}}", desc: "Administratorul firmei tale" },
  ]},
  { grup: "Beneficiar (client)", vars: [
    { var: "{{beneficiar_denumire}}", desc: "Denumirea clientului" },
    { var: "{{beneficiar_cui}}", desc: "CUI client" },
    { var: "{{beneficiar_j}}", desc: "Nr. Reg. Com. client" },
    { var: "{{beneficiar_adresa}}", desc: "Adresa completă client" },
    { var: "{{beneficiar_telefon}}", desc: "Telefon client" },
    { var: "{{beneficiar_email}}", desc: "Email client" },
    { var: "{{beneficiar_administrator}}", desc: "Administratorul clientului" },
  ]},
  { grup: "Contract", vars: [
    { var: "{{numar_contract}}", desc: "Numărul contractului" },
    { var: "{{data_contract}}", desc: "Data contractului" },
    { var: "{{data_start}}", desc: "Data de start" },
    { var: "{{data_sfarsit}}", desc: "Data de expirare" },
    { var: "{{tarif}}", desc: "Tariful lunar" },
    { var: "{{tarif_bilant}}", desc: "Tariful de bilanț" },
    { var: "{{moneda}}", desc: "Moneda (RON/EUR)" },
    { var: "{{periodicitate}}", desc: "Periodicitate facturare" },
    { var: "{{termen_plata}}", desc: "Termen de plată (zile)" },
    { var: "{{prima_luna}}", desc: "Prima lună tarifată" },
    { var: "{{prima_luna_contabil}}", desc: "Prima lună din punct de vedere contabil" },
    { var: "{{ultima_luna}}", desc: "Ultima lună lucrată" },
    { var: "{{nr_salariati}}", desc: "Numărul de salariați" },
  ]},
];

const TIP_ENTITATE = ["Toate tipurile", "SRL", "SA", "PFA", "II", "IF", "ONG", "Asociație", "Fundație", "Sindicat"];
const CATEGORII = ["Contract", "Act Adițional", "Notificare", "Altul"];
const CAT_COLOR = {
  "Contract": "bg-blue-100 text-blue-800 border-blue-200",
  "Act Adițional": "bg-orange-100 text-orange-800 border-orange-200",
  "Notificare": "bg-red-100 text-red-800 border-red-200",
  "Altul": "bg-gray-100 text-gray-700 border-gray-200",
};

// helper adresa
const adresaFn = (obj) => [
  obj?.strada && obj?.numar ? `${obj.strada} nr. ${obj.numar}` : obj?.strada,
  obj?.bloc ? `Bl. ${obj.bloc}` : null,
  obj?.localitate, obj?.judet,
].filter(Boolean).join(", ") || "___";

// inlocuieste variabilele in text
const inlocuieste = (text, contract, firma, client) => {
  const d = {
    prestator_denumire: firma?.denumire || "___",
    prestator_cui: firma?.cui || "___",
    prestator_j: firma?.nr_reg_com || "___",
    prestator_adresa: adresaFn(firma),
    prestator_telefon: firma?.telefon || "___",
    prestator_email: firma?.email || "___",
    prestator_administrator: firma?.administrator || "___",
    beneficiar_denumire: client?.denumire || "___",
    beneficiar_cui: client?.cui || "___",
    beneficiar_j: client?.nr_reg_com || "___",
    beneficiar_adresa: adresaFn(client),
    beneficiar_telefon: client?.persoana_contact_telefon || client?.administrator_telefon || "___",
    beneficiar_email: client?.persoana_contact_email || client?.administrator_email || "___",
    beneficiar_administrator: client?.administrator_nume || "___",
    numar_contract: contract?.numar_contract || "___",
    data_contract: contract?.data_contract || "___",
    data_start: contract?.data_start || "___",
    data_sfarsit: contract?.data_sfarsit || "___",
    tarif: contract?.tarif || "___",
    tarif_bilant: contract?.tarif_bilant || "___",
    moneda: contract?.moneda || "RON",
    periodicitate: contract?.periodicitate_facturare || "lunar",
    termen_plata: contract?.termen_plata || "15",
    prima_luna: contract?.prima_luna_lucrata || "___",
    prima_luna_contabil: contract?.prima_luna_contabil || "___",
    ultima_luna: contract?.ultima_luna_lucrata || "___",
    nr_salariati: client?.nr_salariati || "___",
  };
  let result = text;
  Object.entries(d).forEach(([key, val]) => {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
  });
  return result;
};

export default function SabloanePersonalizate() {
  const [sabloane, setSabloane] = useState([]);
  const [firme, setFirme] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [contracte, setContracte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFiltru, setCatFiltru] = useState("Toate");
  const [modal, setModal] = useState(null); // null | "add" | "edit" | "genera"
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showVars, setShowVars] = useState(false);

  // Form sablon
  const [form, setForm] = useState({
    denumire: "", categorie: "Contract", tip_entitate: "Toate tipurile", continut: "",
  });

  // Generare
  const [contractId, setContractId] = useState("");
  const [firmaId, setFirmaId] = useState("");
  const [clientId, setClientId] = useState("");
  const [modSelectie, setModSelectie] = useState("contract");
  const [textGenerat, setTextGenerat] = useState("");
  const [stepGen, setStepGen] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const [sSnap, fSnap, cSnap, ctrSnap] = await Promise.all([
          getDocs(collection(db, "sabloane_personalizate")),
          getDocs(collection(db, "firme_contabilitate")),
          getDocs(collection(db, "clienti")),
          getDocs(collection(db, "contracte")),
        ]);
        setSabloane(sSnap.docs.map(d => ({ ...d.data(), id: d.id })));
        setFirme(fSnap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => a.denumire?.localeCompare(b.denumire)));
        setClienti(cSnap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => a.denumire?.localeCompare(b.denumire)));
        setContracte(ctrSnap.docs.map(d => ({ ...d.data(), id: d.id })));
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!form.denumire.trim()) return alert("Completează denumirea șablonului!");
    if (!form.continut.trim()) return alert("Completează conținutul șablonului!");
    setSaving(true);
    try {
      const data = { ...form, updated_at: serverTimestamp() };
      if (modal === "add") {
        data.created_at = serverTimestamp();
        await addDoc(collection(db, "sabloane_personalizate"), data);
      } else {
        await updateDoc(doc(db, "sabloane_personalizate", selected.id), data);
      }
      const snap = await getDocs(collection(db, "sabloane_personalizate"));
      setSabloane(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      setModal(null);
    } catch(e) { alert("Eroare: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Ștergi acest șablon?")) return;
    await deleteDoc(doc(db, "sabloane_personalizate", id));
    setSabloane(prev => prev.filter(s => s.id !== id));
  };

  const deschideGenerare = (s) => {
    setSelected(s);
    setContractId(""); setFirmaId(""); setClientId("");
    setTextGenerat(""); setStepGen(1); setModSelectie("contract");
    setModal("genera");
  };

  const contractSelectat = contracte.find(c => c.id === contractId);
  const firmaSelectata = firme.find(f => f.id === (modSelectie === "contract" ? contractSelectat?.firma_contabilitate_id : firmaId));
  const clientSelectat = clienti.find(c => c.id === (modSelectie === "contract" ? contractSelectat?.client_id : clientId));

  const genereaza = () => {
    if (!firmaSelectata || !clientSelectat) return alert("Selectează firma și clientul!");
    const text = inlocuieste(
      selected.continut,
      modSelectie === "contract" ? contractSelectat : null,
      firmaSelectata,
      clientSelectat
    );
    setTextGenerat(text);
    setStepGen(2);
  };

  const descarca = () => {
    const blob = new Blob([textGenerat], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected?.denumire} - ${clientSelectat?.denumire || "document"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const insereazaVar = (v) => {
    const txt = form.continut;
    setForm(p => ({ ...p, continut: txt + v }));
  };

  const sabloaneFiltrate = sabloane.filter(s => catFiltru === "Toate" || s.categorie === catFiltru);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Șabloane Personalizate</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Creezi propriile modele de documente cu textul tău, adaptate pentru SRL, PFA, Asociație etc.
          </p>
        </div>
        <button
          onClick={() => { setForm({ denumire:"", categorie:"Contract", tip_entitate:"Toate tipurile", continut:"" }); setModal("add"); }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          + Șablon nou
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5 text-xs text-amber-800">
        <p className="font-bold mb-1">Cum funcționează șabloanele personalizate</p>
        <p>Scrii textul contractului/actului exact cum vrei tu, iar în locurile unde trebuie date din sistem
        (firmă, client, tarif etc.) pui variabile de forma <code className="bg-amber-100 px-1 rounded">{"{{beneficiar_denumire}}"}</code>.
        La generare, variabilele se înlocuiesc automat cu datele reale.</p>
      </div>

      {/* Filtre */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {["Toate", ...CATEGORII].map(c => (
          <button key={c} onClick={() => setCatFiltru(c)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${catFiltru===c ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
            {c} {c !== "Toate" && `(${sabloane.filter(s=>s.categorie===c).length})`}
          </button>
        ))}
      </div>

      {/* Lista sabloane */}
      {loading ? <Loading /> : sabloaneFiltrate.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-base font-semibold text-gray-700 mb-1">Nu există șabloane personalizate</p>
          <p className="text-sm text-gray-400 mb-4">Creează primul tău șablon cu textul adaptat firmei tale</p>
          <button
            onClick={() => { setForm({ denumire:"", categorie:"Contract", tip_entitate:"Toate tipurile", continut:"" }); setModal("add"); }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl"
          >
            + Șablon nou
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sabloaneFiltrate.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${CAT_COLOR[s.categorie] || CAT_COLOR["Altul"]}`}>
                  {s.categorie}
                </span>
                {s.tip_entitate && s.tip_entitate !== "Toate tipurile" && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s.tip_entitate}</span>
                )}
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-2 flex-1">{s.denumire}</h3>
              <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                {s.continut?.substring(0, 100)}...
              </p>
              <div className="flex gap-2 pt-3 border-t border-gray-50">
                <button onClick={() => deschideGenerare(s)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                  Generează
                </button>
                <button onClick={() => { setForm({ ...s }); setSelected(s); setModal("edit"); }}
                  className="px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Editează
                </button>
                <button onClick={() => handleDelete(s.id)}
                  className="px-3 py-2 text-xs font-medium text-red-500 border border-red-100 rounded-lg hover:bg-red-50">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================
          MODAL: ADD / EDIT SABLON
          ============================================================ */}
      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-bold text-gray-900">
                {modal === "add" ? "Șablon nou" : `Editează: ${selected?.denumire}`}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">×</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Denumire șablon *</label>
                  <input value={form.denumire} onChange={e => setForm(p => ({...p, denumire: e.target.value}))}
                    placeholder="Ex: Contract contabilitate PFA"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Categorie</label>
                  <select value={form.categorie} onChange={e => setForm(p => ({...p, categorie: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {CATEGORII.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Tip entitate (pentru cine)</label>
                  <select value={form.tip_entitate} onChange={e => setForm(p => ({...p, tip_entitate: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {TIP_ENTITATE.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Editor + variabile */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Editor text */}
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-600">Conținut șablon *</label>
                    <span className="text-xs text-gray-400">{form.continut.length} caractere</span>
                  </div>
                  <textarea
                    value={form.continut}
                    onChange={e => setForm(p => ({...p, continut: e.target.value}))}
                    rows={24}
                    placeholder={`Scrie textul contractului aici...\n\nExemplu:\nCONTRACT DE PRESTĂRI SERVICII\nNr. {{numar_contract}} din {{data_contract}}\n\nPRESTATOR: {{prestator_denumire}}\nCUI: {{prestator_cui}}\nAdresă: {{prestator_adresa}}\nAdministrator: {{prestator_administrator}}\n\nBENEFICIAR: {{beneficiar_denumire}}\n...`}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 focus:bg-white resize-none leading-relaxed"
                  />
                </div>

                {/* Variabile disponibile */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-600">Variabile disponibile</label>
                    <button onClick={() => setShowVars(!showVars)}
                      className="text-xs text-indigo-600 hover:underline">
                      {showVars ? "Ascunde" : "Arată toate"}
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
                    {VARIABILE.map(grup => (
                      <div key={grup.grup}>
                        <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600 border-b border-gray-100">
                          {grup.grup}
                        </div>
                        {(showVars ? grup.vars : grup.vars.slice(0, 4)).map(v => (
                          <button
                            key={v.var}
                            onClick={() => insereazaVar(v.var)}
                            title={v.desc}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 border-b border-gray-50 transition-colors group"
                          >
                            <code className="text-indigo-600 font-mono group-hover:text-indigo-800">{v.var}</code>
                            <span className="text-gray-400 ml-1 text-[10px]">— {v.desc}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    Click pe o variabilă pentru a o insera în text.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-100">
                <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50">Anulează</button>
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? "Se salvează..." : modal === "add" ? "Salvează șablonul" : "Actualizează șablonul"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: GENERARE DOCUMENT
          ============================================================ */}
      {modal === "genera" && selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-bold text-gray-900">{selected.denumire}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">×</button>
            </div>
            <div className="px-6 py-5">

              {stepGen === 1 && (
                <div className="space-y-4">
                  {/* Toggle */}
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                    <button onClick={() => setModSelectie("contract")}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${modSelectie==="contract" ? "bg-white shadow-sm text-indigo-700" : "text-gray-500"}`}>
                      Din Contracte Emise
                    </button>
                    <button onClick={() => setModSelectie("manual")}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${modSelectie==="manual" ? "bg-white shadow-sm text-indigo-700" : "text-gray-500"}`}>
                      Selectare manuală
                    </button>
                  </div>

                  {modSelectie === "contract" && (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5">Selectează contractul *</label>
                      <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        value={contractId} onChange={e => setContractId(e.target.value)}>
                        <option value="">— Selectează contractul —</option>
                        {contracte.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.numar_contract} | {c.client_denumire} | {c.status_contract}
                          </option>
                        ))}
                      </select>
                      {contractSelectat && firmaSelectata && clientSelectat && (
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800">
                            <p className="font-bold mb-1">Prestator</p>
                            <p>{firmaSelectata.denumire}</p>
                            <p>Admin: {firmaSelectata.administrator || "—"}</p>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800">
                            <p className="font-bold mb-1">Beneficiar</p>
                            <p>{clientSelectat.denumire}</p>
                            <p>Admin: {clientSelectat.administrator_nume || "—"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {modSelectie === "manual" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">Firma de contabilitate *</label>
                        <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          value={firmaId} onChange={e => setFirmaId(e.target.value)}>
                          <option value="">— Selectează firma —</option>
                          {firme.map(f => <option key={f.id} value={f.id}>{f.denumire_scurta||f.denumire}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">Client *</label>
                        <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          value={clientId} onChange={e => setClientId(e.target.value)}>
                          <option value="">— Selectează clientul —</option>
                          {clienti.map(c => <option key={c.id} value={c.id}>{c.denumire} — {c.cui}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50">Anulează</button>
                    <button onClick={genereaza}
                      disabled={modSelectie === "contract" ? !contractId : (!firmaId || !clientId)}
                      className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                      Generează Documentul
                    </button>
                  </div>
                </div>
              )}

              {stepGen === 2 && (
                <div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap max-h-[55vh] overflow-y-auto leading-relaxed mb-3">
                    {textGenerat}
                  </div>
                  <p className="text-xs text-gray-400">Descarcă ca .txt → deschizi în Word → editezi formatarea → semnezi.</p>
                  <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
                    <button onClick={() => setStepGen(1)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50">← Înapoi</button>
                    <div className="flex gap-2">
                      <button onClick={() => navigator.clipboard.writeText(textGenerat).then(() => alert("Copiat!"))}
                        className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50">
                        Copiază
                      </button>
                      <button onClick={descarca}
                        className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
                        Descarcă .txt
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
