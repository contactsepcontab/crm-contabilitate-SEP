import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { Badge, Modal, FormField, Input, Select, Btn, PageHeader, Loading, Card } from "../components/UI";

// ============================================================
// CONSTANTE
// ============================================================
const PRIORITATE = ["Urgenta", "Inalta", "Normala", "Scazuta"];
const CATEGORIE = [
  "General",
  "Client",
  "Contract",
  "Document",
  "Facturare",
  "Declaratie fiscala",
  "Intern",
  "Altul",
];
const STATUS = ["De facut", "In asteptare", "Facut"];

const PRIORITATE_CONFIG = {
  "Urgenta": { color: "red",    dot: "bg-danger-400",   badge: "red"    },
  "Inalta":  { color: "orange", dot: "bg-warning-400",  badge: "orange" },
  "Normala": { color: "blue",   dot: "bg-accent-400",   badge: "blue"   },
  "Scazuta": { color: "gray",   dot: "bg-slate-300",    badge: "gray"   },
};

const STATUS_CONFIG = {
  "De facut":    { badge: "red",    next: "In asteptare" },
  "In asteptare":{ badge: "yellow", next: "Facut"        },
  "Facut":       { badge: "green",  next: null            },
};

const EMPTY_FORM = {
  titlu: "",
  descriere: "",
  categorie: "General",
  prioritate: "Normala",
  status: "De facut",
  client_asociat: "",
  responsabil: "",
  data_scadenta: "",
  nota_finalizare: "",
};

// ============================================================
// COMPONENTA PRINCIPALA
// ============================================================
export default function Taskuri() {
  const [taskuri, setTaskuri] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  // Filtre
  const [filtruStatus, setFiltruStatus] = useState("activ"); // activ | facut | toate
  const [filtruPrioritate, setFiltruPrioritate] = useState("");
  const [filtruCategorie, setFiltruCategorie] = useState("");
  const [search, setSearch] = useState("");

  // Modal nota finalizare
  const [modalFinaliz, setModalFinaliz] = useState(null);
  const [notaFinaliz, setNotaFinaliz] = useState("");

  const reload = async () => {
    setLoading(true);
    try {
      const [tSnap, cSnap] = await Promise.all([
        getDocs(collection(db, "taskuri")),
        getDocs(collection(db, "clienti")),
      ]);
      const t = tSnap.docs.map(d => ({ ...d.data(), id: d.id }));
      // Sortare: urgente sus, apoi dupa data scadenta
      t.sort((a, b) => {
        const pOrd = { Urgenta: 0, Inalta: 1, Normala: 2, Scazuta: 3 };
        if (a.status === "Facut" && b.status !== "Facut") return 1;
        if (b.status === "Facut" && a.status !== "Facut") return -1;
        const pDiff = (pOrd[a.prioritate] ?? 2) - (pOrd[b.prioritate] ?? 2);
        if (pDiff !== 0) return pDiff;
        if (a.data_scadenta && b.data_scadenta) return a.data_scadenta.localeCompare(b.data_scadenta);
        if (a.data_scadenta) return -1;
        if (b.data_scadenta) return 1;
        return 0;
      });
      setTaskuri(t);
      setClienti(cSnap.docs.map(d => ({ ...d.data(), id: d.id }))
        .sort((a, b) => a.denumire?.localeCompare(b.denumire)));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  // ============================================================
  // FILTRARE
  // ============================================================
  const filtered = taskuri.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      t.titlu?.toLowerCase().includes(q) ||
      t.descriere?.toLowerCase().includes(q) ||
      t.client_asociat?.toLowerCase().includes(q) ||
      t.responsabil?.toLowerCase().includes(q);
    const matchStatus =
      filtruStatus === "toate" ? true :
      filtruStatus === "activ" ? t.status !== "Facut" :
      filtruStatus === "facut" ? t.status === "Facut" : true;
    const matchPrioritate = !filtruPrioritate || t.prioritate === filtruPrioritate;
    const matchCategorie = !filtruCategorie || t.categorie === filtruCategorie;
    return matchSearch && matchStatus && matchPrioritate && matchCategorie;
  });

  // Statistici
  const nrDeFacut = taskuri.filter(t => t.status === "De facut").length;
  const nrAsteptare = taskuri.filter(t => t.status === "In asteptare").length;
  const nrFacute = taskuri.filter(t => t.status === "Facut").length;
  const nrUrgente = taskuri.filter(t => t.prioritate === "Urgenta" && t.status !== "Facut").length;

  // Scadente depasita
  const azi = new Date().toISOString().split("T")[0];
  const nrIntarziate = taskuri.filter(t =>
    t.status !== "Facut" && t.data_scadenta && t.data_scadenta < azi
  ).length;

  // ============================================================
  // ACTIUNI
  // ============================================================
  const openAdd = () => { setForm(EMPTY_FORM); setModal("add"); };
  const openEdit = (t) => { setForm({ ...EMPTY_FORM, ...t }); setSelected(t); setModal("edit"); };
  const openView = (t) => { setSelected(t); setModal("view"); };

  const handleSave = async () => {
    if (!form.titlu.trim()) return alert("Titlul taskului este obligatoriu!");
    setSaving(true);
    try {
      const data = { ...form, updated_at: serverTimestamp() };
      if (modal === "add") {
        data.created_at = serverTimestamp();
        data.data_finalizare = null;
        await addDoc(collection(db, "taskuri"), data);
      } else {
        await updateDoc(doc(db, "taskuri", form.id), data);
      }
      await reload();
      setModal(null);
    } catch (e) { alert("Eroare: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Stergi acest task?")) return;
    try {
      await deleteDoc(doc(db, "taskuri", id));
      await reload();
      if (modal === "view") setModal(null);
    } catch (e) { alert("Eroare: " + e.message); }
  };

  // Avanseaza statusul: De facut → In asteptare → Facut
  const handleAvanseazaStatus = async (task) => {
    const next = STATUS_CONFIG[task.status]?.next;
    if (!next) return;
    if (next === "Facut") {
      setModalFinaliz(task);
      setNotaFinaliz("");
      return;
    }
    try {
      await updateDoc(doc(db, "taskuri", task.id), {
        status: next,
        updated_at: serverTimestamp(),
      });
      await reload();
    } catch (e) { alert("Eroare: " + e.message); }
  };

  const handleFinalizare = async () => {
    if (!modalFinaliz) return;
    try {
      await updateDoc(doc(db, "taskuri", modalFinaliz.id), {
        status: "Facut",
        nota_finalizare: notaFinaliz,
        data_finalizare: new Date().toISOString(),
        updated_at: serverTimestamp(),
      });
      setModalFinaliz(null);
      setNotaFinaliz("");
      await reload();
    } catch (e) { alert("Eroare: " + e.message); }
  };

  // Bifeaza/debifeaza direct din lista
  const handleToggleFacut = async (task) => {
    if (task.status === "Facut") {
      // Redeschide taskul
      await updateDoc(doc(db, "taskuri", task.id), {
        status: "De facut",
        data_finalizare: null,
        updated_at: serverTimestamp(),
      });
      await reload();
    } else {
      setModalFinaliz(task);
      setNotaFinaliz("");
    }
  };

  const f = (field) => form[field] ?? "";
  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target?.value ?? e }));

  const isIntarziat = (task) =>
    task.status !== "Facut" && task.data_scadenta && task.data_scadenta < azi;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="p-6">
      <PageHeader
        title="Taskuri & To-Do"
        subtitle="Gestioneaza sarcinile si urmareste progresul"
        action={<Btn onClick={openAdd}>+ Task nou</Btn>}
      />

      {/* Statistici */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => { setFiltruStatus("activ"); setFiltruPrioritate(""); }}>
          <p className="text-xs text-slate-400 mb-1">De facut</p>
          <p className="text-2xl font-bold text-danger-400">{nrDeFacut}</p>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => { setFiltruStatus("activ"); }}>
          <p className="text-xs text-slate-400 mb-1">In asteptare</p>
          <p className="text-2xl font-bold text-warning-500">{nrAsteptare}</p>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => { setFiltruStatus("facut"); }}>
          <p className="text-xs text-slate-400 mb-1">Finalizate</p>
          <p className="text-2xl font-bold text-success-400">{nrFacute}</p>
        </Card>
        <Card className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${nrUrgente > 0 ? "border-danger-200 bg-danger-50" : ""}`}
          onClick={() => { setFiltruStatus("activ"); setFiltruPrioritate("Urgenta"); }}>
          <p className="text-xs text-slate-400 mb-1">Urgente active</p>
          <p className={`text-2xl font-bold ${nrUrgente > 0 ? "text-danger-400" : "text-slate-300"}`}>{nrUrgente}</p>
        </Card>
        <Card className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${nrIntarziate > 0 ? "border-warning-200 bg-warning-50" : ""}`}
          onClick={() => setFiltruStatus("activ")}>
          <p className="text-xs text-slate-400 mb-1">Intarziate</p>
          <p className={`text-2xl font-bold ${nrIntarziate > 0 ? "text-warning-500" : "text-slate-300"}`}>{nrIntarziate}</p>
        </Card>
      </div>

      {/* Filtre */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cauta task..."
          className="flex-1 min-w-48 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
        />
        {/* Tabs status */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[
            { key: "activ", label: "Active" },
            { key: "facut", label: "Finalizate" },
            { key: "toate", label: "Toate" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFiltruStatus(tab.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                filtruStatus === tab.key
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        <select value={filtruPrioritate} onChange={e => setFiltruPrioritate(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400">
          <option value="">Toate prioritatile</option>
          {PRIORITATE.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filtruCategorie} onChange={e => setFiltruCategorie(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400">
          <option value="">Toate categoriile</option>
          {CATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Lista taskuri */}
      {loading ? <Loading /> : filtered.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-base font-semibold text-slate-600 mb-1">
            {filtruStatus === "facut" ? "Nu exista taskuri finalizate" : "Nu exista taskuri active"}
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            {filtruStatus === "facut" ? "Taskurile bifate ca facute vor aparea aici." : "Adauga primul task."}
          </p>
          {filtruStatus !== "facut" && <Btn onClick={openAdd}>+ Task nou</Btn>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <Card key={task.id}
              className={`transition-all hover:shadow-md ${
                task.status === "Facut" ? "opacity-60" : ""
              } ${isIntarziat(task) ? "border-warning-200" : ""}`}>
              <div className="flex items-center gap-3 p-4">

                {/* Checkbox */}
                <button
                  onClick={() => handleToggleFacut(task)}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    task.status === "Facut"
                      ? "bg-success-400 border-success-400 text-white"
                      : "border-slate-300 hover:border-primary-400"
                  }`}
                >
                  {task.status === "Facut" && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Continut */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openView(task)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Dot prioritate */}
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITATE_CONFIG[task.prioritate]?.dot}`} />
                    <p className={`font-semibold text-slate-800 ${task.status === "Facut" ? "line-through text-slate-400" : ""}`}>
                      {task.titlu}
                    </p>
                    <Badge text={task.prioritate} color={PRIORITATE_CONFIG[task.prioritate]?.badge || "gray"} />
                    <Badge text={task.status} color={STATUS_CONFIG[task.status]?.badge || "gray"} />
                    {task.categorie !== "General" && <Badge text={task.categorie} color="indigo" />}
                    {isIntarziat(task) && <Badge text="Intarziat" color="orange" />}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-slate-400 flex-wrap">
                    {task.client_asociat && <span>Client: <strong className="text-slate-600">{task.client_asociat}</strong></span>}
                    {task.responsabil && <span>Responsabil: {task.responsabil}</span>}
                    {task.data_scadenta && (
                      <span className={isIntarziat(task) ? "text-warning-500 font-semibold" : ""}>
                        Scadent: {task.data_scadenta.split("-").reverse().join(".")}
                      </span>
                    )}
                    {task.status === "Facut" && task.data_finalizare && (
                      <span className="text-success-400">
                        Finalizat: {new Date(task.data_finalizare).toLocaleDateString("ro-RO")}
                      </span>
                    )}
                    {task.descriere && (
                      <span className="truncate max-w-xs text-slate-400">{task.descriere}</span>
                    )}
                  </div>
                </div>

                {/* Actiuni */}
                <div className="flex gap-1 flex-shrink-0 ml-2">
                  {task.status !== "Facut" && STATUS_CONFIG[task.status]?.next && (
                    <button
                      onClick={() => handleAvanseazaStatus(task)}
                      className="text-xs px-2 py-1 rounded-lg bg-slate-100 hover:bg-primary-50 hover:text-primary-600 text-slate-500 font-medium transition-colors"
                    >
                      {STATUS_CONFIG[task.status].next === "Facut" ? "Marcheaza facut" : "In asteptare"}
                    </button>
                  )}
                  <Btn variant="ghost" size="sm" onClick={() => openEdit(task)}>Edit</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => handleDelete(task.id)}>✕</Btn>
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
          title={modal === "add" ? "Task nou" : "Editeaza task"}
          size="md"
          onClose={() => setModal(null)}
        >
          <div className="space-y-3">
            <FormField label="Titlu task" required>
              <Input
                value={f("titlu")}
                onChange={set("titlu")}
                placeholder="Ex: Trimite declaratia 112 pentru client X"
                autoFocus
              />
            </FormField>
            <FormField label="Descriere / detalii">
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-slate-50 focus:bg-white resize-none"
                rows={3}
                value={f("descriere")}
                onChange={set("descriere")}
                placeholder="Detalii suplimentare..."
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Prioritate">
                <Select
                  value={f("prioritate")}
                  onChange={set("prioritate")}
                  options={PRIORITATE.map(p => ({ value: p, label: p }))}
                />
              </FormField>
              <FormField label="Status">
                <Select
                  value={f("status")}
                  onChange={set("status")}
                  options={STATUS.map(s => ({ value: s, label: s }))}
                />
              </FormField>
              <FormField label="Categorie">
                <Select
                  value={f("categorie")}
                  onChange={set("categorie")}
                  options={CATEGORIE.map(c => ({ value: c, label: c }))}
                />
              </FormField>
              <FormField label="Data scadenta">
                <Input type="date" value={f("data_scadenta")} onChange={set("data_scadenta")} />
              </FormField>
            </div>

            <FormField label="Client asociat (optional)">
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={f("client_asociat")}
                onChange={set("client_asociat")}
              >
                <option value="">Fara client asociat</option>
                {clienti.map(c => (
                  <option key={c.id} value={c.denumire}>{c.denumire} — {c.cui}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Responsabil">
              <Input
                value={f("responsabil")}
                onChange={set("responsabil")}
                placeholder="Ex: Ion Popescu"
              />
            </FormField>

            {f("status") === "Facut" && (
              <FormField label="Nota finalizare">
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-slate-50 focus:bg-white resize-none"
                  rows={2}
                  value={f("nota_finalizare")}
                  onChange={set("nota_finalizare")}
                  placeholder="Ce s-a facut, cum s-a rezolvat..."
                />
              </FormField>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
            <Btn variant="secondary" onClick={() => setModal(null)}>Anuleaza</Btn>
            <Btn onClick={handleSave} disabled={saving}>
              {saving ? "Se salveaza..." : modal === "add" ? "Adauga" : "Salveaza"}
            </Btn>
          </div>
        </Modal>
      )}

      {/* ============================================================
          MODAL: VIEW DETALII
          ============================================================ */}
      {modal === "view" && selected && (
        <Modal title={selected.titlu} size="md" onClose={() => setModal(null)}>
          <div className="space-y-3">
            {/* Status + prioritate */}
            <div className="flex gap-2 flex-wrap">
              <Badge text={selected.status} color={STATUS_CONFIG[selected.status]?.badge || "gray"} />
              <Badge text={selected.prioritate} color={PRIORITATE_CONFIG[selected.prioritate]?.badge || "gray"} />
              {selected.categorie !== "General" && <Badge text={selected.categorie} color="indigo" />}
              {isIntarziat(selected) && <Badge text="Intarziat" color="orange" />}
            </div>

            {/* Detalii */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              {selected.descriere && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Descriere</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.descriere}</p>
                </div>
              )}
              {selected.client_asociat && (
                <VRow label="Client" value={selected.client_asociat} />
              )}
              {selected.responsabil && (
                <VRow label="Responsabil" value={selected.responsabil} />
              )}
              {selected.data_scadenta && (
                <VRow label="Data scadenta"
                  value={
                    <span className={isIntarziat(selected) ? "text-warning-500 font-semibold" : ""}>
                      {selected.data_scadenta.split("-").reverse().join(".")}
                    </span>
                  }
                />
              )}
              {selected.status === "Facut" && selected.data_finalizare && (
                <VRow label="Finalizat la"
                  value={new Date(selected.data_finalizare).toLocaleDateString("ro-RO", {
                    day: "2-digit", month: "long", year: "numeric",
                    hour: "2-digit", minute: "2-digit"
                  })}
                />
              )}
            </div>

            {/* Nota finalizare */}
            {selected.nota_finalizare && (
              <div className="bg-success-50 border border-success-200 rounded-xl p-4">
                <p className="text-xs font-bold text-success-500 uppercase tracking-wide mb-1">Nota finalizare</p>
                <p className="text-sm text-success-500 whitespace-pre-wrap">{selected.nota_finalizare}</p>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-5 pt-4 border-t border-slate-100">
            <Btn variant="danger" size="sm" onClick={() => handleDelete(selected.id)}>Sterge</Btn>
            <div className="flex gap-2">
              {selected.status !== "Facut" && (
                <Btn variant="success" onClick={() => {
                  setModalFinaliz(selected);
                  setNotaFinaliz("");
                  setModal(null);
                }}>
                  Marcheaza facut
                </Btn>
              )}
              <Btn onClick={() => openEdit(selected)}>Editeaza</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================
          MODAL: NOTA FINALIZARE
          ============================================================ */}
      {modalFinaliz && (
        <Modal title="Finalizeaza task" size="sm" onClose={() => setModalFinaliz(null)}>
          <p className="text-sm font-semibold text-slate-800 mb-4">{modalFinaliz.titlu}</p>
          <FormField label="Nota finalizare (optional)">
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-slate-50 focus:bg-white resize-none"
              rows={4}
              value={notaFinaliz}
              onChange={e => setNotaFinaliz(e.target.value)}
              placeholder="Ce s-a facut, cum s-a rezolvat, orice detaliu util pentru referinta ulterioara..."
              autoFocus
            />
          </FormField>
          <p className="text-xs text-slate-400 mt-2">
            Nota se salveaza permanent si poate fi consultata oricand din istoricul taskului.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => setModalFinaliz(null)}>Anuleaza</Btn>
            <Btn variant="success" onClick={handleFinalizare}>
              Marcheaza ca facut
            </Btn>
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
