import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import {
  Badge, statusFirmaColor, Modal, FormSection, FormField,
  Input, Select, Textarea, Btn, PageHeader, EmptyState, Loading, Card,
  JUDETE, BANCI
} from "../components/UI";

// ============================================================
// CONSTANTE
// ============================================================
const STATUS_FIRMA = ["Activa", "Suspendata", "Radiata"];
const CAT_DOCUMENTE = [
  "Certificat înregistrare",
  "Act constitutiv",
  "Certificat constatator",
  "CI administrator",
  "Hotărâre AGA",
  "Contract sediu",
  "Alte documente",
];

const EMPTY_FORM = {
  denumire: "", denumire_scurta: "", cui: "", nr_reg_com: "", euid: "",
  platitor_tva: false, cod_tva: "",
  administrator: "", asociati: "", telefon: "", email: "", website: "",
  iban: "", banca: "", capital_social: "", data_infiintare: "",
  judet: "", localitate: "", strada: "", numar: "", bloc: "", scara: "",
  apartament: "", cod_postal: "",
  status_firma: "Activa", observatii: "",
};

// ============================================================
// COMPONENTA PRINCIPALA
// ============================================================
export default function FirmeContabilitate() {
  const [firme, setFirme] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtruStatus, setFiltruStatus] = useState("Toate");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedFirma, setSelectedFirma] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const [docModal, setDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ categorie: "", denumire: "", observatii: "" });
  const [docSaving, setDocSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "firme_contabilitate"));
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setFirme(data.sort((a, b) => a.denumire?.localeCompare(b.denumire)));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const filtered = firme.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !q || f.denumire?.toLowerCase().includes(q) ||
      f.cui?.includes(q) || f.administrator?.toLowerCase().includes(q);
    const matchStatus = filtruStatus === "Toate" || f.status_firma === filtruStatus;
    return matchSearch && matchStatus;
  });

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setModal("add");
  };

  const openEdit = (firma) => {
    setForm({ ...EMPTY_FORM, ...firma });
    setSelectedFirma(firma);
    setModal("edit");
  };

  const openView = (firma) => {
    setSelectedFirma(firma);
    setActiveTab("info");
    setModal("view");
  };

  const handleSave = async () => {
    if (!form.denumire || !form.cui) return alert("Denumirea și CUI-ul sunt obligatorii!");
    setSaving(true);
    try {
      const data = { ...form, updated_at: serverTimestamp() };
      if (modal === "add") {
        data.created_at = serverTimestamp();
        data.documente = [];
        await addDoc(collection(db, "firme_contabilitate"), data);
      } else {
        await updateDoc(doc(db, "firme_contabilitate", form.id), data);
      }
      await reload();
      setModal(null);
    } catch (e) { alert("Eroare la salvare: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id, denumire) => {
    if (!window.confirm(`Sigur vrei să ștergi firma "${denumire}"? Această acțiune este ireversibilă!`)) return;
    try {
      await deleteDoc(doc(db, "firme_contabilitate", id));
      await reload();
      if (modal === "view") setModal(null);
    } catch (e) { alert("Eroare la ștergere: " + e.message); }
  };

  const handleAddDoc = async () => {
    if (!docForm.categorie || !docForm.denumire) return alert("Completează categoria și denumirea!");
    setDocSaving(true);
    try {
      const firma = firme.find(f => f.id === selectedFirma.id);
      const documente = [...(firma.documente || []), {
        ...docForm,
        data_adaugare: new Date().toISOString().split("T")[0],
        id: Date.now().toString(),
      }];
      await updateDoc(doc(db, "firme_contabilitate", selectedFirma.id), { documente });
      await reload();
      const updated = (await getDocs(collection(db, "firme_contabilitate"))).docs
        .map(d => ({ ...d.data(), id: d.id }))
        .find(f => f.id === selectedFirma.id);
      setSelectedFirma(updated);
      setDocForm({ categorie: "", denumire: "", observatii: "" });
      setDocModal(false);
    } catch (e) { alert("Eroare: " + e.message); }
    setDocSaving(false);
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm("Ștergi documentul?")) return;
    const documente = (selectedFirma.documente || []).filter(d => d.id !== docId);
    await updateDoc(doc(db, "firme_contabilitate", selectedFirma.id), { documente });
    setSelectedFirma(prev => ({ ...prev, documente }));
    await reload();
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
        title="Firme de Contabilitate"
        subtitle={`${firme.filter(f => f.status_firma === "Activa").length} active din ${firme.length} total`}
        action={<Btn onClick={openAdd}>+ Adaugă Firmă</Btn>}
      />

      {/* Filtre */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Caută după denumire, CUI, administrator..."
          className="flex-1 min-w-64 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
        <div className="flex gap-1">
          {["Toate", ...STATUS_FIRMA].map(s => (
            <button
              key={s}
              onClick={() => setFiltruStatus(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
          title="Nu există firme înregistrate"
          subtitle="Adaugă prima firmă de contabilitate"
          action={<Btn onClick={openAdd}>+ Adaugă Firmă</Btn>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(firma => (
            <Card key={firma.id} className="hover:shadow-md transition-shadow cursor-pointer" >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-base leading-tight">{firma.denumire}</h3>
                    {firma.denumire_scurta && <p className="text-xs text-gray-400 mt-0.5">{firma.denumire_scurta}</p>}
                  </div>
                  <Badge text={firma.status_firma || "Activa"} color={statusFirmaColor(firma.status_firma)} />
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex gap-2 text-gray-600">
                    <span className="text-gray-400 w-8 text-xs">CUI</span>
                    <span className="font-medium">{firma.cui}</span>
                  </div>
                  {firma.nr_reg_com && (
                    <div className="flex gap-2 text-gray-600">
                      <span className="text-gray-400 w-8 text-xs">RC</span>
                      <span>{firma.nr_reg_com}</span>
                    </div>
                  )}
                  {firma.administrator && (
                    <div className="flex gap-2 text-gray-600">
                      <span className="text-gray-400 w-8 text-xs">Adm.</span>
                      <span>{firma.administrator}</span>
                    </div>
                  )}
                  {firma.telefon && (
                    <div className="flex gap-2 text-gray-600">
                      <span className="text-gray-400 w-8 text-xs">Tel.</span>
                      <span>{firma.telefon}</span>
                    </div>
                  )}
                  {firma.email && (
                    <div className="flex gap-2 text-gray-600">
                      <span className="text-gray-400 w-8 text-xs">Email</span>
                      <span className="truncate">{firma.email}</span>
                    </div>
                  )}
                  {firma.judet && (
                    <div className="flex gap-2 text-gray-600">
                      <span className="text-gray-400 w-8 text-xs">Jud.</span>
                      <span>{firma.localitate ? `${firma.localitate}, ` : ""}{firma.judet}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                  <div className="flex gap-1">
                    {firma.platitor_tva && <Badge text="TVA" color="indigo" />}
                    {(firma.documente?.length > 0) && (
                      <Badge text={`${firma.documente.length} doc.`} color="blue" />
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Btn variant="ghost" size="sm" onClick={() => openView(firma)}>Vezi</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => openEdit(firma)}>Editează</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => handleDelete(firma.id, firma.denumire)}>Șterge</Btn>
                  </div>
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
          title={modal === "add" ? "Adaugă Firmă de Contabilitate" : `Editează: ${selectedFirma?.denumire}`}
          size="xl"
          onClose={() => setModal(null)}
        >
          <FormSection title="Date de identificare">
            <FormField label="Denumire completă" required full>
              <Input value={f("denumire")} onChange={set("denumire")} placeholder="Ex: SC Alpha Contabil SRL" />
            </FormField>
            <FormField label="Denumire scurtă / prescurtare">
              <Input value={f("denumire_scurta")} onChange={set("denumire_scurta")} placeholder="Ex: Alpha" />
            </FormField>
            <FormField label="CUI" required>
              <Input value={f("cui")} onChange={set("cui")} placeholder="Ex: RO12345678" />
            </FormField>
            <FormField label="Nr. Reg. Comerțului">
              <Input value={f("nr_reg_com")} onChange={set("nr_reg_com")} placeholder="Ex: J05/123/2020" />
            </FormField>
            <FormField label="EUID">
              <Input value={f("euid")} onChange={set("euid")} placeholder="Ex: ROONRC.J05/123/2020" />
            </FormField>
            <FormField label="Dată înființare">
              <Input type="date" value={f("data_infiintare")} onChange={set("data_infiintare")} />
            </FormField>
            <FormField label="Capital social">
              <Input value={f("capital_social")} onChange={set("capital_social")} placeholder="Ex: 200 RON" />
            </FormField>
            <FormField label="Status firmă">
              <Select value={f("status_firma")} onChange={set("status_firma")} options={STATUS_FIRMA.map(s => ({ value: s, label: s }))} />
            </FormField>
          </FormSection>

          <FormSection title="TVA">
            <FormField label="" full>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.platitor_tva} onChange={setCheck("platitor_tva")} className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">Platitor de TVA</span>
              </label>
            </FormField>
            {form.platitor_tva && (
              <FormField label="Cod TVA">
                <Input value={f("cod_tva")} onChange={set("cod_tva")} placeholder="Ex: RO12345678" />
              </FormField>
            )}
          </FormSection>

          <FormSection title="Administrator & Contact">
            <FormField label="Administrator">
              <Input value={f("administrator")} onChange={set("administrator")} placeholder="Nume complet" />
            </FormField>
            <FormField label="Asociați">
              <Input value={f("asociati")} onChange={set("asociati")} placeholder="Numele asociaților" />
            </FormField>
            <FormField label="Telefon">
              <Input value={f("telefon")} onChange={set("telefon")} placeholder="07xx xxx xxx" />
            </FormField>
            <FormField label="Email">
              <Input type="email" value={f("email")} onChange={set("email")} placeholder="office@firma.ro" />
            </FormField>
            <FormField label="Website">
              <Input value={f("website")} onChange={set("website")} placeholder="www.firma.ro" />
            </FormField>
          </FormSection>

          <FormSection title="Date bancare">
            <FormField label="IBAN">
              <Input value={f("iban")} onChange={set("iban")} placeholder="RO49AAAA1B31007593840000" />
            </FormField>
            <FormField label="Bancă">
              <Select value={f("banca")} onChange={set("banca")} placeholder="Selectează banca" options={BANCI.map(b => ({ value: b, label: b }))} />
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

          <FormSection title="Observații">
            <FormField label="Observații generale" full>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 focus:bg-white resize-none"
                rows={3}
                value={f("observatii")}
                onChange={set("observatii")}
                placeholder="Orice informație suplimentară..."
              />
            </FormField>
          </FormSection>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-4">
            <Btn variant="secondary" onClick={() => setModal(null)}>Anulează</Btn>
            <Btn onClick={handleSave} disabled={saving}>
              {saving ? "Se salvează..." : modal === "add" ? "Adaugă Firma" : "Salvează Modificările"}
            </Btn>
          </div>
        </Modal>
      )}

      {/* ============================================================
          MODAL: VIEW DETAILS
          ============================================================ */}
      {modal === "view" && selectedFirma && (
        <Modal
          title={selectedFirma.denumire}
          size="xl"
          onClose={() => setModal(null)}
        >
          {/* Tabs */}
          <div className="flex gap-1 mb-5 border-b border-gray-200 -mt-1">
            {[
              { id: "info", label: "Informații" },
              { id: "documente", label: `Documente (${selectedFirma.documente?.length || 0})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "info" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <InfoCard title="Date de identificare">
                  <InfoRow label="Denumire" value={selectedFirma.denumire} bold />
                  <InfoRow label="Denumire scurtă" value={selectedFirma.denumire_scurta} />
                  <InfoRow label="CUI" value={selectedFirma.cui} />
                  <InfoRow label="Nr. Reg. Com." value={selectedFirma.nr_reg_com} />
                  <InfoRow label="EUID" value={selectedFirma.euid} />
                  <InfoRow label="Dată înființare" value={selectedFirma.data_infiintare} />
                  <InfoRow label="Capital social" value={selectedFirma.capital_social} />
                  <InfoRow label="Status" value={
                    <Badge text={selectedFirma.status_firma || "Activa"} color={statusFirmaColor(selectedFirma.status_firma)} />
                  } />
                  <InfoRow label="Plătitor TVA" value={selectedFirma.platitor_tva ? <Badge text="DA" color="green" /> : <Badge text="NU" color="gray" />} />
                  {selectedFirma.platitor_tva && <InfoRow label="Cod TVA" value={selectedFirma.cod_tva} />}
                </InfoCard>

                <InfoCard title="Date bancare">
                  <InfoRow label="IBAN" value={selectedFirma.iban} />
                  <InfoRow label="Bancă" value={selectedFirma.banca} />
                </InfoCard>
              </div>

              <div className="space-y-4">
                <InfoCard title="Administrator & Contact">
                  <InfoRow label="Administrator" value={selectedFirma.administrator} bold />
                  <InfoRow label="Asociați" value={selectedFirma.asociati} />
                  <InfoRow label="Telefon" value={selectedFirma.telefon} />
                  <InfoRow label="Email" value={selectedFirma.email} />
                  <InfoRow label="Website" value={selectedFirma.website} />
                </InfoCard>

                <InfoCard title="Adresă sediu social">
                  <InfoRow label="Județ" value={selectedFirma.judet} />
                  <InfoRow label="Localitate" value={selectedFirma.localitate} />
                  <InfoRow label="Strada" value={`${selectedFirma.strada || ""} ${selectedFirma.numar || ""}`.trim()} />
                  {selectedFirma.bloc && <InfoRow label="Bloc/Sc/Ap" value={`Bl. ${selectedFirma.bloc}${selectedFirma.scara ? `, Sc. ${selectedFirma.scara}` : ""}${selectedFirma.apartament ? `, Ap. ${selectedFirma.apartament}` : ""}`} />}
                  <InfoRow label="Cod poștal" value={selectedFirma.cod_postal} />
                </InfoCard>

                {selectedFirma.observatii && (
                  <InfoCard title="Observații">
                    <p className="text-sm text-gray-600">{selectedFirma.observatii}</p>
                  </InfoCard>
                )}
              </div>
            </div>
          )}

          {activeTab === "documente" && (
            <div>
              <div className="flex justify-end mb-4">
                <Btn onClick={() => setDocModal(true)}>+ Adaugă Document</Btn>
              </div>
              {(!selectedFirma.documente || selectedFirma.documente.length === 0) ? (
                <EmptyState title="Nu există documente" subtitle="Adaugă primul document al acestei firme" />
              ) : (
                <div className="space-y-2">
                  {selectedFirma.documente.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{doc.denumire}</p>
                        <p className="text-xs text-gray-500">{doc.categorie} • {doc.data_adaugare}</p>
                        {doc.observatii && <p className="text-xs text-gray-400 mt-0.5">{doc.observatii}</p>}
                      </div>
                      <Btn variant="ghost" size="sm" onClick={() => handleDeleteDoc(doc.id)}>Șterge</Btn>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between mt-5 pt-4 border-t border-gray-100">
            <Btn variant="danger" size="sm" onClick={() => handleDelete(selectedFirma.id, selectedFirma.denumire)}>
              Șterge firma
            </Btn>
            <Btn onClick={() => openEdit(selectedFirma)}>Editează</Btn>
          </div>
        </Modal>
      )}

      {/* MODAL: Adaugă document */}
      {docModal && (
        <Modal title="Adaugă Document" size="sm" onClose={() => setDocModal(false)}>
          <FormField label="Categorie document" required>
            <Select
              value={docForm.categorie}
              onChange={e => setDocForm(p => ({ ...p, categorie: e.target.value }))}
              placeholder="Selectează categoria"
              options={CAT_DOCUMENTE.map(c => ({ value: c, label: c }))}
            />
          </FormField>
          <div className="mt-3">
            <FormField label="Denumire document" required>
              <Input
                value={docForm.denumire}
                onChange={e => setDocForm(p => ({ ...p, denumire: e.target.value }))}
                placeholder="Ex: Certificat înregistrare 2024"
              />
            </FormField>
          </div>
          <div className="mt-3">
            <FormField label="Observații">
              <Input
                value={docForm.observatii}
                onChange={e => setDocForm(p => ({ ...p, observatii: e.target.value }))}
                placeholder="Observații opționale"
              />
            </FormField>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3 mt-3">
            Upload fișiere vine în versiunea următoare. Acum poți înregistra doar evidența documentelor.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => setDocModal(false)}>Anulează</Btn>
            <Btn onClick={handleAddDoc} disabled={docSaving}>
              {docSaving ? "Se salvează..." : "Adaugă"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// SUB-COMPONENTE HELPER
// ============================================================
function InfoCard({ title, children }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, bold }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-800 ${bold ? "font-semibold" : ""}`}>
        {typeof value === "string" || typeof value === "number" ? value : value}
      </span>
    </div>
  );
}
