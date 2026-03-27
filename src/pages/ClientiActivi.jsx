import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import {
  Badge, statusClientColor, Modal, FormSection, FormField,
  Input, Select, Textarea, Btn, PageHeader, EmptyState, Loading, Card,
  JUDETE, BANCI
} from "../components/UI";

// ============================================================
// CONSTANTE
// ============================================================
const TIP_ENTITATE = [
  "SRL","SA","SNC","SCS","RA","PFA","II","IF",
  "ONG","Asociație","Fundație","Sindicat","Altul"
];
const STATUS_CLIENT = ["Activ", "Suspendat", "Reziliat", "Prospect"];
const CANAL_PROVENIENTA = [
  "Recomandare","Facebook","Google","Website","Telefon","Partener","Altă sursă"
];
const VECTORI_FISCALI = ["Lunar","Trimestrial","Semestrial","Anual","Nu are"];

const CAT_DOCUMENTE_CLIENT = [
  "Certificat înregistrare",
  "Act constitutiv",
  "CI administrator",
  "CI asociat",
  "Dovadă sediu",
  "Certificat TVA",
  "Documente punct de lucru",
  "Procură",
  "Contract contabilitate",
  "Contract HR",
  "Contract bilanț",
  "AA Majorare tarif",
  "AA Micșorare tarif",
  "AA Bilanț",
  "AA Reziliere contabilitate",
  "AA Reziliere HR",
  "AA Reziliere unilaterală",
  "Notificare neplată",
  "Alte documente",
];
  "Contract HR",
  "Contract bilanț",
  "AA Majorare tarif",
  "AA Micșorare tarif",
  "AA Bilanț",
  "AA Reziliere contabilitate",
  "AA Reziliere HR",
  "AA Reziliere unilaterală",
  "Notificare neplată",
  "Alte documente",
];

const EMPTY_FORM = {
  tip_entitate: "SRL", denumire: "", denumire_comerciala: "", cui: "",
  nr_reg_com: "", euid: "", status_client: "Activ",
  firma_contabilitate_id: "", firma_contabilitate_denumire: "",
  contabil_responsabil: "", manager_responsabil: "",
  data_inceput_colaborare: "", data_sfarsit_colaborare: "",
  este_client_nou: false, canal_provenienta: "", sursa_detaliata: "", recomandat_de: "",
  observatii_generale: "",
  platitor_tva: false, cod_tva: "", vector_fiscal: "Lunar",
  cui_intracomunitar: false, nr_cui_intracomunitar: "",
  punct_lucru: false, nr_puncte_lucru: "",
  firma_suspendata: false, data_suspendare: "", data_reactivare: "",
  salariati: false, nr_salariati: "",
  token: "", procura: false, semnatura_digitala: false, casa_marcat: false,
  activitate_principala: "", cod_caen_principal: "", coduri_caen_secundare: "",
  cont_bancar_principal: "", banca_principala: "",
  judet: "", localitate: "", strada: "", numar: "", bloc: "", scara: "",
  apartament: "", cod_postal: "",
  administrator_nume: "", administrator_cnp: "", administrator_ci_serie: "",
  administrator_nume: "", administrator_cnp: "", administrator_ci_serie: "",
  administrator_ci_numar: "", administrator_ci_expirare: "",
  administrator_telefon: "", administrator_email: "",
  asociat1_nume: "", asociat1_cnp: "", asociat1_ci_serie: "",
  asociat1_ci_numar: "", asociat1_ci_expirare: "",
  asociat1_telefon: "", asociat1_email: "",
  asociat2_nume: "", asociat2_cnp: "", asociat2_ci_serie: "",
  asociat2_ci_numar: "", asociat2_ci_expirare: "",
  asociat2_telefon: "", asociat2_email: "",
  persoana_contact_nume: "", persoana_contact_functie: "",
  persoana_contact_telefon: "", persoana_contact_email: "",
  telefon_secundar: "", email_secundar: "",
  serviciu_contabilitate: false, serviciu_hr: false, serviciu_bilant: false,
  serviciu_consultanta: false, serviciu_revisal: false, serviciu_salarizare: false,
  alte_servicii: "",
  tarif_contabilitate: "", tarif_hr: "", tarif_bilant: "", tarif_total: "",
  moneda: "RON", data_ultima_modificare_tarif: "",
};

// ============================================================
// COMPONENTA PRINCIPALA
// ============================================================
export default function ClientiActivi() {
  const [clienti, setClienti] = useState([]);
  const [firme, setFirme] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtruStatus, setFiltruStatus] = useState("Activ");
  const [filtruFirma, setFiltruFirma] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedClient, setSelectedClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [docModal, setDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ categorie: "", denumire: "", observatii: "" });

  const reload = async () => {
    setLoading(true);
    try {
      const [cSnap, fSnap] = await Promise.all([
        getDocs(collection(db, "clienti")),
        getDocs(collection(db, "firme_contabilitate")),
      ]);
      setClienti(cSnap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => a.denumire?.localeCompare(b.denumire)));
      setFirme(fSnap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => a.denumire?.localeCompare(b.denumire)));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const filtered = clienti.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.denumire?.toLowerCase().includes(q) ||
      c.cui?.includes(q) || c.persoana_contact_nume?.toLowerCase().includes(q) ||
      c.contabil_responsabil?.toLowerCase().includes(q);
    const matchStatus = filtruStatus === "Toate" || c.status_client === filtruStatus;
    const matchFirma = !filtruFirma || c.firma_contabilitate_id === filtruFirma;
    return matchSearch && matchStatus && matchFirma;
  });

  const openAdd = () => { setForm(EMPTY_FORM); setModal("add"); };
  const openEdit = (client) => { setForm({ ...EMPTY_FORM, ...client }); setSelectedClient(client); setModal("edit"); };
  const openView = (client) => { setSelectedClient(client); setActiveTab("info"); setModal("view"); };

  const getBool = (field) => !!form[field];

  const handleSave = async () => {
    if (!form.denumire || !form.cui) return alert("Denumirea și CUI-ul sunt obligatorii!");
    setSaving(true);
    try {
      const firmaSelectata = firme.find(f => f.id === form.firma_contabilitate_id);
      const data = {
        ...form,
        firma_contabilitate_denumire: firmaSelectata?.denumire_scurta || firmaSelectata?.denumire || "",
        updated_at: serverTimestamp(),
      };
      if (modal === "add") {
        data.created_at = serverTimestamp();
        data.documente = [];
        data.istoric = [];
        await addDoc(collection(db, "clienti"), data);
      } else {
        const istoricEntry = {
          data: new Date().toISOString(),
          descriere: `Client actualizat`,
          utilizator: "Admin",
        };
        data.istoric = [...(form.istoric || []), istoricEntry];
        await updateDoc(doc(db, "clienti", form.id), data);
      }
      await reload();
      setModal(null);
    } catch (e) { alert("Eroare la salvare: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id, denumire) => {
    if (!window.confirm(`Sigur vrei să ștergi clientul "${denumire}"?`)) return;
    try {
      await deleteDoc(doc(db, "clienti", id));
      await reload();
      if (modal === "view") setModal(null);
    } catch (e) { alert("Eroare: " + e.message); }
  };

  const handleAddDoc = async () => {
    if (!docForm.categorie) return alert("Selectează categoria documentului!");
    if (!docForm.denumire) return alert("Completează denumirea documentului!");
    if (!selectedClient?.id) return alert("Eroare: niciun client selectat.");
    try {
      const docNou = {
        ...docForm,
        id: Date.now().toString(),
        data_adaugare: new Date().toISOString().split("T")[0],
      };
      const documente = [...(selectedClient.documente || []), docNou];
      await updateDoc(doc(db, "clienti", selectedClient.id), { documente });
      const clientActualizat = { ...selectedClient, documente };
      setSelectedClient(clientActualizat);
      setClienti(prev => prev.map(c => c.id === selectedClient.id ? clientActualizat : c));
      setDocForm({ categorie: "", denumire: "", observatii: "" });
      setDocModal(false);
    } catch (e) {
      alert("Eroare la salvare document: " + e.message);
      console.error(e);
    }
  };

  const f = (field) => form[field] ?? "";
  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target?.value ?? e }));
  const setCheck = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.checked }));

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="p-6">
      <PageHeader
        title="Clienți Activi"
        subtitle={`${clienti.filter(c => c.status_client === "Activ").length} activi din ${clienti.length} total`}
        action={<Btn onClick={openAdd}>+ Adaugă Client</Btn>}
      />

      {/* Filtre */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Caută după denumire, CUI, contact..."
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
        <div className="flex gap-1">
          {["Toate", ...STATUS_CLIENT].map(s => (
            <button
              key={s}
              onClick={() => setFiltruStatus(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
        <EmptyState title="Nu există clienți" subtitle="Adaugă primul client" action={<Btn onClick={openAdd}>+ Adaugă Client</Btn>} />
      ) : (
        <div className="space-y-2">
          {filtered.map(client => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 truncate">{client.denumire}</h3>
                      <Badge text={client.tip_entitate || "SRL"} color="blue" />
                      <Badge text={client.status_client || "Activ"} color={statusClientColor(client.status_client)} />
                      {client.platitor_tva && <Badge text="TVA" color="indigo" />}
                      {client.firma_suspendata && <Badge text="Susp. ONRC" color="yellow" />}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                      <span>CUI: <strong>{client.cui}</strong></span>
                      {client.firma_contabilitate_denumire && <span>{client.firma_contabilitate_denumire}</span>}
                      {client.contabil_responsabil && <span>{client.contabil_responsabil}</span>}
                      {client.persoana_contact_telefon && <span>{client.persoana_contact_telefon}</span>}
                      {client.tarif_total && <span>{client.tarif_total} {client.moneda}/lună</span>}
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {client.vector_fiscal && client.vector_fiscal !== "Nu are" && <Badge text={`Vector: ${client.vector_fiscal}`} color="gray" />}
                      {client.punct_lucru && <Badge text="Punct lucru" color="gray" />}
                      {client.cui_intracomunitar && <Badge text="CUI Intra." color="gray" />}
                      {client.procura && <Badge text="Procură" color="gray" />}
                      {client.token && <Badge text={`Token: ${client.token}`} color="purple" />}
                      {client.serviciu_hr && <Badge text="HR" color="orange" />}
                      {client.serviciu_bilant && <Badge text="Bilanț" color="green" />}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 ml-4 flex-shrink-0">
                  <Btn variant="ghost" size="sm" onClick={() => openView(client)}>Vezi</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => openEdit(client)}>Editează</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => handleDelete(client.id, client.denumire)}>Șterge</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ============================================================
          MODAL: ADD / EDIT
          ============================================================ */}
      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Adaugă Client Nou" : `Editează: ${selectedClient?.denumire}`}
          size="xl"
          onClose={() => setModal(null)}
        >
          <FormSection title="Date de identificare">
            <FormField label="Tip entitate" required>
              <Select value={f("tip_entitate")} onChange={set("tip_entitate")} options={TIP_ENTITATE.map(t => ({ value: t, label: t }))} />
            </FormField>
            <FormField label="Status client">
              <Select value={f("status_client")} onChange={set("status_client")} options={STATUS_CLIENT.map(s => ({ value: s, label: s }))} />
            </FormField>
            <FormField label="Denumire completă" required full>
              <Input value={f("denumire")} onChange={set("denumire")} placeholder="Ex: SC Beta SRL" />
            </FormField>
            <FormField label="Denumire comercială">
              <Input value={f("denumire_comerciala")} onChange={set("denumire_comerciala")} placeholder="Denumire comercială dacă diferă" />
            </FormField>
            <FormField label="CUI" required>
              <Input value={f("cui")} onChange={set("cui")} placeholder="Ex: RO12345678" />
            </FormField>
            <FormField label="Nr. Reg. Comerțului">
              <Input value={f("nr_reg_com")} onChange={set("nr_reg_com")} placeholder="Ex: J05/123/2020" />
            </FormField>
            <FormField label="EUID">
              <Input value={f("euid")} onChange={set("euid")} />
            </FormField>
            <FormField label="Dată început colaborare">
              <Input type="date" value={f("data_inceput_colaborare")} onChange={set("data_inceput_colaborare")} />
            </FormField>
          </FormSection>

          <FormSection title="Firmă de contabilitate responsabilă">
            <FormField label="Firma de contabilitate" required>
              <Select
                value={f("firma_contabilitate_id")}
                onChange={set("firma_contabilitate_id")}
                placeholder="Selectează firma"
                options={firme.map(f => ({ value: f.id, label: f.denumire_scurta || f.denumire }))}
              />
            </FormField>
            <FormField label="Contabil responsabil">
              <Input value={f("contabil_responsabil")} onChange={set("contabil_responsabil")} placeholder="Numele contabilului" />
            </FormField>
            <FormField label="Manager responsabil">
              <Input value={f("manager_responsabil")} onChange={set("manager_responsabil")} />
            </FormField>
          </FormSection>

          <FormSection title="Proveniență client">
            <FormField label="" full>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={getBool("este_client_nou")} onChange={setCheck("este_client_nou")} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium text-gray-700">Client nou (completează sursa)</span>
              </label>
            </FormField>
            {form.este_client_nou && (
              <>
                <FormField label="Canal proveniență">
                  <Select value={f("canal_provenienta")} onChange={set("canal_provenienta")} placeholder="Selectează canalul" options={CANAL_PROVENIENTA.map(c => ({ value: c, label: c }))} />
                </FormField>
                <FormField label="Sursă detaliată">
                  <Input value={f("sursa_detaliata")} onChange={set("sursa_detaliata")} placeholder="Ex: Pagina Facebook Septembrie" />
                </FormField>
                <FormField label="Recomandat de" full>
                  <Input value={f("recomandat_de")} onChange={set("recomandat_de")} placeholder="Dacă a venit prin recomandare, cine l-a recomandat" />
                </FormField>
              </>
            )}
          </FormSection>

          <FormSection title="Date fiscale & administrative">
            <FormField label="Opțiuni fiscale" full>
              <div className="flex flex-wrap gap-4">
                {[
                  { field: "platitor_tva", label: "Plătitor TVA" },
                  { field: "firma_suspendata", label: "Firmă suspendată ONRC" },
                  { field: "punct_lucru", label: "Punct de lucru" },
                  { field: "cui_intracomunitar", label: "CUI intracomunitar" },
                  { field: "procura", label: "Are procură" },
                  { field: "semnatura_digitala", label: "Semnătură digitală" },
                  { field: "salariati", label: "Are salariați" },
                  { field: "casa_marcat", label: "Casă de marcat" },
                ].map(({ field, label }) => (
                  <label key={field} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={getBool(field)} onChange={setCheck(field)} className="w-4 h-4 rounded" />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </FormField>
            {form.platitor_tva && (
              <FormField label="Cod TVA">
                <Input value={f("cod_tva")} onChange={set("cod_tva")} placeholder="RO12345678" />
              </FormField>
            )}
            <FormField label="Vector fiscal">
              <Select value={f("vector_fiscal")} onChange={set("vector_fiscal")} options={VECTORI_FISCALI.map(v => ({ value: v, label: v }))} />
            </FormField>
            {form.salariati && (
              <FormField label="Nr. salariați">
                <Input type="number" value={f("nr_salariati")} onChange={set("nr_salariati")} />
              </FormField>
            )}
            {form.punct_lucru && (
              <FormField label="Nr. puncte de lucru">
                <Input type="number" value={f("nr_puncte_lucru")} onChange={set("nr_puncte_lucru")} />
              </FormField>
            )}
            {form.cui_intracomunitar && (
              <FormField label="Nr. CUI intracomunitar">
                <Input value={f("nr_cui_intracomunitar")} onChange={set("nr_cui_intracomunitar")} />
              </FormField>
            )}
            {form.firma_suspendata && (
              <>
                <FormField label="Dată suspendare ONRC">
                  <Input type="date" value={f("data_suspendare")} onChange={set("data_suspendare")} />
                </FormField>
                <FormField label="Dată reactivare estimată">
                  <Input type="date" value={f("data_reactivare")} onChange={set("data_reactivare")} />
                </FormField>
              </>
            )}
            <FormField label="Token (pe cine este)">
              <Input value={f("token")} onChange={set("token")} placeholder="Numele persoanei care deține tokenul" />
            </FormField>
            <FormField label="Activitate principală">
              <Input value={f("activitate_principala")} onChange={set("activitate_principala")} placeholder="Ex: Comerț cu amănuntul" />
            </FormField>
            <FormField label="Cod CAEN principal">
              <Input value={f("cod_caen_principal")} onChange={set("cod_caen_principal")} placeholder="Ex: 4711" />
            </FormField>
            <FormField label="Coduri CAEN secundare">
              <Input value={f("coduri_caen_secundare")} onChange={set("coduri_caen_secundare")} placeholder="Ex: 4712, 4719" />
            </FormField>
            <FormField label="Cont bancar principal">
              <Input value={f("cont_bancar_principal")} onChange={set("cont_bancar_principal")} placeholder="IBAN" />
            </FormField>
            <FormField label="Banca principală">
              <Select value={f("banca_principala")} onChange={set("banca_principala")} placeholder="Selectează banca" options={BANCI.map(b => ({ value: b, label: b }))} />
            </FormField>
          </FormSection>

          <FormSection title="Adresă sediu social">
            <FormField label="Județ">
              <Select value={f("judet")} onChange={set("judet")} placeholder="Selectează județul" options={JUDETE.map(j => ({ value: j, label: j }))} />
            </FormField>
            <FormField label="Localitate">
              <Input value={f("localitate")} onChange={set("localitate")} />
            </FormField>
            <FormField label="Strada">
              <Input value={f("strada")} onChange={set("strada")} />
            </FormField>
            <FormField label="Număr">
              <Input value={f("numar")} onChange={set("numar")} />
            </FormField>
            <FormField label="Bloc">
              <Input value={f("bloc")} onChange={set("bloc")} />
            </FormField>
            <FormField label="Scară">
              <Input value={f("scara")} onChange={set("scara")} />
            </FormField>
            <FormField label="Apartament">
              <Input value={f("apartament")} onChange={set("apartament")} />
            </FormField>
            <FormField label="Cod poștal">
              <Input value={f("cod_postal")} onChange={set("cod_postal")} />
            </FormField>
          </FormSection>

          <FormSection title="Administrator / Reprezentant legal">
            <FormField label="Nume complet">
              <Input value={f("administrator_nume")} onChange={set("administrator_nume")} />
            </FormField>
            <FormField label="CNP">
              <Input value={f("administrator_cnp")} onChange={set("administrator_cnp")} />
            </FormField>
            <FormField label="CI Serie">
              <Input value={f("administrator_ci_serie")} onChange={set("administrator_ci_serie")} placeholder="Ex: XY" />
            </FormField>
            <FormField label="CI Număr">
              <Input value={f("administrator_ci_numar")} onChange={set("administrator_ci_numar")} />
            </FormField>
            <FormField label="CI Dată expirare">
              <Input type="date" value={f("administrator_ci_expirare")} onChange={set("administrator_ci_expirare")} />
            </FormField>
            <FormField label="Telefon">
              <Input value={f("administrator_telefon")} onChange={set("administrator_telefon")} />
            </FormField>
            <FormField label="Email">
              <Input type="email" value={f("administrator_email")} onChange={set("administrator_email")} />
            </FormField>
          </FormSection>

          <FormSection title="Asociat 1 (opțional)">
            <FormField label="Nume complet">
              <Input value={f("asociat1_nume")} onChange={set("asociat1_nume")} placeholder="Lăsați gol dacă nu există" />
            </FormField>
            <FormField label="CNP">
              <Input value={f("asociat1_cnp")} onChange={set("asociat1_cnp")} />
            </FormField>
            <FormField label="CI Serie">
              <Input value={f("asociat1_ci_serie")} onChange={set("asociat1_ci_serie")} />
            </FormField>
            <FormField label="CI Număr">
              <Input value={f("asociat1_ci_numar")} onChange={set("asociat1_ci_numar")} />
            </FormField>
            <FormField label="CI Dată expirare">
              <Input type="date" value={f("asociat1_ci_expirare")} onChange={set("asociat1_ci_expirare")} />
            </FormField>
            <FormField label="Telefon">
              <Input value={f("asociat1_telefon")} onChange={set("asociat1_telefon")} />
            </FormField>
            <FormField label="Email">
              <Input type="email" value={f("asociat1_email")} onChange={set("asociat1_email")} />
            </FormField>
          </FormSection>

          <FormSection title="Asociat 2 (opțional)">
            <FormField label="Nume complet">
              <Input value={f("asociat2_nume")} onChange={set("asociat2_nume")} placeholder="Lăsați gol dacă nu există" />
            </FormField>
            <FormField label="CNP">
              <Input value={f("asociat2_cnp")} onChange={set("asociat2_cnp")} />
            </FormField>
            <FormField label="CI Serie">
              <Input value={f("asociat2_ci_serie")} onChange={set("asociat2_ci_serie")} />
            </FormField>
            <FormField label="CI Număr">
              <Input value={f("asociat2_ci_numar")} onChange={set("asociat2_ci_numar")} />
            </FormField>
            <FormField label="CI Dată expirare">
              <Input type="date" value={f("asociat2_ci_expirare")} onChange={set("asociat2_ci_expirare")} />
            </FormField>
            <FormField label="Telefon">
              <Input value={f("asociat2_telefon")} onChange={set("asociat2_telefon")} />
            </FormField>
            <FormField label="Email">
              <Input type="email" value={f("asociat2_email")} onChange={set("asociat2_email")} />
            </FormField>
          </FormSection>

          <FormSection title="Persoană de contact">
            <FormField label="Nume persoană contact">
              <Input value={f("persoana_contact_nume")} onChange={set("persoana_contact_nume")} />
            </FormField>
            <FormField label="Funcție">
              <Input value={f("persoana_contact_functie")} onChange={set("persoana_contact_functie")} placeholder="Ex: Director, Contabil intern" />
            </FormField>
            <FormField label="Telefon principal">
              <Input value={f("persoana_contact_telefon")} onChange={set("persoana_contact_telefon")} />
            </FormField>
            <FormField label="Email principal">
              <Input type="email" value={f("persoana_contact_email")} onChange={set("persoana_contact_email")} />
            </FormField>
            <FormField label="Telefon secundar">
              <Input value={f("telefon_secundar")} onChange={set("telefon_secundar")} />
            </FormField>
            <FormField label="Email secundar">
              <Input type="email" value={f("email_secundar")} onChange={set("email_secundar")} />
            </FormField>
          </FormSection>

          <FormSection title="Servicii contractate">
            <FormField label="Servicii active" full>
              <div className="flex flex-wrap gap-4">
                {[
                  { field: "serviciu_contabilitate", label: "Contabilitate" },
                  { field: "serviciu_hr", label: "Resurse Umane (HR)" },
                  { field: "serviciu_bilant", label: "Bilanț anual" },
                  { field: "serviciu_consultanta", label: "Consultanță" },
                  { field: "serviciu_revisal", label: "Revisal" },
                  { field: "serviciu_salarizare", label: "Salarizare" },
                ].map(s => (
                  <label key={s.field} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={getBool(s.field)} onChange={setCheck(s.field)} className="w-4 h-4 rounded" />
                    <span className="text-sm text-gray-700">{s.label}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <FormField label="Alte servicii" full>
              <Input value={f("alte_servicii")} onChange={set("alte_servicii")} placeholder="Alte servicii nelistate" />
            </FormField>
          </FormSection>

          <FormSection title="Tarifare curentă">
            <FormField label="Tarif contabilitate (RON/lună)">
              <Input type="number" value={f("tarif_contabilitate")} onChange={set("tarif_contabilitate")} placeholder="0" />
            </FormField>
            <FormField label="Tarif HR (RON/lună)">
              <Input type="number" value={f("tarif_hr")} onChange={set("tarif_hr")} placeholder="0" />
            </FormField>
            <FormField label="Tarif bilanț (RON/an)">
              <Input type="number" value={f("tarif_bilant")} onChange={set("tarif_bilant")} placeholder="0" />
            </FormField>
            <FormField label="Tarif total lunar">
              <Input type="number" value={f("tarif_total")} onChange={set("tarif_total")} placeholder="0" />
            </FormField>
            <FormField label="Monedă">
              <Select value={f("moneda")} onChange={set("moneda")} options={[{ value: "RON", label: "RON" }, { value: "EUR", label: "EUR" }]} />
            </FormField>
            <FormField label="Data ultimei modificări tarif">
              <Input type="date" value={f("data_ultima_modificare_tarif")} onChange={set("data_ultima_modificare_tarif")} />
            </FormField>
          </FormSection>

          <FormSection title="Observații">
            <FormField label="Observații generale" full>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 focus:bg-white resize-none"
                rows={3}
                value={f("observatii_generale")}
                onChange={set("observatii_generale")}
                placeholder="Orice informație suplimentară..."
              />
            </FormField>
          </FormSection>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-4">
            <Btn variant="secondary" onClick={() => setModal(null)}>Anulează</Btn>
            <Btn onClick={handleSave} disabled={saving}>
              {saving ? "Se salvează..." : modal === "add" ? "Adaugă Clientul" : "Salvează Modificările"}
            </Btn>
          </div>
        </Modal>
      )}

      {/* ============================================================
          MODAL: VIEW
          ============================================================ */}
      {modal === "view" && selectedClient && (
        <Modal title={selectedClient.denumire} size="xl" onClose={() => setModal(null)}>
          <div className="flex gap-1 mb-5 border-b border-gray-200 -mt-1 flex-wrap">
            {[
              { id: "info", label: "Informații" },
              { id: "fiscal", label: "Date Fiscale" },
              { id: "contact", label: "Contact" },
              { id: "servicii", label: "Servicii & Tarife" },
              { id: "documente", label: `Documente (${selectedClient.documente?.length || 0})` },
              { id: "istoric", label: `Istoric (${selectedClient.istoric?.length || 0})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "info" && (
            <div className="grid grid-cols-2 gap-4">
              <InfoCard title="Identificare">
                <InfoRow label="Denumire" value={selectedClient.denumire} bold />
                <InfoRow label="Tip" value={selectedClient.tip_entitate} />
                <InfoRow label="CUI" value={selectedClient.cui} />
                <InfoRow label="Nr. Reg. Com." value={selectedClient.nr_reg_com} />
                <InfoRow label="EUID" value={selectedClient.euid} />
                <InfoRow label="Status" value={<Badge text={selectedClient.status_client} color={statusClientColor(selectedClient.status_client)} />} />
                <InfoRow label="Început colaborare" value={selectedClient.data_inceput_colaborare} />
              </InfoCard>
              <InfoCard title="Firmă contabilitate">
                <InfoRow label="Firmă" value={selectedClient.firma_contabilitate_denumire} bold />
                <InfoRow label="Contabil" value={selectedClient.contabil_responsabil} />
                <InfoRow label="Manager" value={selectedClient.manager_responsabil} />
              </InfoCard>
              <InfoCard title="Adresă">
                <InfoRow label="Județ" value={selectedClient.judet} />
                <InfoRow label="Localitate" value={selectedClient.localitate} />
                <InfoRow label="Stradă" value={`${selectedClient.strada || ""} ${selectedClient.numar || ""}`.trim()} />
                <InfoRow label="Cod poștal" value={selectedClient.cod_postal} />
              </InfoCard>
              {selectedClient.observatii_generale && (
                <InfoCard title="Observații">
                  <p className="text-sm text-gray-600">{selectedClient.observatii_generale}</p>
                </InfoCard>
              )}
            </div>
          )}

          {activeTab === "fiscal" && (
            <div className="grid grid-cols-2 gap-4">
              <InfoCard title="Status fiscal">
                <InfoRow label="Plătitor TVA" value={<Badge text={selectedClient.platitor_tva ? "DA" : "NU"} color={selectedClient.platitor_tva ? "green" : "gray"} />} />
                {selectedClient.platitor_tva && <InfoRow label="Cod TVA" value={selectedClient.cod_tva} />}
                <InfoRow label="Vector fiscal" value={selectedClient.vector_fiscal} />
                <InfoRow label="Punct de lucru" value={<Badge text={selectedClient.punct_lucru ? `DA (${selectedClient.nr_puncte_lucru || 1})` : "NU"} color={selectedClient.punct_lucru ? "green" : "gray"} />} />
                <InfoRow label="CUI intracomunitar" value={<Badge text={selectedClient.cui_intracomunitar ? "DA" : "NU"} color={selectedClient.cui_intracomunitar ? "green" : "gray"} />} />
                {selectedClient.cui_intracomunitar && <InfoRow label="Nr. CUI intra." value={selectedClient.nr_cui_intracomunitar} />}
                <InfoRow label="Procură" value={<Badge text={selectedClient.procura ? "DA" : "NU"} color={selectedClient.procura ? "green" : "gray"} />} />
                <InfoRow label="Semnătură digitală" value={<Badge text={selectedClient.semnatura_digitala ? "DA" : "NU"} color={selectedClient.semnatura_digitala ? "green" : "gray"} />} />
                <InfoRow label="Salariați" value={selectedClient.salariati ? `DA (${selectedClient.nr_salariati || 0})` : "NU"} />
                <InfoRow label="Casă de marcat" value={<Badge text={selectedClient.casa_marcat ? "DA" : "NU"} color={selectedClient.casa_marcat ? "green" : "gray"} />} />
                <InfoRow label="Token" value={selectedClient.token} />
              </InfoCard>
              <InfoCard title="Firmă suspendată ONRC">
                <InfoRow label="Suspendată" value={<Badge text={selectedClient.firma_suspendata ? "DA" : "NU"} color={selectedClient.firma_suspendata ? "red" : "green"} />} />
                {selectedClient.firma_suspendata && (
                  <>
                    <InfoRow label="De la" value={selectedClient.data_suspendare} />
                    <InfoRow label="Până la" value={selectedClient.data_reactivare} />
                  </>
                )}
              </InfoCard>
              <InfoCard title="Activitate & Coduri CAEN">
                <InfoRow label="Activitate principală" value={selectedClient.activitate_principala} />
                <InfoRow label="Cod CAEN principal" value={selectedClient.cod_caen_principal} />
                <InfoRow label="Coduri CAEN secundare" value={selectedClient.coduri_caen_secundare} />
              </InfoCard>
              <InfoCard title="Date bancare">
                <InfoRow label="IBAN" value={selectedClient.cont_bancar_principal} />
                <InfoRow label="Bancă" value={selectedClient.banca_principala} />
              </InfoCard>
            </div>
          )}

          {activeTab === "contact" && (
            <div className="grid grid-cols-2 gap-4">
              <InfoCard title="Administrator / Reprezentant legal">
                <InfoRow label="Nume" value={selectedClient.administrator_nume} bold />
                <InfoRow label="CNP" value={selectedClient.administrator_cnp} />
                <InfoRow label="CI" value={`${selectedClient.administrator_ci_serie || ""} ${selectedClient.administrator_ci_numar || ""}`.trim()} />
                <InfoRow label="CI expiră" value={selectedClient.administrator_ci_expirare} />
                <InfoRow label="Telefon" value={selectedClient.administrator_telefon} />
                <InfoRow label="Email" value={selectedClient.administrator_email} />
              </InfoCard>
              <InfoCard title="Persoană de contact">
                <InfoRow label="Nume" value={selectedClient.persoana_contact_nume} bold />
                <InfoRow label="Funcție" value={selectedClient.persoana_contact_functie} />
                <InfoRow label="Telefon" value={selectedClient.persoana_contact_telefon} />
                <InfoRow label="Email" value={selectedClient.persoana_contact_email} />
                <InfoRow label="Telefon 2" value={selectedClient.telefon_secundar} />
                <InfoRow label="Email 2" value={selectedClient.email_secundar} />
              </InfoCard>
              {selectedClient.asociat1_nume && (
                <InfoCard title="Asociat 1">
                  <InfoRow label="Nume" value={selectedClient.asociat1_nume} bold />
                  <InfoRow label="CNP" value={selectedClient.asociat1_cnp} />
                  <InfoRow label="CI" value={`${selectedClient.asociat1_ci_serie || ""} ${selectedClient.asociat1_ci_numar || ""}`.trim()} />
                  <InfoRow label="CI expiră" value={selectedClient.asociat1_ci_expirare} />
                  <InfoRow label="Telefon" value={selectedClient.asociat1_telefon} />
                  <InfoRow label="Email" value={selectedClient.asociat1_email} />
                </InfoCard>
              )}
              {selectedClient.asociat2_nume && (
                <InfoCard title="Asociat 2">
                  <InfoRow label="Nume" value={selectedClient.asociat2_nume} bold />
                  <InfoRow label="CNP" value={selectedClient.asociat2_cnp} />
                  <InfoRow label="CI" value={`${selectedClient.asociat2_ci_serie || ""} ${selectedClient.asociat2_ci_numar || ""}`.trim()} />
                  <InfoRow label="CI expiră" value={selectedClient.asociat2_ci_expirare} />
                  <InfoRow label="Telefon" value={selectedClient.asociat2_telefon} />
                  <InfoRow label="Email" value={selectedClient.asociat2_email} />
                </InfoCard>
              )}
            </div>
          )}

          {activeTab === "servicii" && (
            <div className="grid grid-cols-2 gap-4">
              <InfoCard title="Servicii contractate">
                {[
                  { field: "serviciu_contabilitate", label: "Contabilitate" },
                  { field: "serviciu_hr", label: "Resurse Umane (HR)" },
                  { field: "serviciu_bilant", label: "Bilanț anual" },
                  { field: "serviciu_consultanta", label: "Consultanță" },
                  { field: "serviciu_revisal", label: "Revisal" },
                  { field: "serviciu_salarizare", label: "Salarizare" },
                ].map(s => (
                  <InfoRow key={s.field} label={s.label} value={<Badge text={selectedClient[s.field] ? "Activ" : "—"} color={selectedClient[s.field] ? "green" : "gray"} />} />
                ))}
                {selectedClient.alte_servicii && <InfoRow label="Altele" value={selectedClient.alte_servicii} />}
              </InfoCard>
              <InfoCard title="Tarifare curentă">
                <InfoRow label="Tarif contabilitate" value={selectedClient.tarif_contabilitate ? `${selectedClient.tarif_contabilitate} ${selectedClient.moneda}/lună` : null} />
                <InfoRow label="Tarif HR" value={selectedClient.tarif_hr ? `${selectedClient.tarif_hr} ${selectedClient.moneda}/lună` : null} />
                <InfoRow label="Tarif bilanț" value={selectedClient.tarif_bilant ? `${selectedClient.tarif_bilant} ${selectedClient.moneda}/an` : null} />
                <InfoRow label="TOTAL lunar" value={selectedClient.tarif_total ? `${selectedClient.tarif_total} ${selectedClient.moneda}/lună` : null} bold />
                <InfoRow label="Ultima modificare tarif" value={selectedClient.data_ultima_modificare_tarif} />
              </InfoCard>
            </div>
          )}

          {activeTab === "documente" && (
            <div>
              <div className="flex justify-end mb-4">
                <Btn onClick={() => setDocModal(true)}>+ Adaugă Document</Btn>
              </div>
              {(!selectedClient.documente || selectedClient.documente.length === 0) ? (
                <EmptyState title="Nu există documente" />
              ) : (
                <div className="space-y-2">
                  {selectedClient.documente.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{d.denumire}</p>
                        <p className="text-xs text-gray-500">{d.categorie} • {d.data_adaugare}</p>
                        {d.observatii && <p className="text-xs text-gray-400">{d.observatii}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "istoric" && (
            <div>
              {(!selectedClient.istoric || selectedClient.istoric.length === 0) ? (
                <EmptyState title="Nu există istoric" />
              ) : (
                <div className="space-y-2">
                  {[...(selectedClient.istoric || [])].reverse().map((ev, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full mt-1.5 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{ev.descriere}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(ev.data).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          {ev.utilizator && ` • ${ev.utilizator}`}
                        </p>
                        {ev.valoare_veche && <p className="text-xs text-gray-500">Vechi: {ev.valoare_veche} → Nou: {ev.valoare_noua}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between mt-5 pt-4 border-t border-gray-100">
            <Btn variant="danger" size="sm" onClick={() => handleDelete(selectedClient.id, selectedClient.denumire)}>
              Șterge clientul
            </Btn>
            <Btn onClick={() => openEdit(selectedClient)}>Editează</Btn>
          </div>
        </Modal>
      )}

      {/* Modal adaugă document */}
      {docModal && (
        <Modal title="Adaugă Document" size="sm" onClose={() => setDocModal(false)}>
          <FormField label="Categorie" required>
            <Select value={docForm.categorie} onChange={e => setDocForm(p => ({ ...p, categorie: e.target.value }))} placeholder="Selectează" options={CAT_DOCUMENTE_CLIENT.map(c => ({ value: c, label: c }))} />
          </FormField>
          <div className="mt-3">
            <FormField label="Denumire document" required>
              <Input value={docForm.denumire} onChange={e => setDocForm(p => ({ ...p, denumire: e.target.value }))} placeholder="Ex: CI Administrator Ion Popescu" />
            </FormField>
          </div>
          <div className="mt-3">
            <FormField label="Observații">
              <Input value={docForm.observatii} onChange={e => setDocForm(p => ({ ...p, observatii: e.target.value }))} />
            </FormField>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3 mt-3">
            Upload fișiere vine în versiunea următoare.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => setDocModal(false)}>Anulează</Btn>
            <Btn onClick={handleAddDoc}>Adaugă</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, bold }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-400 w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-800 ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
