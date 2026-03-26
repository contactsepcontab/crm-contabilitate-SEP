import { useState, useRef } from "react";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Btn, Badge, PageHeader, Loading } from "../components/UI";

// Valorile acceptate pentru campurile cu valori fixe
const VALORI_BOOLEENE = ["da", "nu", "true", "false", "1", "0", "yes", "no"];
const parseBool = (val) => {
  if (!val) return false;
  return ["da", "true", "1", "yes"].includes(String(val).toLowerCase().trim());
};

const CAMPURI_BOOLEENE = [
  "platitor_tva", "cui_intracomunitar", "punct_lucru", "firma_suspendata",
  "salariati", "procura", "semnatura_digitala", "casa_marcat",
  "serviciu_contabilitate", "serviciu_hr", "serviciu_bilant",
  "serviciu_consultanta", "serviciu_revisal", "serviciu_salarizare",
  "este_client_nou",
];

const CAMPURI_NUMERICE = [
  "nr_puncte_lucru", "nr_salariati",
  "tarif_contabilitate", "tarif_hr", "tarif_bilant", "tarif_total",
];

const STATUS_VALIDE = ["Activ", "Suspendat", "Reziliat", "Prospect"];
const TIP_ENTITATE_VALIDE = ["SRL", "SA", "SNC", "SCS", "RA", "PFA", "II", "IF", "ONG", "Asociatie", "Fundatie", "Sindicat", "Altul"];
const VECTOR_VALIDE = ["Lunar", "Trimestrial", "Semestrial", "Anual", "Nu are"];

// Accepta DD.MM.YYYY sau YYYY-MM-DD, stocheaza intern ca YYYY-MM-DD
const parseData = (val) => {
  if (!val || !val.trim()) return "";
  const v = val.trim();
  const ddmmyyyy = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ddmmyyyy) {
    const [, zi, luna, an] = ddmmyyyy;
    return an + "-" + luna.padStart(2, "0") + "-" + zi.padStart(2, "0");
  }
  const yyyymmdd = v.match(/^\d{4}-\d{2}-\d{2}$/);
  if (yyyymmdd) return v;
  return v;
};

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));

  const rows = lines.slice(1).map((line, idx) => {
    // Parsare CSV simpla care tine cont de ghilimele
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const obj = { _row: idx + 2, _errors: [], _warnings: [] };
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? "";
    });
    return obj;
  });

  return { headers, rows };
}

function validateRow(row, firmeExistente) {
  const errors = [];
  const warnings = [];

  if (!row.denumire?.trim()) errors.push("Denumirea este obligatorie");
  if (!row.cui?.trim()) errors.push("CUI-ul este obligatoriu");
  if (row.status_client && !STATUS_VALIDE.includes(row.status_client))
    warnings.push(`Status '${row.status_client}' necunoscut — va fi setat 'Activ'`);
  if (row.tip_entitate && !TIP_ENTITATE_VALIDE.includes(row.tip_entitate))
    warnings.push(`Tip entitate '${row.tip_entitate}' necunoscut — va fi setat 'SRL'`);
  if (row.vector_fiscal && row.vector_fiscal !== "" && !VECTOR_VALIDE.includes(row.vector_fiscal))
    warnings.push(`Vector fiscal '${row.vector_fiscal}' necunoscut — va fi setat 'Lunar'`);
  if (row.firma_contabilitate_denumire && firmeExistente.length > 0) {
    const gasit = firmeExistente.find(f =>
      f.denumire?.toLowerCase().includes(row.firma_contabilitate_denumire.toLowerCase()) ||
      f.denumire_scurta?.toLowerCase().includes(row.firma_contabilitate_denumire.toLowerCase())
    );
    if (!gasit) warnings.push(`Firma '${row.firma_contabilitate_denumire}' nu a fost găsită în baza de date`);
  }

  return { errors, warnings };
}

function transformRow(row, firmeExistente) {
  const obj = {
    denumire: row.denumire?.trim() || "",
    denumire_comerciala: row.denumire_comerciala?.trim() || "",
    tip_entitate: TIP_ENTITATE_VALIDE.includes(row.tip_entitate) ? row.tip_entitate : "SRL",
    cui: row.cui?.trim() || "",
    nr_reg_com: row.nr_reg_com?.trim() || "",
    euid: row.euid?.trim() || "",
    status_client: STATUS_VALIDE.includes(row.status_client) ? row.status_client : "Activ",
    contabil_responsabil: row.contabil_responsabil?.trim() || "",
    manager_responsabil: row.manager_responsabil?.trim() || "",
    data_inceput_colaborare: parseData(row.data_inceput_colaborare),
    data_sfarsit_colaborare: parseData(row.data_sfarsit_colaborare),
    canal_provenienta: row.canal_provenienta?.trim() || "",
    sursa_detaliata: row.sursa_detaliata?.trim() || "",
    recomandat_de: row.recomandat_de?.trim() || "",
    observatii_generale: row.observatii_generale?.trim() || "",
    // Date fiscale
    cod_tva: row.cod_tva?.trim() || "",
    vector_fiscal: VECTOR_VALIDE.includes(row.vector_fiscal) ? row.vector_fiscal : "Lunar",
    nr_cui_intracomunitar: row.nr_cui_intracomunitar?.trim() || "",
    nr_puncte_lucru: row.nr_puncte_lucru?.trim() || "",
    data_suspendare: parseData(row.data_suspendare),
    data_reactivare: parseData(row.data_reactivare),
    nr_salariati: row.nr_salariati?.trim() || "",
    token: row.token?.trim() || "",
    activitate_principala: row.activitate_principala?.trim() || "",
    cod_caen_principal: row.cod_caen_principal?.trim() || "",
    coduri_caen_secundare: row.coduri_caen_secundare?.trim() || "",
    cont_bancar_principal: row.cont_bancar_principal?.trim() || "",
    banca_principala: row.banca_principala?.trim() || "",
    // Adresa
    judet: row.judet?.trim() || "",
    localitate: row.localitate?.trim() || "",
    strada: row.strada?.trim() || "",
    numar: row.numar?.trim() || "",
    bloc: row.bloc?.trim() || "",
    scara: row.scara?.trim() || "",
    apartament: row.apartament?.trim() || "",
    cod_postal: row.cod_postal?.trim() || "",
    // Administrator
    administrator_nume: row.administrator_nume?.trim() || "",
    administrator_cnp: row.administrator_cnp?.trim() || "",
    administrator_ci_serie: row.administrator_ci_serie?.trim() || "",
    administrator_ci_numar: row.administrator_ci_numar?.trim() || "",
    administrator_telefon: row.administrator_telefon?.trim() || "",
    administrator_email: row.administrator_email?.trim() || "",
    // Contact
    persoana_contact_nume: row.persoana_contact_nume?.trim() || "",
    persoana_contact_functie: row.persoana_contact_functie?.trim() || "",
    persoana_contact_telefon: row.persoana_contact_telefon?.trim() || "",
    persoana_contact_email: row.persoana_contact_email?.trim() || "",
    telefon_secundar: row.telefon_secundar?.trim() || "",
    email_secundar: row.email_secundar?.trim() || "",
    // Tarifare
    tarif_contabilitate: row.tarif_contabilitate?.trim() || "",
    tarif_hr: row.tarif_hr?.trim() || "",
    tarif_bilant: row.tarif_bilant?.trim() || "",
    tarif_total: row.tarif_total?.trim() || "",
    moneda: row.moneda?.trim() || "RON",
    data_ultima_modificare_tarif: parseData(row.data_ultima_modificare_tarif),
    alte_servicii: row.alte_servicii?.trim() || "",
    // Metadate
    documente: [],
    istoric: [],
    este_client_nou: false,
  };

  // Campuri booleene
  CAMPURI_BOOLEENE.forEach(camp => {
    obj[camp] = parseBool(row[camp]);
  });

  // Firma contabilitate - cauta dupa denumire
  if (row.firma_contabilitate_denumire?.trim() && firmeExistente.length > 0) {
    const gasit = firmeExistente.find(f =>
      f.denumire?.toLowerCase().includes(row.firma_contabilitate_denumire.toLowerCase()) ||
      f.denumire_scurta?.toLowerCase().includes(row.firma_contabilitate_denumire.toLowerCase())
    );
    obj.firma_contabilitate_id = gasit?.id || "";
    obj.firma_contabilitate_denumire = gasit?.denumire_scurta || gasit?.denumire || row.firma_contabilitate_denumire?.trim() || "";
  } else {
    obj.firma_contabilitate_id = "";
    obj.firma_contabilitate_denumire = row.firma_contabilitate_denumire?.trim() || "";
  }

  return obj;
}

export default function ImportClienti() {
  const [step, setStep] = useState("upload"); // upload | preview | importing | done
  const [parsedData, setParsedData] = useState(null);
  const [firmeExistente, setFirmeExistente] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: [] });
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      alert("Te rog încarcă un fișier .csv");
      return;
    }

    // Incarca firmele existente pentru matching
    try {
      const fSnap = await getDocs(collection(db, "firme_contabilitate"));
      const firme = fSnap.docs.map(d => ({ ...d.data(), id: d.id }));
      setFirmeExistente(firme);

      const text = await file.text();
      const { headers, rows } = parseCSV(text);

      if (!headers.includes("denumire") || !headers.includes("cui")) {
        alert("CSV-ul trebuie să conțină cel puțin coloanele 'denumire' și 'cui'.\nDescarcă template-ul pentru formatul corect.");
        return;
      }

      const rowsValidate = rows.map(row => {
        const { errors, warnings } = validateRow(row, firme);
        return { ...row, _errors: errors, _warnings: warnings };
      });

      setParsedData({ headers, rows: rowsValidate });
      setStep("preview");
    } catch (e) {
      alert("Eroare la citirea fișierului: " + e.message);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const rowsValide = parsedData?.rows.filter(r => r._errors.length === 0) || [];
  const rowsInvalide = parsedData?.rows.filter(r => r._errors.length > 0) || [];

  const handleImport = async () => {
    if (!rowsValide.length) return;
    setImporting(true);
    setStep("importing");
    const errors = [];
    let done = 0;

    for (const row of rowsValide) {
      try {
        const data = transformRow(row, firmeExistente);
        await addDoc(collection(db, "clienti"), {
          ...data,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        done++;
        setProgress({ done, total: rowsValide.length, errors });
      } catch (e) {
        errors.push(`Rândul ${row._row} (${row.denumire}): ${e.message}`);
        setProgress({ done, total: rowsValide.length, errors: [...errors] });
      }
    }

    setImporting(false);
    setStep("done");
    setProgress({ done, total: rowsValide.length, errors });
  };

  const downloadTemplate = () => {
    const header = [
      "denumire", "tip_entitate", "cui", "nr_reg_com", "status_client",
      "firma_contabilitate_denumire", "contabil_responsabil", "manager_responsabil",
      "data_inceput_colaborare", "platitor_tva", "cod_tva", "vector_fiscal",
      "cui_intracomunitar", "nr_cui_intracomunitar", "punct_lucru", "nr_puncte_lucru",
      "firma_suspendata", "data_suspendare", "data_reactivare",
      "salariati", "nr_salariati", "token", "procura", "semnatura_digitala", "casa_marcat",
      "activitate_principala", "cod_caen_principal", "coduri_caen_secundare",
      "cont_bancar_principal", "banca_principala",
      "judet", "localitate", "strada", "numar", "bloc", "scara", "apartament", "cod_postal",
      "administrator_nume", "administrator_cnp", "administrator_telefon", "administrator_email",
      "persoana_contact_nume", "persoana_contact_functie", "persoana_contact_telefon", "persoana_contact_email",
      "telefon_secundar", "email_secundar",
      "serviciu_contabilitate", "serviciu_hr", "serviciu_bilant",
      "serviciu_consultanta", "serviciu_revisal", "serviciu_salarizare", "alte_servicii",
      "tarif_contabilitate", "tarif_hr", "tarif_bilant", "tarif_total", "moneda",
      "observatii_generale",
    ].join(",");

    const exemplu = [
      "SC Exemplu SRL", "SRL", "RO12345678", "J05/123/2020", "Activ",
      "Alpha Contabil", "Ion Popescu", "",
      "01.01.2022", "da", "RO12345678", "Lunar",
      "nu", "", "da", "1",
      "nu", "", "",
      "da", "3", "Ion Popescu", "da", "da", "nu",
      "Comert cu amanuntul", "4711", "4712",
      "RO49AAAA1B31007593840000", "Banca Transilvania",
      "Cluj", "Cluj-Napoca", "Str. Victoriei", "10", "", "", "", "400001",
      "Maria Ionescu", "1234567890123", "0722111222", "office@exemplu.ro",
      "Ana Pop", "Contabil intern", "0733222333", "ana@exemplu.ro",
      "", "",
      "da", "nu", "da", "nu", "nu", "nu", "",
      "500", "", "300", "800", "RON",
      "",
    ].join(",");

    const csv = header + "\n" + exemplu + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clienti_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader
        title="Import Clienti din CSV"
        subtitle="Incarca lista ta de clienti existenti dintr-un fisier CSV"
      />

      {/* STEP 1: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          {/* Instrucțiuni */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-blue-800 mb-3">Cum functioneaza importul</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-blue-700">
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="font-bold mb-1">Pasul 1</p>
                <p>Descarca template-ul CSV si completeaza-l cu datele clientilor tai in Excel sau Google Sheets.</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="font-bold mb-1">Pasul 2</p>
                <p>Salveaza fisierul ca .CSV si incarca-l aici. Sistemul verifica automat datele inainte de import.</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="font-bold mb-1">Pasul 3</p>
                <p>Revizuieste previzualizarea, corecteaza eventualele erori si confirma importul in Firebase.</p>
              </div>
            </div>
          </div>

          {/* Reguli campuri */}
          <div className="bg-gray-50 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Reguli de completare</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600">
              <div>
                <p className="font-semibold text-gray-700 mb-1">Campuri obligatorii</p>
                <p>denumire, cui</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">Campuri da/nu (boolean)</p>
                <p>Scrie: da / nu (sau: true / false / 1 / 0)</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">status_client</p>
                <p>Valori acceptate: Activ / Suspendat / Reziliat / Prospect</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">tip_entitate</p>
                <p>SRL / SA / PFA / II / IF / ONG / Asociatie / Fundatie / Sindicat / Altul</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">vector_fiscal</p>
                <p>Lunar / Trimestrial / Semestrial / Anual / Nu are</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">data_inceput_colaborare</p>
                <p>Format: DD.MM.YYYY (ex: 15.01.2022) — accepta si YYYY-MM-DD</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">firma_contabilitate_denumire</p>
                <p>Scrie exact denumirea sau prescurtarea firmei din CRM</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">Campuri lasate goale</p>
                <p>Se pot completa ulterior manual din fisa clientului</p>
              </div>
            </div>
          </div>

          {/* Butoane */}
          <div className="flex gap-3 flex-wrap">
            <Btn variant="secondary" onClick={downloadTemplate}>
              Descarca template CSV
            </Btn>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileRef.current.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-indigo-400 bg-indigo-50"
                : "border-gray-300 hover:border-indigo-300 hover:bg-gray-50"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => handleFile(e.target.files[0])}
            />
            <div className="text-4xl mb-3 text-gray-300">CSV</div>
            <p className="text-gray-600 font-medium">Trage fisierul CSV aici sau click pentru a selecta</p>
            <p className="text-xs text-gray-400 mt-1">Doar fisiere .csv</p>
          </div>
        </div>
      )}

      {/* STEP 2: Preview */}
      {step === "preview" && parsedData && (
        <div className="space-y-5">
          {/* Sumar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{rowsValide.length}</p>
              <p className="text-sm text-green-600 mt-0.5">Gata de import</p>
            </div>
            <div className={`${rowsInvalide.length > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"} border rounded-xl p-4 text-center`}>
              <p className={`text-3xl font-bold ${rowsInvalide.length > 0 ? "text-red-700" : "text-gray-400"}`}>{rowsInvalide.length}</p>
              <p className={`text-sm mt-0.5 ${rowsInvalide.length > 0 ? "text-red-600" : "text-gray-400"}`}>Cu erori (vor fi sarite)</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-amber-700">
                {parsedData.rows.filter(r => r._warnings.length > 0).length}
              </p>
              <p className="text-sm text-amber-600 mt-0.5">Cu avertismente</p>
            </div>
          </div>

          {/* Lista randuri */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Previzualizare date ({parsedData.rows.length} randuri)</p>
              <button
                onClick={() => setStep("upload")}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Incarca alt fisier
              </button>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-3 py-2 font-bold text-gray-500">Rand</th>
                    <th className="text-left px-3 py-2 font-bold text-gray-500">Status</th>
                    <th className="text-left px-3 py-2 font-bold text-gray-500">Denumire</th>
                    <th className="text-left px-3 py-2 font-bold text-gray-500">CUI</th>
                    <th className="text-left px-3 py-2 font-bold text-gray-500">Tip</th>
                    <th className="text-left px-3 py-2 font-bold text-gray-500">Firma contab.</th>
                    <th className="text-left px-3 py-2 font-bold text-gray-500">Tarif total</th>
                    <th className="text-left px-3 py-2 font-bold text-gray-500">Probleme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {parsedData.rows.map((row, i) => (
                    <tr key={i} className={row._errors.length > 0 ? "bg-red-50" : row._warnings.length > 0 ? "bg-amber-50" : "hover:bg-gray-50"}>
                      <td className="px-3 py-2 text-gray-400">{row._row}</td>
                      <td className="px-3 py-2">
                        {row._errors.length > 0
                          ? <Badge text="Eroare" color="red" />
                          : row._warnings.length > 0
                            ? <Badge text="Avertisment" color="yellow" />
                            : <Badge text="OK" color="green" />
                        }
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-800">{row.denumire || "—"}</td>
                      <td className="px-3 py-2 font-mono text-gray-600">{row.cui || "—"}</td>
                      <td className="px-3 py-2 text-gray-600">{row.tip_entitate || "SRL"}</td>
                      <td className="px-3 py-2 text-gray-600">{row.firma_contabilitate_denumire || "—"}</td>
                      <td className="px-3 py-2 text-gray-600">{row.tarif_total ? `${row.tarif_total} ${row.moneda || "RON"}` : "—"}</td>
                      <td className="px-3 py-2">
                        {row._errors.map((e, j) => (
                          <p key={j} className="text-red-600">{e}</p>
                        ))}
                        {row._warnings.map((w, j) => (
                          <p key={j} className="text-amber-600">{w}</p>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {rowsInvalide.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              Randurile cu erori vor fi sarite. Corecteaza-le in CSV si reimporta fisierul pentru a le include.
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <Btn variant="secondary" onClick={() => setStep("upload")}>Inapoi</Btn>
            <Btn
              onClick={handleImport}
              disabled={rowsValide.length === 0}
            >
              Importa {rowsValide.length} client{rowsValide.length !== 1 ? "i" : ""}
            </Btn>
          </div>
        </div>
      )}

      {/* STEP 3: Importing */}
      {step === "importing" && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-lg font-semibold text-gray-800 mb-2">
            Se importa clientii...
          </p>
          <p className="text-sm text-gray-500">
            {progress.done} din {progress.total} procesati
          </p>
          <div className="w-64 bg-gray-200 rounded-full h-2 mt-4">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* STEP 4: Done */}
      {step === "done" && (
        <div className="space-y-5">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <div className="text-5xl mb-3">✓</div>
            <h2 className="text-xl font-bold text-green-800 mb-1">Import finalizat!</h2>
            <p className="text-green-700">
              {progress.done} client{progress.done !== 1 ? "i" : ""} importat{progress.done !== 1 ? "i" : ""} cu succes in Firebase.
            </p>
          </div>

          {progress.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-bold text-red-800 mb-2">Erori la import ({progress.errors.length}):</p>
              {progress.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600">{e}</p>
              ))}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
            Mergi la <strong>Clienti Activi</strong> sau <strong>Baza Clientilor</strong> pentru a vedea clientii importati si a completa datele lipsa.
          </div>

          <div className="flex gap-3">
            <Btn variant="secondary" onClick={() => { setStep("upload"); setParsedData(null); setProgress({ done: 0, total: 0, errors: [] }); }}>
              Importa alt fisier
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
