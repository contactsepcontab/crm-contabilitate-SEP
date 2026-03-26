import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Badge, Modal, FormSection, FormField, Input, Select,
  Btn, PageHeader, EmptyState, Loading, Card
} from "../components/UI";

const STADII = [
  { id: "nou",               label: "Nou",                color: "gray"   },
  { id: "contactat",         label: "Contactat",          color: "blue"   },
  { id: "ofertat",           label: "Ofertat",            color: "indigo" },
  { id: "negociere",         label: "Negociere",          color: "orange" },
  { id: "asteptare_semnare", label: "Asteptare semnare",  color: "yellow" },
  { id: "castigat",          label: "Castigat",           color: "green"  },
  { id: "pierdut",           label: "Pierdut",            color: "red"    },
];

const SERVICII_INTERES = [
  "Contabilitate", "Bilant", "Resurse umane (HR)",
  "Consultanta", "Salarizare", "Revisal", "Altul",
];

const CANAL_PROVENIENTA = [
  "Recomandare", "Facebook", "Google", "Website",
  "Telefon", "Partener", "Alta sursa",
];

const MOTIV_PIERDERE = [
  "Pret prea mare", "A ales alt furnizor", "Nu a mai fost interesat",
  "Nu a raspuns", "Firma inchisa", "Alt motiv",
];

const EMPTY_FORM = {
  denumire_firma: "", cui: "", tip_entitate: "SRL",
  persoana_contact: "", functie_contact: "", telefon: "", email: "",
  judet: "", localitate: "",
  servicii_interes: "", tarif_propus: "", moneda: "RON",
  canal_provenienta: "", sursa_detaliata: "", recomandat_de: "",
  stadiu: "nou",
  data_intrare: new Date().toISOString().split("T")[0],
  data_ultima_interactiune: "",
  urmator_pas: "", data_urmatorului_pas: "",
  responsabil: "",
  motiv_pierdere: "", observatii: "",
  convertit_in_client: false, client_id: "",
};

export default function Leaduri() {
  const [leaduri, setLeaduri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewMod, setViewMod] = useState("kanban"); // kanban | lista
  const [filtruStadiu, setFiltruStadiu] = useState("");
  const [search, setSearch] = useState("");
  const [modalConvertire, setModalConvertire] = useState(null);

  const reload = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "leaduri"));
      setLeaduri(snap.docs.map(d => ({ ...d.data(), id: d.id }))
        .sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const filtered = leaduri.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      l.denumire_firma?.toLowerCase().includes(q) ||
      l.cui?.includes(q) ||
      l.persoana_contact?.toLowerCase().includes(q) ||
      l.telefon?.includes(q);
    const matchStadiu = !filtruStadiu || l.stadiu === filtruStadiu;
    return matchSearch && matchStadiu;
  });

  const openAdd = () => { setForm(EMPTY_FORM); setModal("add"); };
  const openEdit = (l) => { setForm({ ...EMPTY_FORM, ...l }); setSelected(l); setModal("edit"); };
  const openView = (l) => { setSelected(l); setModal("view"); };

  const handleSave = async () => {
    if (!form.denumire_firma.trim()) return alert("Denumirea firmei este obligatorie!");
    setSaving(true);
    try {
      const data = { ...form, updated_at: serverTimestamp() };
      if (modal === "add") {
        data.created_at = serverTimestamp();
        await addDoc(collection(db, "leaduri"), data);
      } else {
        await updateDoc(doc(db, "leaduri", form.id), data);
      }
      await reload();
      setModal(null);
    } catch (e) { alert("Eroare: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Stergi acest lead?")) return;
    try {
      await deleteDoc(doc(db, "leaduri", id));
      await reload();
      if (modal === "view") setModal(null);
    } catch (e) { alert("Eroare: " + e.message); }
  };

  const handleSchimbaStadiu = async (lead, stadiuNou) => {
    try {
      await updateDoc(doc(db, "leaduri", lead.id), {
        stadiu: stadiuNou,
        data_ultima_interactiune: new Date().toISOString().split("T")[0],
        updated_at: serverTimestamp(),
      });
      await reload();
    } catch (e) { alert("Eroare: " + e.message); }
  };

  const handleConvertire = async () => {
    if (!modalConvertire) return;
    try {
      // Creeaza client din lead
      await addDoc(collection(db, "clienti"), {
        denumire: modalConvertire.denumire_firma,
        cui: modalConvertire.cui || "",
        tip_entitate: modalConvertire.tip_entitate || "SRL",
        persoana_contact_nume: modalConvertire.persoana_contact || "",
        persoana_contact_telefon: modalConvertire.telefon || "",
        persoana_contact_email: modalConvertire.email || "",
        judet: modalConvertire.judet || "",
        localitate: modalConvertire.localitate || "",
        canal_provenienta: modalConvertire.canal_provenienta || "",
        recomandat_de: modalConvertire.recomandat_de || "",
        status_client: "Activ",
        este_client_nou: true,
        tarif_total: modalConvertire.tarif_propus || "",
        moneda: modalConvertire.moneda || "RON",
        documente: [], istoric: [],
        data_inceput_colaborare: new Date().toISOString().split("T")[0],
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      // Marcheaza lead-ul ca castigat + convertit
      await updateDoc(doc(db, "leaduri", modalConvertire.id), {
        stadiu: "castigat",
        convertit_in_client: true,
        data_ultima_interactiune: new Date().toISOString().split("T")[0],
        updated_at: serverTimestamp(),
      });
      setModalConvertire(null);
      setModal(null);
      await reload();
      alert(`Clientul "${modalConvertire.denumire_firma}" a fost creat cu succes in modulul Clienti Activi!`);
    } catch (e) { alert("Eroare la convertire: " + e.message); }
  };

  const f = (field) => form[field] ?? "";
  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target?.value ?? e }));

  const getStadiuConfig = (stadiu) => STADII.find(s => s.id === stadiu) || STADII[0];

  // Stats
  const statsStadii = STADII.map(s => ({
    ...s,
    count: leaduri.filter(l => l.stadiu === s.id).length,
  }));

  const azi = new Date().toISOString().split("T")[0];
  const urmatoarele = leaduri.filter(l =>
    l.data_urmatorului_pas && l.data_urmatorului_pas <= azi &&
    l.stadiu !== "castigat" && l.stadiu !== "pierdut"
  );

  return (
    <div className="p-6">
      <PageHeader
        title="Lead-uri / Potentiali Clienti"
        subtitle={`${leaduri.filter(l => l.stadiu !== "castigat" && l.stadiu !== "pierdut").length} lead-uri active`}
        action={
          <div className="flex gap-2">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {["kanban","lista"].map(v => (
                <button key={v} onClick={() => setViewMod(v)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all capitalize ${
                    viewMod === v ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                  }`}>{v}</button>
              ))}
            </div>
            <Btn onClick={openAdd}>+ Lead nou</Btn>
          </div>
        }
      />

      {/* Alerta urmatoare actiuni */}
      {urmatoarele.length > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 mb-5">
          <p className="text-sm font-bold text-warning-600 mb-2">
            {urmatoarele.length} lead-uri cu actiuni scadente astazi sau intarziate
          </p>
          <div className="flex flex-wrap gap-2">
            {urmatoarele.map(l => (
              <button key={l.id} onClick={() => openView(l)}
                className="text-xs bg-white border border-warning-200 rounded-lg px-2 py-1 text-warning-600 hover:bg-warning-50">
                {l.denumire_firma} — {l.urmator_pas}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline stats */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {statsStadii.map(s => (
          <button key={s.id}
            onClick={() => setFiltruStadiu(filtruStadiu === s.id ? "" : s.id)}
            className={`flex-shrink-0 bg-white border rounded-xl px-4 py-3 text-center transition-all hover:shadow-md ${
              filtruStadiu === s.id ? "border-primary-400 bg-primary-50" : "border-slate-100"
            }`}>
            <p className="text-xl font-bold text-slate-800">{s.count}</p>
            <p className="text-xs text-slate-400 mt-0.5 whitespace-nowrap">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-5">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cauta dupa firma, contact, telefon..."
          className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white" />
        {filtruStadiu && (
          <button onClick={() => setFiltruStadiu("")}
            className="px-3 py-2 text-sm text-danger-400 border border-danger-200 rounded-lg hover:bg-danger-50">
            Sterge filtru
          </button>
        )}
      </div>

      {loading ? <Loading /> : filtered.length === 0 ? (
        <EmptyState title="Nu exista lead-uri" subtitle="Adauga primul potential client"
          action={<Btn onClick={openAdd}>+ Lead nou</Btn>} />
      ) : viewMod === "kanban" ? (

        /* ============ KANBAN VIEW ============ */
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STADII.map(stadiu => {
            const leadsStadiu = filtered.filter(l => l.stadiu === stadiu.id);
            return (
              <div key={stadiu.id} className="flex-shrink-0 w-64">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <Badge text={stadiu.label} color={stadiu.color} />
                  </div>
                  <span className="text-xs font-bold text-slate-400">{leadsStadiu.length}</span>
                </div>
                <div className="space-y-2 min-h-16">
                  {leadsStadiu.map(lead => (
                    <div key={lead.id}
                      onClick={() => openView(lead)}
                      className="bg-white border border-slate-100 rounded-xl p-3 cursor-pointer hover:shadow-md transition-all">
                      <p className="font-semibold text-sm text-slate-800 mb-1">{lead.denumire_firma}</p>
                      {lead.persoana_contact && (
                        <p className="text-xs text-slate-400">{lead.persoana_contact}</p>
                      )}
                      {lead.telefon && (
                        <p className="text-xs text-slate-400">{lead.telefon}</p>
                      )}
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {lead.servicii_interes && (
                          <Badge text={lead.servicii_interes.split(",")[0].trim()} color="indigo" />
                        )}
                        {lead.tarif_propus && (
                          <span className="text-xs text-success-400 font-semibold">
                            {lead.tarif_propus} {lead.moneda}
                          </span>
                        )}
                      </div>
                      {lead.data_urmatorului_pas && (
                        <p className={`text-xs mt-1.5 ${
                          lead.data_urmatorului_pas <= azi ? "text-warning-500 font-semibold" : "text-slate-400"
                        }`}>
                          Urmator: {lead.data_urmatorului_pas.split("-").reverse().join(".")}
                        </p>
                      )}
                      {lead.convertit_in_client && (
                        <Badge text="Convertit" color="green" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        /* ============ LISTA VIEW ============ */
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Firma","Contact","Servicii","Tarif","Canal","Stadiu","Urmator pas"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openView(lead)}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{lead.denumire_firma}</p>
                      {lead.cui && <p className="text-xs text-slate-400">{lead.cui}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{lead.persoana_contact || "—"}</p>
                      {lead.telefon && <p className="text-xs text-slate-400">{lead.telefon}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{lead.servicii_interes || "—"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-success-400">
                      {lead.tarif_propus ? `${lead.tarif_propus} ${lead.moneda}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{lead.canal_provenienta || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge text={getStadiuConfig(lead.stadiu).label} color={getStadiuConfig(lead.stadiu).color} />
                    </td>
                    <td className="px-4 py-3">
                      {lead.data_urmatorului_pas ? (
                        <span className={`text-xs ${lead.data_urmatorului_pas <= azi ? "text-warning-500 font-semibold" : "text-slate-400"}`}>
                          {lead.data_urmatorului_pas.split("-").reverse().join(".")}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
            {filtered.length} lead-uri afisate
          </div>
        </div>
      )}

      {/* MODAL ADD/EDIT */}
      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? "Lead nou" : `Editeaza: ${selected?.denumire_firma}`}
          size="xl" onClose={() => setModal(null)}>
          <FormSection title="Date firma potential client">
            <FormField label="Denumire firma" required full>
              <Input value={f("denumire_firma")} onChange={set("denumire_firma")} placeholder="Ex: SC Viitor SRL" />
            </FormField>
            <FormField label="CUI">
              <Input value={f("cui")} onChange={set("cui")} placeholder="RO12345678" />
            </FormField>
            <FormField label="Tip entitate">
              <Select value={f("tip_entitate")} onChange={set("tip_entitate")}
                options={["SRL","SA","PFA","II","ONG","Altul"].map(t => ({ value: t, label: t }))} />
            </FormField>
            <FormField label="Judet">
              <Input value={f("judet")} onChange={set("judet")} />
            </FormField>
            <FormField label="Localitate">
              <Input value={f("localitate")} onChange={set("localitate")} />
            </FormField>
          </FormSection>

          <FormSection title="Persoana de contact">
            <FormField label="Nume persoana contact">
              <Input value={f("persoana_contact")} onChange={set("persoana_contact")} />
            </FormField>
            <FormField label="Functie">
              <Input value={f("functie_contact")} onChange={set("functie_contact")} placeholder="Ex: Administrator" />
            </FormField>
            <FormField label="Telefon">
              <Input value={f("telefon")} onChange={set("telefon")} />
            </FormField>
            <FormField label="Email">
              <Input type="email" value={f("email")} onChange={set("email")} />
            </FormField>
          </FormSection>

          <FormSection title="Servicii si tarifare">
            <FormField label="Servicii de interes" full>
              <Input value={f("servicii_interes")} onChange={set("servicii_interes")}
                placeholder="Ex: Contabilitate, HR" />
            </FormField>
            <FormField label="Tarif propus">
              <Input type="number" value={f("tarif_propus")} onChange={set("tarif_propus")} placeholder="0" />
            </FormField>
            <FormField label="Moneda">
              <Select value={f("moneda")} onChange={set("moneda")}
                options={[{ value: "RON", label: "RON" }, { value: "EUR", label: "EUR" }]} />
            </FormField>
          </FormSection>

          <FormSection title="Sursa si pipeline">
            <FormField label="Canal provenienta">
              <Select value={f("canal_provenienta")} onChange={set("canal_provenienta")}
                placeholder="Selecteaza"
                options={CANAL_PROVENIENTA.map(c => ({ value: c, label: c }))} />
            </FormField>
            <FormField label="Sursa detaliata">
              <Input value={f("sursa_detaliata")} onChange={set("sursa_detaliata")}
                placeholder="Ex: Pagina Facebook Septembrie" />
            </FormField>
            <FormField label="Recomandat de">
              <Input value={f("recomandat_de")} onChange={set("recomandat_de")} />
            </FormField>
            <FormField label="Stadiu">
              <Select value={f("stadiu")} onChange={set("stadiu")}
                options={STADII.map(s => ({ value: s.id, label: s.label }))} />
            </FormField>
            <FormField label="Responsabil">
              <Input value={f("responsabil")} onChange={set("responsabil")} placeholder="Cine se ocupa" />
            </FormField>
            <FormField label="Data intrare">
              <Input type="date" value={f("data_intrare")} onChange={set("data_intrare")} />
            </FormField>
          </FormSection>

          <FormSection title="Urmator pas">
            <FormField label="Ce urmeaza" full>
              <Input value={f("urmator_pas")} onChange={set("urmator_pas")}
                placeholder="Ex: Trimite oferta, Suna pentru feedback" />
            </FormField>
            <FormField label="Data urmatorului pas">
              <Input type="date" value={f("data_urmatorului_pas")} onChange={set("data_urmatorului_pas")} />
            </FormField>
            <FormField label="Data ultima interactiune">
              <Input type="date" value={f("data_ultima_interactiune")} onChange={set("data_ultima_interactiune")} />
            </FormField>
          </FormSection>

          {f("stadiu") === "pierdut" && (
            <FormSection title="Motiv pierdere">
              <FormField label="Motiv" full>
                <Select value={f("motiv_pierdere")} onChange={set("motiv_pierdere")}
                  placeholder="Selecteaza motivul"
                  options={MOTIV_PIERDERE.map(m => ({ value: m, label: m }))} />
              </FormField>
            </FormSection>
          )}

          <FormSection title="Observatii">
            <FormField label="Observatii" full>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                rows={3} value={f("observatii")} onChange={set("observatii")} />
            </FormField>
          </FormSection>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 mt-4">
            <Btn variant="secondary" onClick={() => setModal(null)}>Anuleaza</Btn>
            <Btn onClick={handleSave} disabled={saving}>
              {saving ? "Se salveaza..." : modal === "add" ? "Adauga" : "Salveaza"}
            </Btn>
          </div>
        </Modal>
      )}

      {/* MODAL VIEW */}
      {modal === "view" && selected && (
        <Modal title={selected.denumire_firma} size="lg" onClose={() => setModal(null)}>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Badge text={getStadiuConfig(selected.stadiu).label} color={getStadiuConfig(selected.stadiu).color} />
            {selected.convertit_in_client && <Badge text="Convertit in client" color="green" />}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-primary-500 uppercase tracking-widest mb-2">Firma</h4>
              <VRow label="CUI" value={selected.cui} />
              <VRow label="Judet" value={selected.judet} />
              <VRow label="Localitate" value={selected.localitate} />
              <VRow label="Contact" value={selected.persoana_contact} />
              <VRow label="Telefon" value={selected.telefon} />
              <VRow label="Email" value={selected.email} />
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-primary-500 uppercase tracking-widest mb-2">Oferta & Pipeline</h4>
              <VRow label="Servicii" value={selected.servicii_interes} />
              <VRow label="Tarif propus" value={selected.tarif_propus ? `${selected.tarif_propus} ${selected.moneda}` : null} />
              <VRow label="Canal" value={selected.canal_provenienta} />
              <VRow label="Recomandat de" value={selected.recomandat_de} />
              <VRow label="Responsabil" value={selected.responsabil} />
              <VRow label="Data intrare" value={selected.data_intrare?.split("-").reverse().join(".")} />
              <VRow label="Ultima interactiune" value={selected.data_ultima_interactiune?.split("-").reverse().join(".")} />
            </div>
          </div>

          {(selected.urmator_pas || selected.data_urmatorului_pas) && (
            <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 mb-4">
              <h4 className="text-xs font-bold text-warning-600 uppercase tracking-widest mb-2">Urmator pas</h4>
              <p className="text-sm text-warning-700">{selected.urmator_pas}</p>
              {selected.data_urmatorului_pas && (
                <p className={`text-xs mt-1 font-semibold ${
                  selected.data_urmatorului_pas <= azi ? "text-danger-400" : "text-warning-500"
                }`}>
                  Data: {selected.data_urmatorului_pas.split("-").reverse().join(".")}
                  {selected.data_urmatorului_pas <= azi ? " — SCADENT" : ""}
                </p>
              )}
            </div>
          )}

          {selected.observatii && (
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Observatii</h4>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.observatii}</p>
            </div>
          )}

          {/* Schimba stadiu rapid */}
          <div className="bg-slate-50 rounded-xl p-4 mb-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Schimba stadiu</h4>
            <div className="flex flex-wrap gap-2">
              {STADII.map(s => (
                <button key={s.id}
                  onClick={() => handleSchimbaStadiu(selected, s.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all border ${
                    selected.stadiu === s.id
                      ? "bg-primary-500 text-white border-primary-500"
                      : "bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-600"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <Btn variant="danger" size="sm" onClick={() => handleDelete(selected.id)}>Sterge</Btn>
            <div className="flex gap-2">
              {!selected.convertit_in_client && selected.stadiu !== "pierdut" && (
                <Btn variant="success" onClick={() => setModalConvertire(selected)}>
                  Converteste in client
                </Btn>
              )}
              <Btn onClick={() => openEdit(selected)}>Editeaza</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL CONVERTIRE */}
      {modalConvertire && (
        <Modal title="Converteste in client" size="sm" onClose={() => setModalConvertire(null)}>
          <div className="bg-success-50 border border-success-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-bold text-success-500 mb-1">{modalConvertire.denumire_firma}</p>
            <p className="text-xs text-success-400">
              Se va crea un client nou in modulul Clienti Activi cu datele din acest lead.
              Puteti completa restul informatiilor din fisa clientului ulterior.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setModalConvertire(null)}>Anuleaza</Btn>
            <Btn variant="success" onClick={handleConvertire}>Confirma convertire</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function VRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="text-xs text-slate-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-700">{value}</span>
    </div>
  );
}
