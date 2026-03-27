import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Badge, statusContractColor, Modal, FormSection, FormField,
  Input, Select, Btn, PageHeader, EmptyState, Loading, Card
} from "../components/UI";

const TIP_CONTRACT = [
  "Contabilitate",
  "Bilant",
  "Doar bilant",
  "Resurse umane (HR)",
  "Consultanta",
  "Salarizare",
  "Contabilitate + Bilant",
  "Contabilitate + HR",
  "Contabilitate + Bilant + HR",
  "Altul",
];

const STATUS_CONTRACT = ["Draft", "Trimis spre semnare", "Activ", "Suspendat", "Reziliat", "Expirat"];
const PERIODICITATE = ["Lunar", "Trimestrial", "Semestrial", "Anual"];

const EMPTY_FORM = {
  client_id: "",
  client_denumire: "",
  client_cui: "",
  firma_contabilitate_id: "",
  firma_contabilitate_denumire: "",
  tip_contract: "Contabilitate",
  numar_contract: "",
  data_contract: "",
  data_start: "",
  data_sfarsit: "",
  tarif: "",
  moneda: "RON",
  periodicitate_facturare: "Lunar",
  termen_plata: "15",
  servicii_incluse: "",
  status_contract: "Draft",
  prima_luna_lucrata: "",
  prima_luna_contabil: "",
  ultima_luna_lucrata: "",
  are_bilant: false,
  tarif_bilant: "",
  moneda_bilant: "RON",
  observatii: "",
};

export default function ContracteEmise() {
  const [contracte, setContracte] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [firme, setFirme] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtruStatus, setFiltruStatus] = useState("Toate");
  const [filtruFirma, setFiltruFirma] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const reload = async () => {
    setLoading(true);
    try {
      const [ctrSnap, cliSnap, fSnap] = await Promise.all([
        getDocs(collection(db, "contracte")),
        getDocs(collection(db, "clienti")),
        getDocs(collection(db, "firme_contabilitate")),
      ]);
      setContracte(ctrSnap.docs.map(d => ({ ...d.data(), id: d.id }))
        .sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)));
      setClienti(cliSnap.docs.map(d => ({ ...d.data(), id: d.id }))
        .sort((a, b) => a.denumire?.localeCompare(b.denumire)));
      setFirme(fSnap.docs.map(d => ({ ...d.data(), id: d.id })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const filtered = contracte.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.client_denumire?.toLowerCase().includes(q) ||
      c.numar_contract?.toLowerCase().includes(q) ||
      c.client_cui?.includes(q);
    const matchStatus = filtruStatus === "Toate" || c.status_contract === filtruStatus;
    const matchFirma = !filtruFirma || c.firma_contabilitate_id === filtruFirma;
    return matchSearch && matchStatus && matchFirma;
  });

  const openAdd = () => { setForm(EMPTY_FORM); setModal("add"); };
  const openEdit = (c) => { setForm({ ...EMPTY_FORM, ...c }); setSelected(c); setModal("edit"); };
  const openView = (c) => { setSelected(c); setActiveTab("info"); setModal("view"); };

  const handleClientChange = (clientId) => {
    const client = clienti.find(c => c.id === clientId);
    if (client) {
      setForm(p => ({
        ...p,
        client_id: clientId,
        client_denumire: client.denumire || "",
        client_cui: client.cui || "",
        firma_contabilitate_id: client.firma_contabilitate_id || "",
        firma_contabilitate_denumire: client.firma_contabilitate_denumire || "",
      }));
    }
  };

  const handleSave = async () => {
    if (!form.client_id || !form.numar_contract) return alert("Clientul și numărul de contract sunt obligatorii!");
    setSaving(true);
    try {
      const data = { ...form, updated_at: serverTimestamp() };
      if (modal === "add") {
        data.created_at = serverTimestamp();
        data.acte_aditionale = [];
        await addDoc(collection(db, "contracte"), data);
      } else {
        await updateDoc(doc(db, "contracte", form.id), data);
      }
      await reload();
      setModal(null);
    } catch (e) { alert("Eroare: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sigur vrei să ștergi acest contract?")) return;
    try {
      await deleteDoc(doc(db, "contracte", id));
      await reload();
      if (modal === "view") setModal(null);
    } catch (e) { alert("Eroare: " + e.message); }
  };

  const f = (field) => form[field] ?? "";
  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target?.value ?? e }));

  // Contracte care expiră în 30 zile
  const azi = new Date();
  const in30 = new Date(); in30.setDate(azi.getDate() + 30);
  const expiraInCurand = contracte.filter(c => {
    if (!c.data_sfarsit || c.status_contract === "Reziliat" || c.status_contract === "Expirat") return false;
    const d = new Date(c.data_sfarsit);
    return d >= azi && d <= in30;
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Contracte Emise"
        subtitle={`${contracte.length} contracte totale`}
        action={<Btn onClick={openAdd}>+ Adaugă Contract</Btn>}
      />

      {/* Alerta contracte ce expira */}
      {expiraInCurand.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-amber-800 mb-2">
            {expiraInCurand.length} contract{expiraInCurand.length > 1 ? "e" : ""} expiră în următoarele 30 de zile
          </p>
          <div className="flex flex-wrap gap-2">
            {expiraInCurand.map(c => (
              <span
                key={c.id}
                className="text-xs bg-white border border-amber-200 rounded-lg px-2 py-1 text-amber-700 cursor-pointer hover:bg-amber-100"
                onClick={() => openView(c)}
              >
                {c.client_denumire} — {c.data_sfarsit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filtre */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Caută după client, nr. contract, CUI..."
          className="flex-1 min-w-64 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
        <select
          value={filtruFirma}
          onChange={e => setFiltruFirma(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Toate firmele</option>
          {firme.map(f => (
            <option key={f.id} value={f.id}>{f.denumire_scurta || f.denumire}</option>
          ))}
        </select>
        <div className="flex gap-1 flex-wrap">
          {["Toate", ...STATUS_CONTRACT].map(s => (
            <button
              key={s}
              onClick={() => setFiltruStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filtruStatus === s ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? <Loading /> : filtered.length === 0 ? (
        <EmptyState
          title="Nu există contracte"
          subtitle="Adaugă primul contract emis"
          action={<Btn onClick={openAdd}>+ Adaugă Contract</Btn>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(contract => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between p-4">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openView(contract)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">{contract.client_denumire}</h3>
                    <Badge text={contract.tip_contract} color="blue" />
                    <Badge text={contract.status_contract} color={statusContractColor(contract.status_contract)} />
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                    {contract.numar_contract && <span>Nr: <strong>{contract.numar_contract}</strong></span>}
                    {contract.data_contract && <span>Data: {contract.data_contract}</span>}
                    {contract.tarif && <span>Tarif: <strong>{contract.tarif} {contract.moneda}</strong></span>}
                    {contract.periodicitate_facturare && <span>{contract.periodicitate_facturare}</span>}
                    {contract.firma_contabilitate_denumire && <span>Firma: {contract.firma_contabilitate_denumire}</span>}
                  </div>
                  {contract.data_sfarsit && (
                    <div className="mt-1">
                      <span className="text-xs text-gray-400">
                        {contract.data_start} — {contract.data_sfarsit}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1 ml-4 flex-shrink-0">
                  <Btn variant="ghost" size="sm" onClick={() => openEdit(contract)}>Editează</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => handleDelete(contract.id)}>Șterge</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL: ADD / EDIT */}
      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Adaugă Contract" : `Editează: ${selected?.numar_contract || "contract"}`}
          size="xl"
          onClose={() => setModal(null)}
        >
          <FormSection title="Client">
            <FormField label="Client" required full>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={f("client_id")}
                onChange={e => handleClientChange(e.target.value)}
              >
                <option value="">Selectează clientul</option>
                {clienti.map(c => (
                  <option key={c.id} value={c.id}>{c.denumire} — {c.cui}</option>
                ))}
              </select>
            </FormField>
            {form.firma_contabilitate_denumire && (
              <FormField label="Firma contabilitate" full>
                <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-700">
                  {form.firma_contabilitate_denumire}
                </div>
              </FormField>
            )}
          </FormSection>

          <FormSection title="Date contract">
            <FormField label="Tip contract" required>
              <Select value={f("tip_contract")} onChange={set("tip_contract")} options={TIP_CONTRACT.map(t => ({ value: t, label: t }))} />
            </FormField>
            <FormField label="Status contract">
              <Select value={f("status_contract")} onChange={set("status_contract")} options={STATUS_CONTRACT.map(s => ({ value: s, label: s }))} />
            </FormField>
            <FormField label="Numar contract" required>
              <Input value={f("numar_contract")} onChange={set("numar_contract")} placeholder="Ex: CTR-001/2024" />
            </FormField>
            <FormField label="Data contract">
              <Input type="date" value={f("data_contract")} onChange={set("data_contract")} />
            </FormField>
            <FormField label="Data start">
              <Input type="date" value={f("data_start")} onChange={set("data_start")} />
            </FormField>
            <FormField label="Data sfarsit / expirare">
              <Input type="date" value={f("data_sfarsit")} onChange={set("data_sfarsit")} />
            </FormField>
          </FormSection>

          <FormSection title="Tarifare si facturare">
            <FormField label="Tarif">
              <Input type="number" value={f("tarif")} onChange={set("tarif")} placeholder="0" />
            </FormField>
            <FormField label="Moneda">
              <Select value={f("moneda")} onChange={set("moneda")} options={[{ value: "RON", label: "RON" }, { value: "EUR", label: "EUR" }]} />
            </FormField>
            <FormField label="Periodicitate facturare">
              <Select value={f("periodicitate_facturare")} onChange={set("periodicitate_facturare")} options={PERIODICITATE.map(p => ({ value: p, label: p }))} />
            </FormField>
            <FormField label="Termen plata (zile)">
              <Input type="number" value={f("termen_plata")} onChange={set("termen_plata")} placeholder="15" />
            </FormField>
          </FormSection>

          <FormSection title="Date contabile">
            <FormField label="Prima lună lucrată (general)">
              <Input value={f("prima_luna_lucrata")} onChange={set("prima_luna_lucrata")} placeholder="Ex: Ianuarie 2025" />
            </FormField>
            <FormField label="Prima lună lucrată (din punct de vedere contabil)">
              <Input value={f("prima_luna_contabil")} onChange={set("prima_luna_contabil")} placeholder="Ex: Februarie 2025 (poate diferi)" />
            </FormField>
            <FormField label="Ultima lună lucrată">
              <Input value={f("ultima_luna_lucrata")} onChange={set("ultima_luna_lucrata")} placeholder="Ex: Decembrie 2024" />
            </FormField>
            <FormField label="Servicii incluse" full>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                rows={2}
                value={f("servicii_incluse")}
                onChange={set("servicii_incluse")}
                placeholder="Descriere servicii incluse în contract..."
              />
            </FormField>
            <FormField label="Observatii" full>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                rows={2}
                value={f("observatii")}
                onChange={set("observatii")}
              />
            </FormField>
          </FormSection>

          {(form.tip_contract === "Bilant" || form.tip_contract === "Doar bilant" || form.tip_contract?.includes("Bilant") || form.are_bilant) && (
            <FormSection title="Tarifare bilanț anual (opțional)">
              <FormField label="Tarif bilanț (RON/an)">
                <Input type="number" value={f("tarif_bilant")} onChange={set("tarif_bilant")} placeholder="0" />
              </FormField>
              <FormField label="Monedă bilanț">
                <Select value={f("moneda_bilant")} onChange={set("moneda_bilant")} options={[{value:"RON",label:"RON"},{value:"EUR",label:"EUR"}]} />
              </FormField>
            </FormSection>
          )}

          {!form.tip_contract?.includes("Bilant") && form.tip_contract !== "Bilant" && form.tip_contract !== "Doar bilant" && (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.are_bilant} onChange={e => setForm(p => ({...p, are_bilant: e.target.checked}))} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium text-gray-700">Adaugă și tarif de bilanț anual la acest contract</span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-4">
            <Btn variant="secondary" onClick={() => setModal(null)}>Anulează</Btn>
            <Btn onClick={handleSave} disabled={saving}>
              {saving ? "Se salvează..." : modal === "add" ? "Adaugă" : "Salvează"}
            </Btn>
          </div>
        </Modal>
      )}

      {/* MODAL: VIEW */}
      {modal === "view" && selected && (
        <Modal title={`Contract: ${selected.numar_contract || selected.client_denumire}`} size="xl" onClose={() => setModal(null)}>
          <div className="flex gap-1 mb-5 border-b border-gray-200 -mt-1">
            {[
              { id: "info", label: "Informatii" },
              { id: "acte", label: `Acte Aditionale (${selected.acte_aditionale?.length || 0})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "info" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">Date contract</h4>
                <VInfoRow label="Client" value={selected.client_denumire} bold />
                <VInfoRow label="CUI" value={selected.client_cui} />
                <VInfoRow label="Firma contab." value={selected.firma_contabilitate_denumire} />
                <VInfoRow label="Tip contract" value={<Badge text={selected.tip_contract} color="blue" />} />
                <VInfoRow label="Numar" value={selected.numar_contract} />
                <VInfoRow label="Data contract" value={selected.data_contract} />
                <VInfoRow label="Status" value={<Badge text={selected.status_contract} color={statusContractColor(selected.status_contract)} />} />
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">Valabilitate si tarifare</h4>
                <VInfoRow label="Data start" value={selected.data_start} />
                <VInfoRow label="Data sfarsit" value={selected.data_sfarsit} />
                <VInfoRow label="Tarif" value={selected.tarif ? `${selected.tarif} ${selected.moneda}` : null} />
                <VInfoRow label="Periodicitate" value={selected.periodicitate_facturare} />
                <VInfoRow label="Termen plata" value={selected.termen_plata ? `${selected.termen_plata} zile` : null} />
                <VInfoRow label="Prima lună lucrată" value={selected.prima_luna_lucrata} />
                <VInfoRow label="Prima lună (contabil)" value={selected.prima_luna_contabil} />
                <VInfoRow label="Ultima lună lucrată" value={selected.ultima_luna_lucrata} />
                {selected.tarif_bilant && <VInfoRow label="Tarif bilanț" value={`${selected.tarif_bilant} ${selected.moneda_bilant || "RON"}/an`} />}
              </div>
              {(selected.servicii_incluse || selected.observatii) && (
                <div className="col-span-2 bg-gray-50 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">Servicii si observatii</h4>
                  {selected.servicii_incluse && <VInfoRow label="Servicii" value={selected.servicii_incluse} />}
                  {selected.observatii && <VInfoRow label="Observatii" value={selected.observatii} />}
                </div>
              )}
            </div>
          )}

          {activeTab === "acte" && (
            <div>
              <p className="text-sm text-gray-500 text-center py-8">
                Modulul de acte adiționale va fi disponibil în Etapa 3.
              </p>
            </div>
          )}

          <div className="flex justify-between mt-5 pt-4 border-t border-gray-100">
            <Btn variant="danger" size="sm" onClick={() => handleDelete(selected.id)}>Șterge</Btn>
            <Btn onClick={() => openEdit(selected)}>Editează</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function VInfoRow({ label, value, bold }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-400 w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-800 ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
