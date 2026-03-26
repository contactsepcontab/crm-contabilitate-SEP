import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Badge, Modal, FormSection, FormField, Input, Select,
  Textarea, Btn, PageHeader, EmptyState, Loading, Card, Alert
} from "../components/UI";

// ============================================================
// CONSTANTE
// ============================================================
const TIP_CAMPANIE = [
  "Informare generala",
  "Modificare tarif",
  "Modificare legislativa",
  "Follow-up client nou",
  "Reminder documente",
  "Reminder plata",
  "Felicitare sarbatori",
  "Altul",
];

const STATUS_CAMPANIE = ["Draft", "Programata", "Trimisa", "Anulata"];

const SEGMENT_DESTINATARI = [
  "Toti clientii activi",
  "Clienti activi - contabilitate",
  "Clienti activi - HR",
  "Clienti activi - bilant",
  "Clienti platitori TVA",
  "Clienti trimestrial",
  "Clienti cu firma suspendata",
  "Clienti noi (ultimele 90 zile)",
  "Potentiali clienti (Lead-uri)",
  "Selectie manuala",
];

const EMPTY_FORM = {
  titlu: "",
  tip: "Informare generala",
  segment: "Toti clientii activi",
  subiect_email: "",
  continut: "",
  status: "Draft",
  data_programata: "",
  ora_programata: "09:00",
  trimis_de: "",
  reply_to: "",
  destinatari_manuali: "",
  nota_interna: "",
};

// ============================================================
// TEMPLATE-URI PREDEFINITE
// ============================================================
const TEMPLATE_URI = [
  {
    id: "modificare_tarif",
    nume: "Modificare tarif",
    subiect: "Informare privind actualizarea tarifelor de contabilitate",
    continut: `Stimate/ă {client_denumire},

Prin prezenta vă informăm că, începând cu data de {data_intrare_vigoare}, tarifele pentru serviciile de contabilitate vor fi actualizate după cum urmează:

Tarif lunar contabilitate: {tarif_nou} RON

Această ajustare reflectă creșterea costurilor operaționale și ne permite să menținem calitatea serviciilor oferite.

Vă rugăm să confirmați primirea acestui mesaj și vă stăm la dispoziție pentru orice clarificări la adresa de email sau telefonic.

Cu stimă,
{firma_contabilitate}`,
  },
  {
    id: "modificare_legislativa",
    nume: "Modificare legislativa",
    subiect: "Informare privind modificările legislative — {luna} {an}",
    continut: `Stimate/ă {client_denumire},

Vă aducem la cunoștință că au intervenit modificări legislative importante care vă afectează activitatea:

{descriere_modificare}

Vă recomandăm să luați act de aceste modificări și să ne contactați pentru orice clarificări necesare.

Cu stimă,
{firma_contabilitate}`,
  },
  {
    id: "followup_client_nou",
    nume: "Follow-up client nou",
    subiect: "Bun venit — confirmare colaborare {firma_contabilitate}",
    continut: `Stimate/ă {client_denumire},

Vă mulțumim că ați ales să colaborați cu {firma_contabilitate}!

Contabilul responsabil pentru dosarul dumneavoastră este {contabil_responsabil} și poate fi contactat la {contact_contabil}.

Pentru o colaborare eficientă, avem nevoie de următoarele documente în cel mai scurt timp:
- Certificat de înregistrare
- Act constitutiv actualizat
- CI administrator
- Dovadă sediu social

Vă stăm la dispoziție pentru orice întrebări.

Cu stimă,
{firma_contabilitate}`,
  },
  {
    id: "reminder_documente",
    nume: "Reminder documente lipsă",
    subiect: "Completare dosar — documente necesare",
    continut: `Stimate/ă {client_denumire},

Vă informăm că dosarul dumneavoastră are documente incomplete. Vă rugăm să ne transmiteți cât mai curând:

{lista_documente_lipsa}

Fără aceste documente nu putem garanta conformitatea înregistrărilor contabile.

Cu stimă,
{firma_contabilitate}`,
  },
  {
    id: "reminder_plata",
    nume: "Reminder plată",
    subiect: "Factura scadenta — {luna} {an}",
    continut: `Stimate/ă {client_denumire},

Vă aducem la cunoștință că factura aferentă serviciilor de contabilitate pentru luna {luna} în valoare de {suma} RON este scadentă.

Vă rugăm să efectuați plata în contul {iban}, menționând numărul facturii.

Dacă ați efectuat deja plata, vă rugăm să ignorați acest mesaj.

Cu stimă,
{firma_contabilitate}`,
  },
  {
    id: "felicitare",
    nume: "Felicitare sarbatori",
    subiect: "Sarbatori fericite de la {firma_contabilitate}!",
    continut: `Stimate/ă {client_denumire},

Cu ocazia {sarbatoare}, echipa {firma_contabilitate} vă transmite cele mai calde urări!

Vă dorim un an plin de succese, sănătate și prosperitate.

Mult succes în tot ce vă propuneți!

Echipa {firma_contabilitate}`,
  },
];

// ============================================================
// COMPONENTA PRINCIPALA
// ============================================================
export default function EmailMarketing() {
  const [campanii, setCampanii] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtruStatus, setFiltruStatus] = useState("Toate");
  const [modal, setModal] = useState(null); // null | "add" | "edit" | "view" | "preview" | "template"
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [destinatariCalculati, setDestinatariCalculati] = useState([]);

  const reload = async () => {
    setLoading(true);
    try {
      const [cSnap, clSnap] = await Promise.all([
        getDocs(collection(db, "campanii_email")),
        getDocs(collection(db, "clienti")),
      ]);
      setCampanii(cSnap.docs.map(d => ({ ...d.data(), id: d.id }))
        .sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)));
      setClienti(clSnap.docs.map(d => ({ ...d.data(), id: d.id })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  // Calculeaza destinatarii in functie de segment
  const calculeazaDestinatari = (segment, clientiLista) => {
    const azi = new Date();
    const acum90 = new Date(); acum90.setDate(azi.getDate() - 90);

    switch (segment) {
      case "Toti clientii activi":
        return clientiLista.filter(c => c.status_client === "Activ");
      case "Clienti activi - contabilitate":
        return clientiLista.filter(c => c.status_client === "Activ" && c.serviciu_contabilitate);
      case "Clienti activi - HR":
        return clientiLista.filter(c => c.status_client === "Activ" && c.serviciu_hr);
      case "Clienti activi - bilant":
        return clientiLista.filter(c => c.status_client === "Activ" && c.serviciu_bilant);
      case "Clienti platitori TVA":
        return clientiLista.filter(c => c.status_client === "Activ" && c.platitor_tva);
      case "Clienti trimestrial":
        return clientiLista.filter(c => c.status_client === "Activ" && c.vector_fiscal === "Trimestrial");
      case "Clienti cu firma suspendata":
        return clientiLista.filter(c => c.firma_suspendata);
      case "Clienti noi (ultimele 90 zile)":
        return clientiLista.filter(c => {
          if (!c.data_inceput_colaborare) return false;
          const d = new Date(c.data_inceput_colaborare);
          return d >= acum90;
        });
      default:
        return [];
    }
  };

  const handleSegmentChange = (segment) => {
    setForm(p => ({ ...p, segment }));
    if (segment !== "Selectie manuala" && segment !== "Potentiali clienti (Lead-uri)") {
      setDestinatariCalculati(calculeazaDestinatari(segment, clienti));
    } else {
      setDestinatariCalculati([]);
    }
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setDestinatariCalculati([]);
    setModal("add");
  };

  const openEdit = (c) => {
    setForm({ ...EMPTY_FORM, ...c });
    setDestinatariCalculati(calculeazaDestinatari(c.segment, clienti));
    setSelected(c);
    setModal("edit");
  };

  const openView = (c) => {
    setSelected(c);
    setModal("view");
  };

  const aplicaTemplate = (template) => {
    setForm(p => ({
      ...p,
      subiect_email: template.subiect,
      continut: template.continut,
      tip: TIP_CAMPANIE.find(t => template.id.includes(t.toLowerCase().replace(/ /g, "_"))) || p.tip,
    }));
    setModal("add");
  };

  const handleSave = async () => {
    if (!form.titlu || !form.subiect_email || !form.continut) {
      return alert("Titlul, subiectul și conținutul sunt obligatorii!");
    }
    setSaving(true);
    try {
      const nrDestinatari = form.segment !== "Selectie manuala"
        ? calculeazaDestinatari(form.segment, clienti).length
        : (form.destinatari_manuali?.split("\n").filter(Boolean).length || 0);

      const data = {
        ...form,
        nr_destinatari: nrDestinatari,
        updated_at: serverTimestamp(),
      };
      if (modal === "add") {
        data.created_at = serverTimestamp();
        data.nr_trimiteri = 0;
        await addDoc(collection(db, "campanii_email"), data);
      } else {
        await updateDoc(doc(db, "campanii_email", form.id), data);
      }
      await reload();
      setModal(null);
    } catch (e) { alert("Eroare: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sigur vrei sa stergi aceasta campanie?")) return;
    try {
      await deleteDoc(doc(db, "campanii_email", id));
      await reload();
      if (modal === "view") setModal(null);
    } catch (e) { alert("Eroare: " + e.message); }
  };

  const handleMarcheazaTrimisa = async (campanie) => {
    if (!window.confirm(`Marchezi campania "${campanie.titlu}" ca trimisa?`)) return;
    try {
      await updateDoc(doc(db, "campanii_email", campanie.id), {
        status: "Trimisa",
        data_trimitere_efectiva: new Date().toISOString(),
        updated_at: serverTimestamp(),
      });
      await reload();
    } catch (e) { alert("Eroare: " + e.message); }
  };

  const filtered = campanii.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.titlu?.toLowerCase().includes(q) || c.tip?.toLowerCase().includes(q);
    const matchStatus = filtruStatus === "Toate" || c.status === filtruStatus;
    return matchSearch && matchStatus;
  });

  const f = (field) => form[field] ?? "";
  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target?.value ?? e }));

  const statusColor = (s) => ({
    "Draft": "gray", "Programata": "blue", "Trimisa": "green", "Anulata": "red"
  }[s] || "gray");

  // Stats
  const statTrimise = campanii.filter(c => c.status === "Trimisa").length;
  const statDraft = campanii.filter(c => c.status === "Draft").length;
  const statProgramate = campanii.filter(c => c.status === "Programata").length;
  const totalDestinatari = campanii
    .filter(c => c.status === "Trimisa")
    .reduce((sum, c) => sum + (c.nr_destinatari || 0), 0);

  return (
    <div className="p-6">
      <PageHeader
        title="Email Marketing"
        subtitle="Campanii de informare si follow-up pentru clienti"
        action={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setModal("template")}>
              Alege template
            </Btn>
            <Btn onClick={openAdd}>+ Campanie noua</Btn>
          </div>
        }
      />

      {/* Statistici rapide */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Trimise", value: statTrimise, color: "text-success-400" },
          { label: "In draft", value: statDraft, color: "text-slate-500" },
          { label: "Programate", value: statProgramate, color: "text-accent-500" },
          { label: "Total destinatari atinsi", value: totalDestinatari, color: "text-primary-500" },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Nota integrare */}
      <Alert type="info" title="Despre trimiterea email-urilor">
        <p>
          Campaniile sunt gestionate si stocate in CRM. Pentru trimiterea efectiva a email-urilor
          conectati un serviciu extern: <strong>Brevo (fost Sendinblue)</strong> — gratuit pana la
          300 email-uri/zi, sau <strong>Mailchimp</strong>. Exportul listei de destinatari se face
          din butonul "Export lista" de pe fiecare campanie.
        </p>
      </Alert>

      {/* Filtre */}
      <div className="flex gap-3 mt-5 mb-5 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cauta dupa titlu sau tip..."
          className="flex-1 min-w-64 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
        />
        <div className="flex gap-1">
          {["Toate", ...STATUS_CAMPANIE].map(s => (
            <button
              key={s}
              onClick={() => setFiltruStatus(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtruStatus === s
                  ? "bg-primary-500 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Lista campanii */}
      {loading ? <Loading /> : filtered.length === 0 ? (
        <EmptyState
          title="Nu exista campanii"
          subtitle="Creeaza prima campanie de email marketing"
          action={<Btn onClick={openAdd}>+ Campanie noua</Btn>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(campanie => (
            <Card key={campanie.id} className="hover:shadow-card-hover transition-shadow">
              <div className="flex items-center justify-between p-4">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openView(campanie)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800">{campanie.titlu}</h3>
                    <Badge text={campanie.status} color={statusColor(campanie.status)} />
                    <Badge text={campanie.tip} color="indigo" />
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-slate-400 flex-wrap">
                    <span>Segment: <strong className="text-slate-600">{campanie.segment}</strong></span>
                    {campanie.nr_destinatari > 0 && (
                      <span>{campanie.nr_destinatari} destinatari</span>
                    )}
                    {campanie.data_programata && (
                      <span>Programata: {campanie.data_programata} {campanie.ora_programata}</span>
                    )}
                    {campanie.data_trimitere_efectiva && (
                      <span>Trimisa: {new Date(campanie.data_trimitere_efectiva).toLocaleDateString("ro-RO")}</span>
                    )}
                  </div>
                  {campanie.subiect_email && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      Subiect: {campanie.subiect_email}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 ml-4 flex-shrink-0">
                  {campanie.status === "Draft" || campanie.status === "Programata" ? (
                    <Btn variant="success" size="sm" onClick={() => handleMarcheazaTrimisa(campanie)}>
                      Marcheaza trimisa
                    </Btn>
                  ) : null}
                  <Btn variant="ghost" size="sm" onClick={() => openEdit(campanie)}>Editeaza</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => handleDelete(campanie.id)}>Sterge</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ============================================================
          MODAL: ALEGE TEMPLATE
          ============================================================ */}
      {modal === "template" && (
        <Modal title="Alege un template" size="lg" onClose={() => setModal(null)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TEMPLATE_URI.map(t => (
              <button
                key={t.id}
                onClick={() => aplicaTemplate(t)}
                className="text-left p-4 border border-slate-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all group"
              >
                <p className="font-semibold text-slate-800 group-hover:text-primary-600 text-sm mb-1">{t.nume}</p>
                <p className="text-xs text-slate-400 truncate">{t.subiect}</p>
              </button>
            ))}
            <button
              onClick={() => { setForm(EMPTY_FORM); setModal("add"); }}
              className="text-left p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-primary-300 hover:bg-slate-50 transition-all"
            >
              <p className="font-semibold text-slate-500 text-sm mb-1">Email de la zero</p>
              <p className="text-xs text-slate-400">Incepe cu un email gol</p>
            </button>
          </div>
        </Modal>
      )}

      {/* ============================================================
          MODAL: ADD / EDIT
          ============================================================ */}
      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Campanie noua" : `Editeaza: ${selected?.titlu}`}
          size="xl"
          onClose={() => setModal(null)}
        >
          <FormSection title="Informatii campanie">
            <FormField label="Titlu campanie (intern)" required full>
              <Input
                value={f("titlu")}
                onChange={set("titlu")}
                placeholder="Ex: Informare modificare tarife Ianuarie 2025"
              />
            </FormField>
            <FormField label="Tip campanie">
              <Select value={f("tip")} onChange={set("tip")} options={TIP_CAMPANIE.map(t => ({ value: t, label: t }))} />
            </FormField>
            <FormField label="Status">
              <Select value={f("status")} onChange={set("status")} options={STATUS_CAMPANIE.map(s => ({ value: s, label: s }))} />
            </FormField>
          </FormSection>

          <FormSection title="Destinatari">
            <FormField label="Segment destinatari" required full>
              <Select
                value={f("segment")}
                onChange={e => handleSegmentChange(e.target.value)}
                options={SEGMENT_DESTINATARI.map(s => ({ value: s, label: s }))}
              />
            </FormField>
            {form.segment !== "Selectie manuala" && destinatariCalculati.length > 0 && (
              <FormField label="" full>
                <div className="bg-success-50 border border-success-200 rounded-lg px-3 py-2 text-sm text-success-500 font-medium">
                  {destinatariCalculati.length} destinatari gasiti pentru segmentul selectat
                </div>
              </FormField>
            )}
            {form.segment === "Selectie manuala" && (
              <FormField label="Adrese email (unul pe linie)" required full>
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-slate-50 focus:bg-white resize-none font-mono"
                  rows={5}
                  value={f("destinatari_manuali")}
                  onChange={set("destinatari_manuali")}
                  placeholder="client1@email.ro&#10;client2@email.ro&#10;client3@email.ro"
                />
              </FormField>
            )}
          </FormSection>

          <FormSection title="Continut email">
            <FormField label="De la (nume afisat)" >
              <Input value={f("trimis_de")} onChange={set("trimis_de")} placeholder="Ex: Echipa Alpha Contabil" />
            </FormField>
            <FormField label="Reply-to (email raspuns)">
              <Input type="email" value={f("reply_to")} onChange={set("reply_to")} placeholder="office@firma.ro" />
            </FormField>
            <FormField label="Subiect email" required full>
              <Input
                value={f("subiect_email")}
                onChange={set("subiect_email")}
                placeholder="Ex: Informare privind actualizarea tarifelor"
              />
            </FormField>
            <FormField label="Continut mesaj" required full>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-slate-50 focus:bg-white resize-none"
                rows={12}
                value={f("continut")}
                onChange={set("continut")}
                placeholder="Scrie mesajul campaniei...&#10;&#10;Poti folosi variabile: {client_denumire}, {firma_contabilitate}, {contabil_responsabil}"
              />
            </FormField>
            <FormField label="" full>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500">
                <p className="font-semibold mb-1">Variabile disponibile pentru personalizare:</p>
                <div className="flex flex-wrap gap-1.5">
                  {["{client_denumire}", "{firma_contabilitate}", "{contabil_responsabil}",
                    "{tarif_total}", "{data_inceput_colaborare}", "{luna}", "{an}"].map(v => (
                    <code key={v} className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-primary-500">{v}</code>
                  ))}
                </div>
              </div>
            </FormField>
          </FormSection>

          <FormSection title="Programare trimitere">
            <FormField label="Data programata">
              <Input type="date" value={f("data_programata")} onChange={set("data_programata")} />
            </FormField>
            <FormField label="Ora programata">
              <Input type="time" value={f("ora_programata")} onChange={set("ora_programata")} />
            </FormField>
            <FormField label="Nota interna (nu se trimite)" full>
              <Input
                value={f("nota_interna")}
                onChange={set("nota_interna")}
                placeholder="Ex: Trimite inainte de 1 ale lunii"
              />
            </FormField>
          </FormSection>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 mt-4">
            <Btn variant="secondary" onClick={() => setModal(null)}>Anuleaza</Btn>
            <Btn variant="secondary" onClick={() => setModal("preview")}>
              Previzualizeaza
            </Btn>
            <Btn onClick={handleSave} disabled={saving}>
              {saving ? "Se salveaza..." : modal === "add" ? "Salveaza campania" : "Actualizeaza"}
            </Btn>
          </div>
        </Modal>
      )}

      {/* ============================================================
          MODAL: PREVIEW EMAIL
          ============================================================ */}
      {modal === "preview" && (
        <Modal title="Previzualizare email" size="lg" onClose={() => setModal("add")}>
          <div className="bg-slate-50 rounded-xl p-4 mb-4">
            <div className="flex gap-2 text-xs text-slate-500 mb-1">
              <span className="font-semibold">De la:</span>
              <span>{form.trimis_de || "Firma contabilitate"}</span>
            </div>
            <div className="flex gap-2 text-xs text-slate-500 mb-1">
              <span className="font-semibold">Subiect:</span>
              <span className="font-medium text-slate-700">{form.subiect_email || "—"}</span>
            </div>
            <div className="flex gap-2 text-xs text-slate-500">
              <span className="font-semibold">Catre:</span>
              <span>{form.segment} ({destinatariCalculati.length || "?"} destinatari)</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
              {form.continut || "Fara continut"}
            </pre>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => setModal("add")}>Inapoi la editare</Btn>
          </div>
        </Modal>
      )}

      {/* ============================================================
          MODAL: VIEW DETALII
          ============================================================ */}
      {modal === "view" && selected && (
        <Modal title={selected.titlu} size="xl" onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-primary-500 uppercase tracking-widest mb-3">Detalii campanie</h4>
              <VInfoRow label="Tip" value={<Badge text={selected.tip} color="indigo" />} />
              <VInfoRow label="Status" value={<Badge text={selected.status} color={statusColor(selected.status)} />} />
              <VInfoRow label="Segment" value={selected.segment} />
              <VInfoRow label="Nr. destinatari" value={selected.nr_destinatari} />
              <VInfoRow label="De la" value={selected.trimis_de} />
              <VInfoRow label="Reply-to" value={selected.reply_to} />
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-primary-500 uppercase tracking-widest mb-3">Programare</h4>
              <VInfoRow label="Data programata" value={selected.data_programata} />
              <VInfoRow label="Ora" value={selected.ora_programata} />
              <VInfoRow label="Data trimitere" value={selected.data_trimitere_efectiva
                ? new Date(selected.data_trimitere_efectiva).toLocaleDateString("ro-RO")
                : null} />
              {selected.nota_interna && (
                <VInfoRow label="Nota interna" value={selected.nota_interna} />
              )}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mb-4">
            <h4 className="text-xs font-bold text-primary-500 uppercase tracking-widest mb-2">Subiect email</h4>
            <p className="text-sm font-semibold text-slate-800">{selected.subiect_email}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
            <h4 className="text-xs font-bold text-primary-500 uppercase tracking-widest mb-3">Continut</h4>
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">
              {selected.continut}
            </pre>
          </div>

          {/* Export lista destinatari */}
          <div className="bg-accent-50 border border-accent-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-accent-700 mb-2">Export lista destinatari</p>
            <p className="text-xs text-accent-600 mb-3">
              Exporta lista de email-uri pentru a o incarca in Brevo, Mailchimp sau alt serviciu de trimitere.
            </p>
            <Btn
              variant="accent"
              size="sm"
              onClick={() => {
                const dest = calculeazaDestinatari(selected.segment, clienti);
                const lines = dest
                  .filter(c => c.persoana_contact_email || c.administrator_email)
                  .map(c => `${c.denumire},${c.persoana_contact_email || c.administrator_email}`)
                  .join("\n");
                const csv = "Denumire,Email\n" + lines;
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `destinatari_${selected.titlu?.replace(/\s+/g, "_")}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Descarca lista CSV
            </Btn>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <Btn variant="danger" size="sm" onClick={() => handleDelete(selected.id)}>Sterge</Btn>
            <div className="flex gap-2">
              {(selected.status === "Draft" || selected.status === "Programata") && (
                <Btn variant="success" onClick={() => { handleMarcheazaTrimisa(selected); setModal(null); }}>
                  Marcheaza trimisa
                </Btn>
              )}
              <Btn onClick={() => openEdit(selected)}>Editeaza</Btn>
            </div>
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
      <span className="text-xs text-slate-400 w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-slate-700 ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
