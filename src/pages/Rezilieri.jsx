import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Badge, Modal, FormSection, FormField, Input, Select, Btn,
  PageHeader, EmptyState, Loading, Card
} from "../components/UI";

const TIP_SITUATIE = [
  "Reziliere definitiva",
  "Suspendare servicii - neplata",
  "Suspendare servicii - alta cauza",
];

const STATUS_REZILIERE = ["In curs", "Finalizata", "Reluat"];

const MOTIV_REZILIERE = [
  "La cererea clientului",
  "Neplata",
  "Inchidere firma",
  "Suspendare firma ONRC",
  "Alt motiv",
];

const EMPTY_FORM = {
  client_id: "",
  client_denumire: "",
  client_cui: "",
  firma_contabilitate_id: "",
  firma_contabilitate_denumire: "",
  contract_id: "",
  tip_situatie: "Reziliere definitiva",
  motiv: "La cererea clientului",
  motiv_detaliat: "",
  suma_restanta: "",
  data_notificare: "",
  data_reziliere: "",
  data_suspendare_servicii: "",
  data_reluare_servicii: "",
  ultima_luna_lucrata: "",
  ultima_luna_facturata: "",
  status: "In curs",
  observatii: "",
};

export default function Rezilieri() {
  const [rezilieri, setRezilieri] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [firme, setFirme] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtruTip, setFiltruTip] = useState("Toate");
  const [filtruStatus, setFiltruStatus] = useState("Toate");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const [rSnap, cSnap, fSnap] = await Promise.all([
        getDocs(collection(db, "rezilieri")),
        getDocs(collection(db, "clienti")),
        getDocs(collection(db, "firme_contabilitate")),
      ]);
      setRezilieri(rSnap.docs.map(d => ({ ...d.data(), id: d.id }))
        .sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)));
      setClienti(cSnap.docs.map(d => ({ ...d.data(), id: d.id }))
        .sort((a, b) => a.denumire?.localeCompare(b.denumire)));
      setFirme(fSnap.docs.map(d => ({ ...d.data(), id: d.id })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const filtered = rezilieri.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.client_denumire?.toLowerCase().includes(q) ||
      r.client_cui?.includes(q);
    const matchTip = filtruTip === "Toate" || r.tip_situatie === filtruTip;
    const matchStatus = filtruStatus === "Toate" || r.status === filtruStatus;
    return matchSearch && matchTip && matchStatus;
  });

  const openAdd = () => { setForm(EMPTY_FORM); setModal("add"); };
  const openEdit = (r) => { setForm({ ...EMPTY_FORM, ...r }); setSelected(r); setModal("edit"); };
  const openView = (r) => { setSelected(r); setModal("view"); };

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
    if (!form.client_id) return alert("Selectează un client!");
    setSaving(true);
    try {
      const data = { ...form, updated_at: serverTimestamp() };
      if (modal === "add") {
        data.created_at = serverTimestamp();
        await addDoc(collection(db, "rezilieri"), data);
        // Dacă e reziliere definitivă, actualizăm statusul clientului
        if (form.tip_situatie === "Reziliere definitiva") {
          await updateDoc(doc(db, "clienti", form.client_id), {
            status_client: "Reziliat",
            data_sfarsit_colaborare: form.data_reziliere || "",
            updated_at: serverTimestamp(),
          });
        }
      } else {
        await updateDoc(doc(db, "rezilieri", form.id), data);
        // Dacă s-a reluat, actualizăm clientul la activ
        if (form.status === "Reluat" && form.tip_situatie !== "Reziliere definitiva") {
          await updateDoc(doc(db, "clienti", form.client_id), {
            status_client: "Activ",
            updated_at: serverTimestamp(),
          });
        }
      }
      await reload();
      setModal(null);
    } catch (e) { alert("Eroare: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sigur vrei să ștergi această înregistrare?")) return;
    try {
      await deleteDoc(doc(db, "rezilieri", id));
      await reload();
      if (modal === "view") setModal(null);
    } catch (e) { alert("Eroare: " + e.message); }
  };

  const handleReluare = async (rez) => {
    if (!window.confirm(`Confirmă reluarea serviciilor pentru ${rez.client_denumire}?`)) return;
    try {
      const azi = new Date().toISOString().split("T")[0];
      await updateDoc(doc(db, "rezilieri", rez.id), {
        status: "Reluat",
        data_reluare_servicii: azi,
        updated_at: serverTimestamp(),
      });
      await updateDoc(doc(db, "clienti", rez.client_id), {
        status_client: "Activ",
        updated_at: serverTimestamp(),
      });
      await reload();
    } catch (e) { alert("Eroare: " + e.message); }
  };

  const f = (field) => form[field] ?? "";
  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target?.value ?? e }));

  const tipColor = (tip) => {
    if (tip === "Reziliere definitiva") return "red";
    if (tip?.includes("neplata")) return "orange";
    return "yellow";
  };

  const statusColor = (s) => ({
    "In curs": "yellow",
    "Finalizata": "red",
    "Reluat": "green",
  }[s] || "gray");

  return (
    <div className="p-6">
      <PageHeader
        title="Rezilieri & Suspendări Servicii"
        subtitle={`${rezilieri.length} înregistrare${rezilieri.length !== 1 ? "i" : ""} totale`}
        action={<Btn onClick={openAdd}>+ Adaugă</Btn>}
      />

      {/* Filtre */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Caută după client sau CUI..."
          className="flex-1 min-w-64 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
        <select
          value={filtruTip}
          onChange={e => setFiltruTip(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="Toate">Toate tipurile</option>
          {TIP_SITUATIE.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex gap-1">
          {["Toate", ...STATUS_REZILIERE].map(s => (
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
        <EmptyState
          title="Nu există înregistrări"
          subtitle="Adaugă prima reziliere sau suspendare de servicii"
          action={<Btn onClick={openAdd}>+ Adaugă</Btn>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(rez => (
            <Card key={rez.id} className="hover:shadow-md transition-shadow">
              <div className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openView(rez)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">{rez.client_denumire}</h3>
                    <Badge text={rez.tip_situatie} color={tipColor(rez.tip_situatie)} />
                    <Badge text={rez.status} color={statusColor(rez.status)} />
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                    <span>CUI: <strong>{rez.client_cui}</strong></span>
                    {rez.firma_contabilitate_denumire && (
                      <span>Firma: {rez.firma_contabilitate_denumire}</span>
                    )}
                    {rez.ultima_luna_lucrata && (
                      <span>Ultima lună: <strong>{rez.ultima_luna_lucrata}</strong></span>
                    )}
                    {rez.suma_restanta && (
                      <span className="text-red-600 font-semibold">Restant: {rez.suma_restanta} RON</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 ml-4 flex-shrink-0">
                  {rez.tip_situatie !== "Reziliere definitiva" && rez.status === "In curs" && (
                    <Btn variant="success" size="sm" onClick={() => handleReluare(rez)}>
                      Reia servicii
                    </Btn>
                  )}
                  <Btn variant="ghost" size="sm" onClick={() => openEdit(rez)}>Editează</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => handleDelete(rez.id)}>Șterge</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL: ADD / EDIT */}
      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Adaugă Reziliere / Suspendare" : "Editează"}
          size="lg"
          onClose={() => setModal(null)}
        >
          <FormSection title="Client si tip situatie">
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
            <FormField label="Tip situatie" required>
              <Select
                value={f("tip_situatie")}
                onChange={set("tip_situatie")}
                options={TIP_SITUATIE.map(t => ({ value: t, label: t }))}
              />
            </FormField>
            <FormField label="Motiv">
              <Select
                value={f("motiv")}
                onChange={set("motiv")}
                options={MOTIV_REZILIERE.map(m => ({ value: m, label: m }))}
              />
            </FormField>
            <FormField label="Detalii motiv" full>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                rows={2}
                value={f("motiv_detaliat")}
                onChange={set("motiv_detaliat")}
                placeholder="Detalii suplimentare..."
              />
            </FormField>
          </FormSection>

          {form.tip_situatie?.includes("neplata") && (
            <FormSection title="Detalii neplata">
              <FormField label="Suma restanta (RON)">
                <Input type="number" value={f("suma_restanta")} onChange={set("suma_restanta")} placeholder="0" />
              </FormField>
              <FormField label="Data suspendare servicii">
                <Input type="date" value={f("data_suspendare_servicii")} onChange={set("data_suspendare_servicii")} />
              </FormField>
              <FormField label="Data reluare servicii">
                <Input type="date" value={f("data_reluare_servicii")} onChange={set("data_reluare_servicii")} />
              </FormField>
            </FormSection>
          )}

          {form.tip_situatie === "Suspendare servicii - alta cauza" && (
            <FormSection title="Detalii suspendare">
              <FormField label="Data suspendare servicii">
                <Input type="date" value={f("data_suspendare_servicii")} onChange={set("data_suspendare_servicii")} />
              </FormField>
              <FormField label="Data reluare servicii">
                <Input type="date" value={f("data_reluare_servicii")} onChange={set("data_reluare_servicii")} />
              </FormField>
            </FormSection>
          )}

          <FormSection title="Date reziliere / ultima luna">
            {form.tip_situatie === "Reziliere definitiva" && (
              <>
                <FormField label="Data notificare">
                  <Input type="date" value={f("data_notificare")} onChange={set("data_notificare")} />
                </FormField>
                <FormField label="Data reziliere">
                  <Input type="date" value={f("data_reziliere")} onChange={set("data_reziliere")} />
                </FormField>
              </>
            )}
            <FormField label="Ultima luna lucrata">
              <Input value={f("ultima_luna_lucrata")} onChange={set("ultima_luna_lucrata")} placeholder="Ex: Decembrie 2024" />
            </FormField>
            <FormField label="Ultima luna facturata">
              <Input value={f("ultima_luna_facturata")} onChange={set("ultima_luna_facturata")} placeholder="Ex: Decembrie 2024" />
            </FormField>
            <FormField label="Status">
              <Select
                value={f("status")}
                onChange={set("status")}
                options={STATUS_REZILIERE.map(s => ({ value: s, label: s }))}
              />
            </FormField>
          </FormSection>

          <FormSection title="Observatii">
            <FormField label="Observatii" full>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                rows={3}
                value={f("observatii")}
                onChange={set("observatii")}
              />
            </FormField>
          </FormSection>

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
        <Modal title={selected.client_denumire} size="lg" onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">Identificare</h4>
              <InfoRow label="Client" value={selected.client_denumire} bold />
              <InfoRow label="CUI" value={selected.client_cui} />
              <InfoRow label="Firma contabilitate" value={selected.firma_contabilitate_denumire} />
              <InfoRow label="Tip situatie" value={<Badge text={selected.tip_situatie} color={tipColor(selected.tip_situatie)} />} />
              <InfoRow label="Status" value={<Badge text={selected.status} color={statusColor(selected.status)} />} />
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">Date cronologice</h4>
              <InfoRow label="Data notificare" value={selected.data_notificare} />
              <InfoRow label="Data reziliere" value={selected.data_reziliere} />
              <InfoRow label="Susp. servicii" value={selected.data_suspendare_servicii} />
              <InfoRow label="Reluare servicii" value={selected.data_reluare_servicii} />
              <InfoRow label="Ultima luna lucrata" value={selected.ultima_luna_lucrata} />
              <InfoRow label="Ultima luna facturata" value={selected.ultima_luna_facturata} />
            </div>
          </div>
          {(selected.suma_restanta || selected.motiv_detaliat || selected.observatii) && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">Detalii</h4>
              {selected.suma_restanta && (
                <InfoRow label="Suma restanta" value={<span className="font-bold text-red-600">{selected.suma_restanta} RON</span>} />
              )}
              <InfoRow label="Motiv" value={selected.motiv} />
              {selected.motiv_detaliat && <InfoRow label="Detalii" value={selected.motiv_detaliat} />}
              {selected.observatii && <InfoRow label="Observatii" value={selected.observatii} />}
            </div>
          )}
          <div className="flex justify-between mt-5 pt-4 border-t border-gray-100">
            <Btn variant="danger" size="sm" onClick={() => handleDelete(selected.id)}>Șterge</Btn>
            <div className="flex gap-2">
              {selected.tip_situatie !== "Reziliere definitiva" && selected.status === "In curs" && (
                <Btn variant="success" onClick={() => { handleReluare(selected); setModal(null); }}>
                  Reia servicii
                </Btn>
              )}
              <Btn onClick={() => openEdit(selected)}>Editează</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InfoRow({ label, value, bold }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-800 ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
