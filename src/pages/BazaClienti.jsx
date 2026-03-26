import { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Badge, statusClientColor, Loading, Card, PageHeader, Btn } from "../components/UI";

const STATUS_CLIENT = ["Activ", "Suspendat", "Reziliat", "Prospect"];
const VECTORI_FISCALI = ["Lunar", "Trimestrial", "Semestrial", "Anual", "Nu are"];
const TIP_ENTITATE_VALIDE = ["SRL","SA","SNC","SCS","RA","PFA","II","IF","ONG","Asociatie","Fundatie","Sindicat","Altul"];

// ============================================================
// UTILITARE CSV
// ============================================================

const parseBool = (val) => {
  if (!val) return false;
  return ["da","true","1","yes"].includes(String(val).toLowerCase().trim());
};

const boolToStr = (val) => val ? "da" : "nu";

// Accepta DD.MM.YYYY sau YYYY-MM-DD → stocheaza YYYY-MM-DD
const parseData = (val) => {
  if (!val || !val.trim()) return "";
  const v = val.trim();
  const ddmmyyyy = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ddmmyyyy) {
    const [, zi, luna, an] = ddmmyyyy;
    return `${an}-${luna.padStart(2,"0")}-${zi.padStart(2,"0")}`;
  }
  if (v.match(/^\d{4}-\d{2}-\d{2}$/)) return v;
  return v;
};

// Parseaza un rand CSV tinand cont de ghilimele
const parseRandCSV = (line) => {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { values.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  values.push(current.trim());
  return values;
};

// Escapare camp CSV (ghilimele daca are virgula sau newline)
const escapeCSV = (val) => {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
};

// Coloanele exportate — in ordinea logica
const COLOANE_EXPORT = [
  // Identificare
  { key: "denumire",                    label: "Denumire" },
  { key: "tip_entitate",                label: "Tip entitate" },
  { key: "cui",                         label: "CUI" },
  { key: "nr_reg_com",                  label: "Nr. Reg. Com." },
  { key: "status_client",              label: "Status client" },
  // Firma & responsabili
  { key: "firma_contabilitate_denumire",label: "Firma contabilitate" },
  { key: "contabil_responsabil",        label: "Contabil responsabil" },
  { key: "manager_responsabil",         label: "Manager responsabil" },
  { key: "data_inceput_colaborare",     label: "Data inceput colaborare" },
  // Contract
  { key: "_nr_contract",                label: "Nr. contract" },
  { key: "_data_contract",              label: "Data contract" },
  { key: "_tip_contract",               label: "Tip contract" },
  { key: "_tarif_contract",             label: "Tarif contract" },
  { key: "_moneda_contract",            label: "Moneda contract" },
  { key: "_periodicitate",              label: "Periodicitate facturare" },
  // Servicii
  { key: "serviciu_contabilitate",      label: "Contabilitate", bool: true },
  { key: "serviciu_hr",                 label: "HR", bool: true },
  { key: "serviciu_bilant",             label: "Bilant", bool: true },
  { key: "serviciu_consultanta",        label: "Consultanta", bool: true },
  { key: "serviciu_revisal",            label: "Revisal", bool: true },
  { key: "serviciu_salarizare",         label: "Salarizare", bool: true },
  // Tarifare (din client)
  { key: "tarif_contabilitate",         label: "Tarif contabilitate" },
  { key: "tarif_hr",                    label: "Tarif HR" },
  { key: "tarif_bilant",                label: "Tarif bilant" },
  { key: "tarif_total",                 label: "Tarif total" },
  { key: "moneda",                      label: "Moneda" },
  // Fiscal
  { key: "platitor_tva",                label: "Platitor TVA", bool: true },
  { key: "cod_tva",                     label: "Cod TVA" },
  { key: "vector_fiscal",               label: "Vector fiscal" },
  { key: "cui_intracomunitar",          label: "CUI intracomunitar", bool: true },
  { key: "punct_lucru",                 label: "Punct lucru", bool: true },
  { key: "nr_puncte_lucru",             label: "Nr. puncte lucru" },
  { key: "firma_suspendata",            label: "Firma suspendata", bool: true },
  { key: "data_suspendare",             label: "Data suspendare" },
  { key: "data_reactivare",             label: "Data reactivare" },
  { key: "salariati",                   label: "Salariati", bool: true },
  { key: "nr_salariati",                label: "Nr. salariati" },
  { key: "token",                       label: "Token" },
  { key: "procura",                     label: "Procura", bool: true },
  { key: "semnatura_digitala",          label: "Semnatura digitala", bool: true },
  { key: "casa_marcat",                 label: "Casa marcat", bool: true },
  { key: "cod_caen_principal",          label: "Cod CAEN principal" },
  { key: "activitate_principala",       label: "Activitate principala" },
  // Adresa
  { key: "judet",                       label: "Judet" },
  { key: "localitate",                  label: "Localitate" },
  { key: "strada",                      label: "Strada" },
  { key: "numar",                       label: "Numar" },
  // Contact
  { key: "administrator_nume",          label: "Administrator" },
  { key: "administrator_telefon",       label: "Tel. administrator" },
  { key: "administrator_email",         label: "Email administrator" },
  { key: "persoana_contact_nume",       label: "Persoana contact" },
  { key: "persoana_contact_telefon",    label: "Tel. contact" },
  { key: "persoana_contact_email",      label: "Email contact" },
  // Banca
  { key: "cont_bancar_principal",       label: "IBAN" },
  { key: "banca_principala",            label: "Banca" },
  // Observatii
  { key: "observatii_generale",         label: "Observatii" },
];

// ============================================================
// COMPONENTA PRINCIPALA
// ============================================================
export default function BazaClienti() {
  const [clienti, setClienti] = useState([]);
  const [contracte, setContracte] = useState([]);
  const [firme, setFirme] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtre
  const [search, setSearch] = useState("");
  const [filtruStatus, setFiltruStatus] = useState("");
  const [filtruFirma, setFiltruFirma] = useState("");
  const [filtruTVA, setFiltruTVA] = useState("");
  const [filtruVector, setFiltruVector] = useState("");
  const [filtruPunctLucru, setFiltruPunctLucru] = useState("");
  const [filtruCUIIntra, setFiltruCUIIntra] = useState("");
  const [filtruProcura, setFiltruProcura] = useState("");
  const [filtruServicii, setFiltruServicii] = useState("");
  const [filtruPeriodicitate, setFiltruPeriodicitate] = useState("");
  const [showFiltre, setShowFiltre] = useState(false);

  // Import
  const [showImport, setShowImport] = useState(false);
  const [importStep, setImportStep] = useState("upload"); // upload | preview | importing | done
  const [importData, setImportData] = useState(null);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, errors: [] });
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const reload = async () => {
    setLoading(true);
    try {
      const [cSnap, ctrSnap, fSnap] = await Promise.all([
        getDocs(collection(db, "clienti")),
        getDocs(collection(db, "contracte")),
        getDocs(collection(db, "firme_contabilitate")),
      ]);
      setClienti(cSnap.docs.map(d => ({ ...d.data(), id: d.id }))
        .sort((a, b) => a.denumire?.localeCompare(b.denumire)));
      setContracte(ctrSnap.docs.map(d => ({ ...d.data(), id: d.id })));
      setFirme(fSnap.docs.map(d => ({ ...d.data(), id: d.id })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  // Date imbogatite cu contracte
  const clientiCuContracte = clienti.map(c => {
    const ctrActive = contracte.filter(ctr => ctr.client_id === c.id && ctr.status_contract === "Activ");
    const ctr = ctrActive[0] || null;
    return {
      ...c,
      _nr_contract: ctr?.numar_contract || "",
      _data_contract: ctr?.data_contract || "",
      _tip_contract: ctr?.tip_contract || "",
      _tarif_contract: ctr?.tarif || "",
      _moneda_contract: ctr?.moneda || "RON",
      _periodicitate: ctr?.periodicitate_facturare || "",
    };
  });

  // ============================================================
  // FILTRARE
  // ============================================================
  const filtered = clientiCuContracte.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.denumire?.toLowerCase().includes(q) ||
      c.cui?.includes(q) ||
      c.contabil_responsabil?.toLowerCase().includes(q) ||
      c._nr_contract?.toLowerCase().includes(q) ||
      c.firma_contabilitate_denumire?.toLowerCase().includes(q);
    const matchStatus = !filtruStatus || c.status_client === filtruStatus;
    const matchFirma = !filtruFirma || c.firma_contabilitate_id === filtruFirma;
    const matchTVA = !filtruTVA || (filtruTVA === "da" ? c.platitor_tva : !c.platitor_tva);
    const matchVector = !filtruVector || c.vector_fiscal === filtruVector;
    const matchPunctLucru = !filtruPunctLucru || (filtruPunctLucru === "da" ? c.punct_lucru : !c.punct_lucru);
    const matchCUIIntra = !filtruCUIIntra || (filtruCUIIntra === "da" ? c.cui_intracomunitar : !c.cui_intracomunitar);
    const matchProcura = !filtruProcura || (filtruProcura === "da" ? c.procura : !c.procura);
    const matchPeriodicitate = !filtruPeriodicitate || c._periodicitate === filtruPeriodicitate;
    let matchServicii = true;
    if (filtruServicii === "contabilitate") matchServicii = c.serviciu_contabilitate;
    else if (filtruServicii === "bilant") matchServicii = c.serviciu_bilant && !c.serviciu_contabilitate;
    else if (filtruServicii === "contab_bilant") matchServicii = c.serviciu_contabilitate && c.serviciu_bilant;
    else if (filtruServicii === "hr") matchServicii = c.serviciu_hr;
    return matchSearch && matchStatus && matchFirma && matchTVA && matchVector &&
      matchPunctLucru && matchCUIIntra && matchProcura && matchServicii && matchPeriodicitate;
  });

  const resetFiltre = () => {
    setSearch(""); setFiltruStatus(""); setFiltruFirma(""); setFiltruTVA("");
    setFiltruVector(""); setFiltruPunctLucru(""); setFiltruCUIIntra("");
    setFiltruProcura(""); setFiltruServicii(""); setFiltruPeriodicitate("");
  };

  const nrFiltreActive = [filtruStatus, filtruFirma, filtruTVA, filtruVector,
    filtruPunctLucru, filtruCUIIntra, filtruProcura, filtruServicii, filtruPeriodicitate]
    .filter(Boolean).length;

  // ============================================================
  // EXPORT CSV
  // ============================================================
  const handleExport = () => {
    const header = COLOANE_EXPORT.map(c => escapeCSV(c.label)).join(",");
    const rows = filtered.map(client =>
      COLOANE_EXPORT.map(col => {
        const val = client[col.key];
        if (col.bool) return boolToStr(val);
        return escapeCSV(val ?? "");
      }).join(",")
    );
    const csv = "\uFEFF" + header + "\n" + rows.join("\n"); // BOM pentru Excel
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const azi = new Date().toISOString().split("T")[0];
    a.download = `clienti_export_${azi}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDescarcaTemplate = () => {
    const header = COLOANE_EXPORT.map(c => escapeCSV(c.label)).join(",");
    const exemplu = COLOANE_EXPORT.map(col => {
      const exemple = {
        "Denumire": "SC Exemplu SRL",
        "Tip entitate": "SRL",
        "CUI": "RO12345678",
        "Nr. Reg. Com.": "J05/123/2020",
        "Status client": "Activ",
        "Firma contabilitate": "Alpha Contabil",
        "Contabil responsabil": "Ion Popescu",
        "Data inceput colaborare": "01.01.2022",
        "Nr. contract": "CTR-001/2022",
        "Data contract": "01.01.2022",
        "Tip contract": "Contabilitate",
        "Tarif contract": "500",
        "Moneda contract": "RON",
        "Periodicitate facturare": "Lunar",
        "Contabilitate": "da",
        "HR": "nu",
        "Bilant": "da",
        "Tarif total": "500",
        "Moneda": "RON",
        "Platitor TVA": "da",
        "Vector fiscal": "Lunar",
        "Judet": "Cluj",
        "Localitate": "Cluj-Napoca",
        "Administrator": "Maria Ionescu",
        "Tel. contact": "0722111222",
        "Email contact": "office@exemplu.ro",
      };
      return escapeCSV(exemple[col.label] ?? "");
    }).join(",");
    const csv = "\uFEFF" + header + "\n" + exemplu + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clienti_template_import.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================
  // IMPORT CSV
  // ============================================================
  const handleFisier = async (file) => {
    if (!file) return;
    if (!file.name.endsWith(".csv")) { alert("Te rog incarca un fisier .csv"); return; }
    try {
      const text = await file.text();
      const lines = text.trim().split("\n").filter(Boolean);
      if (lines.length < 2) { alert("Fisierul CSV este gol sau are doar header."); return; }

      const headers = parseRandCSV(lines[0]).map(h => h.replace(/^\uFEFF/, "").trim());
      const rows = lines.slice(1).map((line, idx) => {
        const values = parseRandCSV(line);
        const obj = { _row: idx + 2, _errors: [], _warnings: [] };
        headers.forEach((h, i) => { obj[h] = values[i]?.trim() ?? ""; });
        return obj;
      });

      // Validare
      const rowsValidate = rows.map(row => {
        const errors = [];
        const warnings = [];
        const denumire = row["Denumire"] || row["denumire"];
        const cui = row["CUI"] || row["cui"];
        if (!denumire) errors.push("Denumirea lipseste");
        if (!cui) errors.push("CUI-ul lipseste");
        const firmaNume = row["Firma contabilitate"] || row["firma_contabilitate_denumire"];
        if (firmaNume) {
          const gasit = firme.find(f =>
            f.denumire?.toLowerCase().includes(firmaNume.toLowerCase()) ||
            f.denumire_scurta?.toLowerCase().includes(firmaNume.toLowerCase())
          );
          if (!gasit) warnings.push(`Firma "${firmaNume}" nu a fost gasita — va fi salvata ca text`);
        }
        return { ...row, _errors: errors, _warnings: warnings };
      });

      setImportData({ headers, rows: rowsValidate });
      setImportStep("preview");
    } catch (e) { alert("Eroare la citirea fisierului: " + e.message); }
  };

  const transformRandImport = (row) => {
    // Accepta atat headere in romana (din template) cat si in engleza (din export)
    const g = (...keys) => {
      for (const k of keys) { if (row[k] !== undefined && row[k] !== "") return row[k]; }
      return "";
    };

    const firmaNume = g("Firma contabilitate", "firma_contabilitate_denumire");
    const firmaGasita = firmaNume
      ? firme.find(f =>
          f.denumire?.toLowerCase().includes(firmaNume.toLowerCase()) ||
          f.denumire_scurta?.toLowerCase().includes(firmaNume.toLowerCase())
        )
      : null;

    return {
      denumire: g("Denumire", "denumire"),
      tip_entitate: TIP_ENTITATE_VALIDE.includes(g("Tip entitate", "tip_entitate"))
        ? g("Tip entitate", "tip_entitate") : "SRL",
      cui: g("CUI", "cui"),
      nr_reg_com: g("Nr. Reg. Com.", "nr_reg_com"),
      status_client: STATUS_CLIENT.includes(g("Status client", "status_client"))
        ? g("Status client", "status_client") : "Activ",
      firma_contabilitate_id: firmaGasita?.id || "",
      firma_contabilitate_denumire: firmaGasita?.denumire_scurta || firmaGasita?.denumire || firmaNume || "",
      contabil_responsabil: g("Contabil responsabil", "contabil_responsabil"),
      manager_responsabil: g("Manager responsabil", "manager_responsabil"),
      data_inceput_colaborare: parseData(g("Data inceput colaborare", "data_inceput_colaborare")),
      // Fiscal
      platitor_tva: parseBool(g("Platitor TVA", "platitor_tva")),
      cod_tva: g("Cod TVA", "cod_tva"),
      vector_fiscal: VECTORI_FISCALI.includes(g("Vector fiscal", "vector_fiscal"))
        ? g("Vector fiscal", "vector_fiscal") : "Lunar",
      cui_intracomunitar: parseBool(g("CUI intracomunitar", "cui_intracomunitar")),
      punct_lucru: parseBool(g("Punct lucru", "punct_lucru")),
      nr_puncte_lucru: g("Nr. puncte lucru", "nr_puncte_lucru"),
      firma_suspendata: parseBool(g("Firma suspendata", "firma_suspendata")),
      data_suspendare: parseData(g("Data suspendare", "data_suspendare")),
      data_reactivare: parseData(g("Data reactivare", "data_reactivare")),
      salariati: parseBool(g("Salariati", "salariati")),
      nr_salariati: g("Nr. salariati", "nr_salariati"),
      token: g("Token", "token"),
      procura: parseBool(g("Procura", "procura")),
      semnatura_digitala: parseBool(g("Semnatura digitala", "semnatura_digitala")),
      casa_marcat: parseBool(g("Casa marcat", "casa_marcat")),
      cod_caen_principal: g("Cod CAEN principal", "cod_caen_principal"),
      activitate_principala: g("Activitate principala", "activitate_principala"),
      // Servicii
      serviciu_contabilitate: parseBool(g("Contabilitate", "serviciu_contabilitate")),
      serviciu_hr: parseBool(g("HR", "serviciu_hr")),
      serviciu_bilant: parseBool(g("Bilant", "serviciu_bilant")),
      serviciu_consultanta: parseBool(g("Consultanta", "serviciu_consultanta")),
      serviciu_revisal: parseBool(g("Revisal", "serviciu_revisal")),
      serviciu_salarizare: parseBool(g("Salarizare", "serviciu_salarizare")),
      // Tarifare
      tarif_contabilitate: g("Tarif contabilitate", "tarif_contabilitate"),
      tarif_hr: g("Tarif HR", "tarif_hr"),
      tarif_bilant: g("Tarif bilant", "tarif_bilant"),
      tarif_total: g("Tarif total", "tarif_total"),
      moneda: g("Moneda", "moneda") || "RON",
      // Adresa
      judet: g("Judet", "judet"),
      localitate: g("Localitate", "localitate"),
      strada: g("Strada", "strada"),
      numar: g("Numar", "numar"),
      // Contact
      administrator_nume: g("Administrator", "administrator_nume"),
      administrator_telefon: g("Tel. administrator", "administrator_telefon"),
      administrator_email: g("Email administrator", "administrator_email"),
      persoana_contact_nume: g("Persoana contact", "persoana_contact_nume"),
      persoana_contact_telefon: g("Tel. contact", "persoana_contact_telefon"),
      persoana_contact_email: g("Email contact", "persoana_contact_email"),
      cont_bancar_principal: g("IBAN", "cont_bancar_principal"),
      banca_principala: g("Banca", "banca_principala"),
      observatii_generale: g("Observatii", "observatii_generale"),
      // Meta
      documente: [], istoric: [], este_client_nou: false,
    };
  };

  const handleImport = async () => {
    const valide = importData.rows.filter(r => r._errors.length === 0);
    if (!valide.length) return;
    setImportStep("importing");
    const errors = [];
    let done = 0;
    for (const row of valide) {
      try {
        const data = transformRandImport(row);
        await addDoc(collection(db, "clienti"), {
          ...data,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        done++;
        setImportProgress({ done, total: valide.length, errors });
      } catch (e) {
        errors.push(`Rand ${row._row} (${row["Denumire"] || row["denumire"]}): ${e.message}`);
        setImportProgress({ done, total: valide.length, errors: [...errors] });
      }
    }
    setImportStep("done");
    setImportProgress({ done, total: valide.length, errors });
    await reload();
  };

  const resetImport = () => {
    setImportStep("upload");
    setImportData(null);
    setImportProgress({ done: 0, total: 0, errors: [] });
    setShowImport(false);
  };

  const rowsValide = importData?.rows.filter(r => r._errors.length === 0) || [];
  const rowsInvalide = importData?.rows.filter(r => r._errors.length > 0) || [];

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="p-6">
      <PageHeader
        title="Baza Clientilor"
        subtitle={`${filtered.length} din ${clienti.length} clienti`}
        action={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setShowImport(!showImport)}>
              Import CSV
            </Btn>
            <Btn variant="secondary" onClick={handleExport}>
              Export CSV ({filtered.length})
            </Btn>
          </div>
        }
      />

      {/* ============================================================
          PANOUL IMPORT — expandabil
          ============================================================ */}
      {showImport && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">

          {importStep === "upload" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">Import clienti din CSV</h3>
                <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
              </div>

              {/* Instructiuni */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-primary-50 border border-primary-100 rounded-lg p-3 text-primary-700">
                  <p className="font-bold mb-1">Pasul 1 — Template</p>
                  <p>Descarca template-ul, completeaza-l in Excel si salveaza ca CSV UTF-8.</p>
                </div>
                <div className="bg-primary-50 border border-primary-100 rounded-lg p-3 text-primary-700">
                  <p className="font-bold mb-1">Pasul 2 — Incarca</p>
                  <p>Incarca fisierul CSV. Sistemul verifica automat fiecare rand.</p>
                </div>
                <div className="bg-primary-50 border border-primary-100 rounded-lg p-3 text-primary-700">
                  <p className="font-bold mb-1">Pasul 3 — Confirma</p>
                  <p>Revizuieste previzualizarea si confirma importul in Firebase.</p>
                </div>
              </div>

              {/* Reguli rapide */}
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div><span className="font-semibold text-slate-600">Obligatorii:</span> Denumire, CUI</div>
                <div><span className="font-semibold text-slate-600">Da/Nu:</span> da / nu (sau 1 / 0)</div>
                <div><span className="font-semibold text-slate-600">Date:</span> DD.MM.YYYY</div>
                <div><span className="font-semibold text-slate-600">Firma:</span> exact cum apare in CRM</div>
              </div>

              <div className="flex gap-2">
                <Btn variant="secondary" onClick={handleDescarcaTemplate}>
                  Descarca template CSV
                </Btn>
              </div>

              {/* Drop zone */}
              <div
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFisier(e.dataTransfer.files[0]); }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver ? "border-primary-400 bg-primary-50" : "border-slate-200 hover:border-primary-300 hover:bg-slate-50"
                }`}
              >
                <input ref={fileRef} type="file" accept=".csv" className="hidden"
                  onChange={e => handleFisier(e.target.files[0])} />
                <p className="text-slate-500 font-medium text-sm">Trage fisierul CSV aici sau click pentru a selecta</p>
                <p className="text-xs text-slate-400 mt-1">Accepta .csv — exportul din Excel sau Google Sheets</p>
              </div>
            </div>
          )}

          {importStep === "preview" && importData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">Previzualizare import</h3>
                <button onClick={resetImport} className="text-xs text-slate-400 hover:text-slate-600 underline">Anuleaza</button>
              </div>

              {/* Sumar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-success-50 border border-success-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-success-400">{rowsValide.length}</p>
                  <p className="text-xs text-success-500 mt-0.5">Gata de import</p>
                </div>
                <div className={`${rowsInvalide.length > 0 ? "bg-danger-50 border-danger-200" : "bg-slate-50 border-slate-200"} border rounded-lg p-3 text-center`}>
                  <p className={`text-2xl font-bold ${rowsInvalide.length > 0 ? "text-danger-400" : "text-slate-300"}`}>{rowsInvalide.length}</p>
                  <p className={`text-xs mt-0.5 ${rowsInvalide.length > 0 ? "text-danger-400" : "text-slate-400"}`}>Cu erori (sarite)</p>
                </div>
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-warning-500">{importData.rows.filter(r => r._warnings.length > 0).length}</p>
                  <p className="text-xs text-warning-500 mt-0.5">Cu avertismente</p>
                </div>
              </div>

              {/* Tabel previzualizare */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">Rand</th>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">Status</th>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">Denumire</th>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">CUI</th>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">Firma contab.</th>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">Nr. Contract</th>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">Tarif</th>
                        <th className="text-left px-3 py-2 font-bold text-slate-500">Probleme</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {importData.rows.map((row, i) => {
                        const den = row["Denumire"] || row["denumire"] || "—";
                        const cui = row["CUI"] || row["cui"] || "—";
                        const firma = row["Firma contabilitate"] || row["firma_contabilitate_denumire"] || "—";
                        const nrCtr = row["Nr. contract"] || row["_nr_contract"] || "—";
                        const tarif = row["Tarif total"] || row["tarif_total"] || row["Tarif contract"] || "—";
                        return (
                          <tr key={i} className={
                            row._errors.length > 0 ? "bg-danger-50" :
                            row._warnings.length > 0 ? "bg-warning-50" : "hover:bg-slate-50"
                          }>
                            <td className="px-3 py-2 text-slate-400">{row._row}</td>
                            <td className="px-3 py-2">
                              {row._errors.length > 0
                                ? <Badge text="Eroare" color="red" />
                                : row._warnings.length > 0
                                  ? <Badge text="Atentie" color="yellow" />
                                  : <Badge text="OK" color="green" />
                              }
                            </td>
                            <td className="px-3 py-2 font-medium text-slate-800">{den}</td>
                            <td className="px-3 py-2 font-mono text-slate-600">{cui}</td>
                            <td className="px-3 py-2 text-slate-600">{firma}</td>
                            <td className="px-3 py-2 text-slate-600">{nrCtr}</td>
                            <td className="px-3 py-2 text-slate-600">{tarif}</td>
                            <td className="px-3 py-2">
                              {row._errors.map((e, j) => <p key={j} className="text-danger-400">{e}</p>)}
                              {row._warnings.map((w, j) => <p key={j} className="text-warning-500">{w}</p>)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {rowsInvalide.length > 0 && (
                <p className="text-xs text-danger-400 bg-danger-50 border border-danger-100 rounded-lg p-3">
                  Randurile cu erori vor fi sarite. Corecteaza-le in fisierul CSV si reimporta pentru a le include.
                </p>
              )}

              <div className="flex justify-between">
                <Btn variant="secondary" onClick={() => setImportStep("upload")}>Inapoi</Btn>
                <Btn onClick={handleImport} disabled={rowsValide.length === 0}>
                  Importa {rowsValide.length} client{rowsValide.length !== 1 ? "i" : ""}
                </Btn>
              </div>
            </div>
          )}

          {importStep === "importing" && (
            <div className="flex flex-col items-center py-10">
              <div className="w-8 h-8 border-2 border-primary-100 border-t-primary-500 rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-semibold text-slate-700 mb-1">Se importa...</p>
              <p className="text-xs text-slate-400">{importProgress.done} din {importProgress.total}</p>
              <div className="w-48 bg-slate-200 rounded-full h-1.5 mt-3">
                <div className="bg-primary-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${importProgress.total ? (importProgress.done / importProgress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          {importStep === "done" && (
            <div className="space-y-3">
              <div className="bg-success-50 border border-success-200 rounded-xl p-4 text-center">
                <p className="text-lg font-bold text-success-400 mb-0.5">Import finalizat</p>
                <p className="text-sm text-success-500">
                  {importProgress.done} client{importProgress.done !== 1 ? "i" : ""} importat{importProgress.done !== 1 ? "i" : ""} cu succes.
                </p>
              </div>
              {importProgress.errors.length > 0 && (
                <div className="bg-danger-50 border border-danger-100 rounded-lg p-3">
                  <p className="text-xs font-bold text-danger-400 mb-1">Erori ({importProgress.errors.length}):</p>
                  {importProgress.errors.map((e, i) => <p key={i} className="text-xs text-danger-400">{e}</p>)}
                </div>
              )}
              <div className="flex justify-between">
                <Btn variant="secondary" onClick={resetImport}>Inchide</Btn>
                <Btn variant="secondary" onClick={() => { setImportStep("upload"); setImportData(null); }}>
                  Importa alt fisier
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          FILTRE
          ============================================================ */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cauta dupa denumire, CUI, contabil, nr. contract..."
          className="flex-1 min-w-64 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
        />
        <button
          onClick={() => setShowFiltre(!showFiltre)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            showFiltre || nrFiltreActive > 0
              ? "bg-primary-500 text-white border-primary-500"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Filtre {nrFiltreActive > 0 && `(${nrFiltreActive})`}
        </button>
        {nrFiltreActive > 0 && (
          <button onClick={resetFiltre}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-white text-danger-400 border border-danger-200 hover:bg-danger-50 transition-colors">
            Reseteaza
          </button>
        )}
      </div>

      {showFiltre && (
        <div className="bg-slate-50 rounded-xl p-4 mb-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Status", value: filtruStatus, set: setFiltruStatus, options: STATUS_CLIENT },
            { label: "Servicii", value: filtruServicii, set: setFiltruServicii,
              options: [
                { value: "contabilitate", label: "Contabilitate" },
                { value: "bilant", label: "Doar bilant" },
                { value: "contab_bilant", label: "Contab. + bilant" },
                { value: "hr", label: "HR" },
              ]
            },
            { label: "Periodicitate", value: filtruPeriodicitate, set: setFiltruPeriodicitate, options: VECTORI_FISCALI },
            { label: "Platitor TVA", value: filtruTVA, set: setFiltruTVA,
              options: [{ value: "da", label: "Da" }, { value: "nu", label: "Nu" }] },
            { label: "Vector fiscal", value: filtruVector, set: setFiltruVector, options: VECTORI_FISCALI },
            { label: "Punct lucru", value: filtruPunctLucru, set: setFiltruPunctLucru,
              options: [{ value: "da", label: "Da" }, { value: "nu", label: "Nu" }] },
            { label: "CUI intracomunitar", value: filtruCUIIntra, set: setFiltruCUIIntra,
              options: [{ value: "da", label: "Da" }, { value: "nu", label: "Nu" }] },
            { label: "Procura", value: filtruProcura, set: setFiltruProcura,
              options: [{ value: "da", label: "Da" }, { value: "nu", label: "Nu" }] },
          ].map(({ label, value, set, options }) => (
            <div key={label}>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">{label}</label>
              <select value={value} onChange={e => set(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400">
                <option value="">Toate</option>
                {options.map(o => typeof o === "string"
                  ? <option key={o} value={o}>{o}</option>
                  : <option key={o.value} value={o.value}>{o.label}</option>
                )}
              </select>
            </div>
          ))}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Firma</label>
            <select value={filtruFirma} onChange={e => setFiltruFirma(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400">
              <option value="">Toate</option>
              {firme.map(f => <option key={f.id} value={f.id}>{f.denumire_scurta || f.denumire}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ============================================================
          TABEL
          ============================================================ */}
      {loading ? <Loading /> : filtered.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-base font-semibold text-slate-600 mb-1">Niciun client nu corespunde filtrelor</h3>
          <button onClick={resetFiltre} className="text-sm text-primary-500 hover:underline mt-2">Reseteaza filtrele</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden" style={{ boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.08)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Client", "CUI", "Firma", "Nr. Contract", "Data", "Tarif", "Status", "Detalii"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(client => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{client.denumire}</p>
                      {client.contabil_responsabil && (
                        <p className="text-xs text-slate-400">{client.contabil_responsabil}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{client.cui}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{client.firma_contabilitate_denumire || "—"}</td>
                    <td className="px-4 py-3">
                      {client._nr_contract
                        ? <span className="text-xs font-semibold text-primary-500 bg-primary-50 px-2 py-0.5 rounded-md">{client._nr_contract}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{client._data_contract || "—"}</td>
                    <td className="px-4 py-3">
                      {client._tarif_contract
                        ? <span className="font-semibold text-slate-700">{client._tarif_contract} {client._moneda_contract}</span>
                        : client.tarif_total
                          ? <span className="text-xs text-slate-400">{client.tarif_total} RON</span>
                          : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <Badge text={client.status_client || "Activ"} color={statusClientColor(client.status_client)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {client.platitor_tva && <Badge text="TVA" color="indigo" />}
                        {client.firma_suspendata && <Badge text="Susp." color="yellow" />}
                        {client.serviciu_hr && <Badge text="HR" color="orange" />}
                        {client.serviciu_bilant && <Badge text="Bil." color="green" />}
                        {client.procura && <Badge text="Proc." color="purple" />}
                        {client.cui_intracomunitar && <Badge text="Intra." color="blue" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
            <span>
              {filtered.length} client{filtered.length !== 1 ? "i" : ""} afisati
              {nrFiltreActive > 0 && ` — ${nrFiltreActive} filtr${nrFiltreActive > 1 ? "e" : "u"} activ${nrFiltreActive > 1 ? "e" : ""}`}
            </span>
            <button onClick={handleExport} className="text-primary-500 hover:underline font-medium">
              Exporta lista curenta CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
