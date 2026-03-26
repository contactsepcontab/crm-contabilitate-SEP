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

const ROLURI = ["Admin", "Manager", "Contabil", "HR", "Operator"];

const ROL_CONFIG = {
  Admin:    { color: "red",    desc: "Acces total — toate modulele, poate sterge" },
  Manager:  { color: "indigo", desc: "Vede tot, nu poate sterge inregistrari" },
  Contabil: { color: "blue",   desc: "Vede si editeaza clientii proprii" },
  HR:       { color: "orange", desc: "Acces la modulul HR si clienti" },
  Operator: { color: "gray",   desc: "Adauga date, nu poate sterge" },
};

const PERMISIUNI_MODUL = [
  { id: "dashboard",         label: "Dashboard" },
  { id: "firme",             label: "Firme Contabilitate" },
  { id: "clienti",           label: "Clienti Activi" },
  { id: "baza_clienti",      label: "Baza Clienti" },
  { id: "suspendate",        label: "Firme Suspendate" },
  { id: "rezilieri",         label: "Rezilieri" },
  { id: "contracte",         label: "Contracte Emise" },
  { id: "doc_incomplete",    label: "Documente Incomplete" },
  { id: "leaduri",           label: "Lead-uri" },
  { id: "email_marketing",   label: "Email Marketing" },
  { id: "taskuri",           label: "Taskuri" },
  { id: "import",            label: "Import CSV" },
  { id: "utilizatori",       label: "Utilizatori" },
  { id: "setari",            label: "Setari" },
];

const PERMISIUNI_DEFAULT = {
  Admin:    { vede: true, adauga: true, editeaza: true, sterge: true, exporta: true },
  Manager:  { vede: true, adauga: true, editeaza: true, sterge: false, exporta: true },
  Contabil: { vede: true, adauga: true, editeaza: true, sterge: false, exporta: false },
  HR:       { vede: true, adauga: true, editeaza: true, sterge: false, exporta: false },
  Operator: { vede: true, adauga: true, editeaza: false, sterge: false, exporta: false },
};

const EMPTY_FORM = {
  nume: "", email: "", telefon: "",
  rol: "Contabil", activ: true,
  firma_interna: "",
  observatii: "",
};

export default function Utilizatori() {
  const [utilizatori, setUtilizatori] = useState([]);
  const [firme, setFirme] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("utilizatori");

  const reload = async () => {
    setLoading(true);
    try {
      const [uSnap, fSnap] = await Promise.all([
        getDocs(collection(db, "utilizatori")),
        getDocs(collection(db, "firme_contabilitate")),
      ]);
      setUtilizatori(uSnap.docs.map(d => ({ ...d.data(), id: d.id }))
        .sort((a, b) => a.nume?.localeCompare(b.nume)));
      setFirme(fSnap.docs.map(d => ({ ...d.data(), id: d.id })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const openAdd = () => { setForm(EMPTY_FORM); setModal("add"); };
  const openEdit = (u) => { setForm({ ...EMPTY_FORM, ...u }); setSelected(u); setModal("edit"); };
  const openView = (u) => { setSelected(u); setModal("view"); };

  const handleSave = async () => {
    if (!form.nume.trim() || !form.email.trim()) {
      return alert("Numele si email-ul sunt obligatorii!");
    }
    setSaving(true);
    try {
      const data = { ...form, updated_at: serverTimestamp() };
      if (modal === "add") {
        data.created_at = serverTimestamp();
        await addDoc(collection(db, "utilizatori"), data);
      } else {
        await updateDoc(doc(db, "utilizatori", form.id), data);
      }
      await reload();
      setModal(null);
    } catch (e) { alert("Eroare: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Stergi acest utilizator?")) return;
    try {
      await deleteDoc(doc(db, "utilizatori", id));
      await reload();
      if (modal === "view") setModal(null);
    } catch (e) { alert("Eroare: " + e.message); }
  };

  const handleToggleActiv = async (u) => {
    await updateDoc(doc(db, "utilizatori", u.id), {
      activ: !u.activ,
      updated_at: serverTimestamp(),
    });
    await reload();
  };

  const f = (field) => form[field] ?? "";
  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target?.value ?? e }));

  const activi = utilizatori.filter(u => u.activ !== false);
  const inactivi = utilizatori.filter(u => u.activ === false);

  return (
    <div className="p-6">
      <PageHeader
        title="Utilizatori & Drepturi"
        subtitle={`${activi.length} utilizatori activi`}
        action={<Btn onClick={openAdd}>+ Utilizator nou</Btn>}
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6 w-fit">
        {[
          { key: "utilizatori", label: "Utilizatori" },
          { key: "roluri",      label: "Roluri & Permisiuni" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              activeTab === tab.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "utilizatori" && (
        <>
          {loading ? <Loading /> : utilizatori.length === 0 ? (
            <EmptyState title="Nu exista utilizatori" subtitle="Adauga primul utilizator"
              action={<Btn onClick={openAdd}>+ Utilizator nou</Btn>} />
          ) : (
            <div className="space-y-2">
              {utilizatori.map(u => (
                <Card key={u.id} className={`hover:shadow-md transition-shadow ${u.activ === false ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => openView(u)}>
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 font-bold text-sm">
                          {u.nume?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800">{u.nume}</p>
                          <Badge text={u.rol} color={ROL_CONFIG[u.rol]?.color || "gray"} />
                          {u.activ === false && <Badge text="Inactiv" color="gray" />}
                        </div>
                        <div className="flex gap-4 mt-0.5 text-xs text-slate-400 flex-wrap">
                          <span>{u.email}</span>
                          {u.telefon && <span>{u.telefon}</span>}
                          {u.firma_interna && <span>Firma: {u.firma_interna}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-4">
                      <button
                        onClick={() => handleToggleActiv(u)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                          u.activ !== false
                            ? "text-slate-500 border-slate-200 hover:bg-slate-50"
                            : "text-success-400 border-success-200 hover:bg-success-50"
                        }`}>
                        {u.activ !== false ? "Dezactiveaza" : "Activeaza"}
                      </button>
                      <Btn variant="ghost" size="sm" onClick={() => openEdit(u)}>Edit</Btn>
                      <Btn variant="ghost" size="sm" onClick={() => handleDelete(u.id)}>✕</Btn>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "roluri" && (
        <div className="space-y-4">
          {/* Explicatie roluri */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {ROLURI.map(rol => (
              <Card key={rol} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge text={rol} color={ROL_CONFIG[rol]?.color || "gray"} />
                </div>
                <p className="text-xs text-slate-500">{ROL_CONFIG[rol]?.desc}</p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {Object.entries(PERMISIUNI_DEFAULT[rol] || {}).map(([actiune, are]) => (
                    <span key={actiune}
                      className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                        are ? "bg-success-50 text-success-500" : "bg-slate-100 text-slate-400 line-through"
                      }`}>
                      {actiune}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Tabel permisiuni per modul */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-700">Permisiuni per modul</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Aceasta este configuratia implicita. Permisiuni granulare per utilizator vor fi disponibile in versiunile urmatoare.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Modul</th>
                    {ROLURI.map(r => (
                      <th key={r} className="text-center px-3 py-3 font-bold uppercase tracking-wider">
                        <Badge text={r} color={ROL_CONFIG[r]?.color || "gray"} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {PERMISIUNI_MODUL.map(modul => (
                    <tr key={modul.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-700 font-medium">{modul.label}</td>
                      {ROLURI.map(rol => {
                        const p = PERMISIUNI_DEFAULT[rol];
                        const areAcces = p?.vede;
                        const areEdit = p?.editeaza;
                        // Unele module sunt restrictionate
                        const restricted = modul.id === "utilizatori" && rol !== "Admin";
                        const setari = modul.id === "setari" && rol !== "Admin";
                        const niciun = restricted || setari;
                        return (
                          <td key={rol} className="px-3 py-2.5 text-center">
                            {niciun ? (
                              <span className="text-slate-300">—</span>
                            ) : areAcces ? (
                              <span className={`font-bold ${areEdit ? "text-success-400" : "text-accent-400"}`}>
                                {areEdit ? "R/W" : "R"}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex gap-4">
              <span><strong className="text-success-400">R/W</strong> — citire si scriere</span>
              <span><strong className="text-accent-400">R</strong> — doar citire</span>
              <span><strong className="text-slate-400">—</strong> — fara acces</span>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL ADD/EDIT */}
      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? "Utilizator nou" : "Editeaza utilizator"}
          size="md" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <FormSection title="Date personale">
              <FormField label="Nume complet" required full>
                <Input value={f("nume")} onChange={set("nume")} placeholder="Ex: Ion Popescu" />
              </FormField>
              <FormField label="Email" required>
                <Input type="email" value={f("email")} onChange={set("email")} placeholder="ion@firma.ro" />
              </FormField>
              <FormField label="Telefon">
                <Input value={f("telefon")} onChange={set("telefon")} placeholder="07xx xxx xxx" />
              </FormField>
            </FormSection>
            <FormSection title="Rol si acces">
              <FormField label="Rol" required>
                <Select value={f("rol")} onChange={set("rol")}
                  options={ROLURI.map(r => ({ value: r, label: r }))} />
              </FormField>
              <FormField label="Firma interna">
                <Select value={f("firma_interna")} onChange={set("firma_interna")}
                  placeholder="Selecteaza firma"
                  options={firme.map(f => ({ value: f.denumire_scurta || f.denumire, label: f.denumire_scurta || f.denumire }))} />
              </FormField>
              <FormField label="Status" full>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input type="checkbox"
                    checked={form.activ !== false}
                    onChange={e => setForm(p => ({ ...p, activ: e.target.checked }))}
                    className="w-4 h-4 rounded accent-primary-500" />
                  <span className="text-sm text-slate-700">Utilizator activ</span>
                </label>
              </FormField>
            </FormSection>
            {ROL_CONFIG[form.rol] && (
              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
                <span className="font-semibold">Permisiuni rol {form.rol}:</span> {ROL_CONFIG[form.rol].desc}
              </div>
            )}
            <FormSection title="Observatii">
              <FormField label="Observatii" full>
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                  rows={2} value={f("observatii")} onChange={set("observatii")} />
              </FormField>
            </FormSection>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
            <Btn variant="secondary" onClick={() => setModal(null)}>Anuleaza</Btn>
            <Btn onClick={handleSave} disabled={saving}>
              {saving ? "Se salveaza..." : modal === "add" ? "Adauga" : "Salveaza"}
            </Btn>
          </div>
        </Modal>
      )}

      {/* MODAL VIEW */}
      {modal === "view" && selected && (
        <Modal title={selected.nume} size="md" onClose={() => setModal(null)}>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 font-bold text-lg">
                {selected.nume?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex gap-2 flex-wrap">
                <Badge text={selected.rol} color={ROL_CONFIG[selected.rol]?.color || "gray"} />
                <Badge text={selected.activ !== false ? "Activ" : "Inactiv"}
                  color={selected.activ !== false ? "green" : "gray"} />
              </div>
              <p className="text-xs text-slate-400 mt-1">{ROL_CONFIG[selected.rol]?.desc}</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 mb-4">
            <VRow label="Email" value={selected.email} />
            <VRow label="Telefon" value={selected.telefon} />
            <VRow label="Firma interna" value={selected.firma_interna} />
            {selected.observatii && <VRow label="Observatii" value={selected.observatii} />}
          </div>
          <div className="flex justify-between pt-4 border-t border-slate-100">
            <Btn variant="danger" size="sm" onClick={() => handleDelete(selected.id)}>Sterge</Btn>
            <Btn onClick={() => openEdit(selected)}>Editeaza</Btn>
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
