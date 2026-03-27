import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Modal, Btn, PageHeader, Loading, Badge } from "../components/UI";

// ============================================================
// CELE 12 SABLOANE
// ============================================================
const SABLOANE = [
  {
    id:"c1", denumire:"Contract de Contabilitate", categorie:"Contract", culoare:"blue",
    campuri:["numar_contract","data_contract","data_start","prima_luna_tarifata","tarif","moneda","periodicitate","termen_plata"],
    gen:(d)=>`CONTRACT DE PRESTARI SERVICII CONTABILE
Nr. ${d.numar_contract} din data de ${d.data_contract}

PRESTATOR: ${d.firma_denumire}
CUI: ${d.firma_cui} | Nr. Reg. Com.: ${d.firma_nr_reg_com||"___"}
Administrator: ${d.firma_administrator}

si

BENEFICIAR: ${d.client_denumire}
CUI: ${d.client_cui} | Nr. Reg. Com.: ${d.client_nr_reg_com||"___"}
Administrator: ${d.client_administrator||"___"}

Art. 1. OBIECT
- Organizarea si conducerea contabilitatii financiare
- Intocmirea si depunerea declaratiilor fiscale lunare/trimestriale
- Consultanta contabila si fiscala curenta

Art. 2. DURATA
Contractul intra in vigoare la: ${d.data_start}
Prima luna tarifata: ${d.prima_luna_tarifata}

Art. 3. PRET
${d.tarif} ${d.moneda}/luna, facturat ${d.periodicitate}, termen plata ${d.termen_plata} zile.

Art. 4. INCETARE
Prin notificare scrisa cu 30 zile inainte.

Semnat astazi, ${d.data_contract}.

PRESTATOR                        BENEFICIAR
${d.firma_denumire}              ${d.client_denumire}
${d.firma_administrator}         ${d.client_administrator||"___"}
Semnatura ___________            Semnatura ___________`,
  },
  {
    id:"c2", denumire:"Contract de Resurse Umane", categorie:"Contract", culoare:"orange",
    campuri:["numar_contract","data_contract","data_start","prima_luna_tarifata","tarif","moneda","nr_salariati"],
    gen:(d)=>`CONTRACT DE PRESTARI SERVICII RESURSE UMANE
Nr. ${d.numar_contract} din data de ${d.data_contract}

PRESTATOR: ${d.firma_denumire}, CUI: ${d.firma_cui}
Administrator: ${d.firma_administrator}

BENEFICIAR: ${d.client_denumire}, CUI: ${d.client_cui}
Administrator: ${d.client_administrator||"___"}

Art. 1. OBIECT
- Intocmirea si transmiterea declaratiei 112
- Intocmire state de plata si contracte de munca
- Gestionare Revisal
- Calcul concedii si consultanta legislatia muncii

Art. 2. DURATA
Intra in vigoare la: ${d.data_start}
Prima luna tarifata: ${d.prima_luna_tarifata}

Art. 3. PRET
${d.tarif} ${d.moneda}/luna (pentru ${d.nr_salariati} salariati).

Semnat astazi, ${d.data_contract}.

PRESTATOR                        BENEFICIAR
${d.firma_denumire}              ${d.client_denumire}
${d.firma_administrator}         ${d.client_administrator||"___"}
Semnatura ___________            Semnatura ___________`,
  },
  {
    id:"c3", denumire:"Contract Doar Bilant", categorie:"Contract", culoare:"green",
    campuri:["numar_contract","data_contract","tarif","moneda","an_bilant"],
    gen:(d)=>`CONTRACT SERVICII INTOCMIRE BILANT CONTABIL
Nr. ${d.numar_contract} din data de ${d.data_contract}

PRESTATOR: ${d.firma_denumire}, CUI: ${d.firma_cui}
Administrator: ${d.firma_administrator}

BENEFICIAR: ${d.client_denumire}, CUI: ${d.client_cui}
Administrator: ${d.client_administrator||"___"}

Art. 1. OBIECT
Intocmirea situatiilor financiare anuale (bilant) pentru exercitiul financiar ${d.an_bilant}.

Art. 2. TARIF
${d.tarif} ${d.moneda} (tarif fix anual).

Art. 3. TERMEN
In termenul legal stabilit de Ministerul Finantelor.

Semnat astazi, ${d.data_contract}.

PRESTATOR                        BENEFICIAR
${d.firma_denumire}              ${d.client_denumire}
${d.firma_administrator}         ${d.client_administrator||"___"}
Semnatura ___________            Semnatura ___________`,
  },
  {
    id:"c4", denumire:"Contract Contabilitate + Resurse Umane", categorie:"Contract", culoare:"indigo",
    campuri:["numar_contract","data_contract","data_start","prima_luna_tarifata","tarif_contabilitate","tarif_hr","tarif_total","moneda","nr_salariati","periodicitate","termen_plata"],
    gen:(d)=>`CONTRACT DE PRESTARI SERVICII CONTABILE SI RESURSE UMANE
Nr. ${d.numar_contract} din data de ${d.data_contract}

PRESTATOR: ${d.firma_denumire}, CUI: ${d.firma_cui}
Administrator: ${d.firma_administrator}

BENEFICIAR: ${d.client_denumire}, CUI: ${d.client_cui}
Administrator: ${d.client_administrator||"___"}

Art. 1. OBIECT
CONTABILITATE: conducere contabilitate, declaratii fiscale, consultanta.
RESURSE UMANE: declaratie 112, state plata, contracte munca, Revisal.

Art. 2. DURATA
Intra in vigoare la: ${d.data_start}
Prima luna tarifata: ${d.prima_luna_tarifata}

Art. 3. PRET
- Tarif contabilitate: ${d.tarif_contabilitate} ${d.moneda}/luna
- Tarif resurse umane: ${d.tarif_hr} ${d.moneda}/luna (${d.nr_salariati} salariati)
- TOTAL: ${d.tarif_total} ${d.moneda}/luna
Facturat ${d.periodicitate}, termen plata ${d.termen_plata} zile.

Semnat astazi, ${d.data_contract}.

PRESTATOR                        BENEFICIAR
${d.firma_denumire}              ${d.client_denumire}
${d.firma_administrator}         ${d.client_administrator||"___"}
Semnatura ___________            Semnatura ___________`,
  },
  {
    id:"c5", denumire:"Contract Refacere Contabilitate Ani Anteriori", categorie:"Contract", culoare:"purple",
    campuri:["numar_contract","data_contract","ani_refacere","tarif","moneda","termen_finalizare"],
    gen:(d)=>`CONTRACT SERVICII REFACERE CONTABILITATE ANI ANTERIORI
Nr. ${d.numar_contract} din data de ${d.data_contract}

PRESTATOR: ${d.firma_denumire}, CUI: ${d.firma_cui}
Administrator: ${d.firma_administrator}

BENEFICIAR: ${d.client_denumire}, CUI: ${d.client_cui}
Administrator: ${d.client_administrator||"___"}

Art. 1. OBIECT
Refacerea inregistrarilor contabile aferente perioadei: ${d.ani_refacere}
Include: reintregistrare operatiuni, declaratii rectificative, regularizare fiscala.

Art. 2. TARIF
${d.tarif} ${d.moneda} (tarif fix pentru intreaga perioada).

Art. 3. TERMEN
Lucrari finalizate pana la: ${d.termen_finalizare}

Art. 4. RASPUNDERE
Beneficiarul furnizeaza TOATE documentele originale in 10 zile de la semnare.

Semnat astazi, ${d.data_contract}.

PRESTATOR                        BENEFICIAR
${d.firma_denumire}              ${d.client_denumire}
${d.firma_administrator}         ${d.client_administrator||"___"}
Semnatura ___________            Semnatura ___________`,
  },
  {
    id:"aa1", denumire:"Act Aditional Majorare Tarif", categorie:"Act Aditional", culoare:"green",
    campuri:["numar_act","data_act","numar_contract_ref","data_contract_ref","data_intrare_vigoare","tarif_vechi","tarif_nou","moneda","motiv"],
    gen:(d)=>`ACT ADITIONAL NR. ${d.numar_act} din ${d.data_act}
la Contractul nr. ${d.numar_contract_ref} din ${d.data_contract_ref}

PRESTATOR: ${d.firma_denumire}, CUI: ${d.firma_cui}
Administrator: ${d.firma_administrator}

BENEFICIAR: ${d.client_denumire}, CUI: ${d.client_cui}
Administrator: ${d.client_administrator||"___"}

Art. 1. Incepand cu ${d.data_intrare_vigoare}, tariful lunar se majoreaza
de la ${d.tarif_vechi} ${d.moneda} la ${d.tarif_nou} ${d.moneda}/luna.

Art. 2. Motiv: ${d.motiv}

Art. 3. Celelalte clauze raman neschimbate.

Semnat astazi, ${d.data_act}.

PRESTATOR                        BENEFICIAR
${d.firma_denumire}              ${d.client_denumire}
${d.firma_administrator}         ${d.client_administrator||"___"}
Semnatura ___________            Semnatura ___________`,
  },
  {
    id:"aa2", denumire:"Act Aditional Micsorare Tarif", categorie:"Act Aditional", culoare:"yellow",
    campuri:["numar_act","data_act","numar_contract_ref","data_contract_ref","data_intrare_vigoare","tarif_vechi","tarif_nou","moneda","motiv"],
    gen:(d)=>`ACT ADITIONAL NR. ${d.numar_act} din ${d.data_act}
la Contractul nr. ${d.numar_contract_ref} din ${d.data_contract_ref}

PRESTATOR: ${d.firma_denumire}, CUI: ${d.firma_cui}
Administrator: ${d.firma_administrator}

BENEFICIAR: ${d.client_denumire}, CUI: ${d.client_cui}
Administrator: ${d.client_administrator||"___"}

Art. 1. Incepand cu ${d.data_intrare_vigoare}, tariful lunar se reduce
de la ${d.tarif_vechi} ${d.moneda} la ${d.tarif_nou} ${d.moneda}/luna.

Art. 2. Motiv: ${d.motiv}

Art. 3. Celelalte clauze raman neschimbate.

Semnat astazi, ${d.data_act}.

PRESTATOR                        BENEFICIAR
${d.firma_denumire}              ${d.client_denumire}
${d.firma_administrator}         ${d.client_administrator||"___"}
Semnatura ___________            Semnatura ___________`,
  },
  {
    id:"aa3", denumire:"Act Aditional Doar Bilant", categorie:"Act Aditional", culoare:"green",
    campuri:["numar_act","data_act","numar_contract_ref","data_contract_ref","tarif_bilant","moneda","an_bilant"],
    gen:(d)=>`ACT ADITIONAL NR. ${d.numar_act} din ${d.data_act}
la Contractul nr. ${d.numar_contract_ref} din ${d.data_contract_ref}

PRESTATOR: ${d.firma_denumire}, CUI: ${d.firma_cui}
Administrator: ${d.firma_administrator}

BENEFICIAR: ${d.client_denumire}, CUI: ${d.client_cui}
Administrator: ${d.client_administrator||"___"}

Art. 1. Se adauga serviciul de intocmire bilant anual
pentru exercitiul financiar ${d.an_bilant}.

Art. 2. Tarif bilant: ${d.tarif_bilant} ${d.moneda}/an (tarif fix anual).

Art. 3. Celelalte clauze raman neschimbate.

Semnat astazi, ${d.data_act}.

PRESTATOR                        BENEFICIAR
${d.firma_denumire}              ${d.client_denumire}
${d.firma_administrator}         ${d.client_administrator||"___"}
Semnatura ___________            Semnatura ___________`,
  },
  {
    id:"aa4", denumire:"Act Aditional Reziliere Contract Contabilitate", categorie:"Act Aditional", culoare:"red",
    campuri:["numar_act","data_act","numar_contract_ref","data_contract_ref","data_reziliere","ultima_luna_lucrata","ultima_luna_facturata","motiv"],
    gen:(d)=>`ACT ADITIONAL DE REZILIERE NR. ${d.numar_act} din ${d.data_act}
la Contractul de Contabilitate nr. ${d.numar_contract_ref} din ${d.data_contract_ref}

PRESTATOR: ${d.firma_denumire}, CUI: ${d.firma_cui}
Administrator: ${d.firma_administrator}

BENEFICIAR: ${d.client_denumire}, CUI: ${d.client_cui}
Administrator: ${d.client_administrator||"___"}

Art. 1. Contractul de servicii contabile inceteaza la data de ${d.data_reziliere}.

Art. 2. Ultima luna lucrata: ${d.ultima_luna_lucrata}

Art. 3. Ultima luna facturata: ${d.ultima_luna_facturata}

Art. 4. Motiv reziliere: ${d.motiv}

Art. 5. Partile declara ca nu au pretentii reciproce, cu exceptia sumelor
neachitate conform facturilor emise pana la data rezilierii.

Semnat astazi, ${d.data_act}.

PRESTATOR                        BENEFICIAR
${d.firma_denumire}              ${d.client_denumire}
${d.firma_administrator}         ${d.client_administrator||"___"}
Semnatura ___________            Semnatura ___________`,
  },
  {
    id:"aa5", denumire:"Act Aditional Reziliere Contract Resurse Umane", categorie:"Act Aditional", culoare:"red",
    campuri:["numar_act","data_act","numar_contract_ref","data_contract_ref","data_reziliere","ultima_luna_lucrata","ultima_luna_facturata","motiv"],
    gen:(d)=>`ACT ADITIONAL DE REZILIERE NR. ${d.numar_act} din ${d.data_act}
la Contractul de Resurse Umane nr. ${d.numar_contract_ref} din ${d.data_contract_ref}

PRESTATOR: ${d.firma_denumire}, CUI: ${d.firma_cui}
Administrator: ${d.firma_administrator}

BENEFICIAR: ${d.client_denumire}, CUI: ${d.client_cui}
Administrator: ${d.client_administrator||"___"}

Art. 1. Contractul de servicii HR inceteaza la data de ${d.data_reziliere}.

Art. 2. Ultima luna lucrata: ${d.ultima_luna_lucrata}

Art. 3. Ultima luna facturata: ${d.ultima_luna_facturata}

Art. 4. La data incetarii, Prestatorul transmite Beneficiarului:
Revisal actualizat, state de plata, dosare salariati.

Art. 5. Motiv reziliere: ${d.motiv}

Semnat astazi, ${d.data_act}.

PRESTATOR                        BENEFICIAR
${d.firma_denumire}              ${d.client_denumire}
${d.firma_administrator}         ${d.client_administrator||"___"}
Semnatura ___________            Semnatura ___________`,
  },
  {
    id:"aa6", denumire:"Act Aditional Reziliere Unilaterala", categorie:"Act Aditional", culoare:"red",
    campuri:["numar_act","data_act","numar_contract_ref","data_contract_ref","data_notificare","data_reziliere","ultima_luna_lucrata","motiv"],
    gen:(d)=>`NOTIFICARE DE REZILIERE UNILATERALA NR. ${d.numar_act} din ${d.data_act}
la Contractul nr. ${d.numar_contract_ref} din ${d.data_contract_ref}

DE LA: ${d.firma_denumire}
Administrator: ${d.firma_administrator}

CATRE: ${d.client_denumire}
In atentia: ${d.client_administrator||"___"}

Prin prezenta, ${d.firma_denumire} notifica rezilierea unilaterala a contractului
nr. ${d.numar_contract_ref}.

Data notificarii: ${d.data_notificare}
Data efectiva a incetarii: ${d.data_reziliere} (30 zile de la notificare)
Ultima luna lucrata: ${d.ultima_luna_lucrata}

Motiv: ${d.motiv}

Beneficiarul este rugat sa achite toate facturile restante pana la ${d.data_reziliere}.

Cu stima,
${d.firma_denumire}
${d.firma_administrator}
Data: ${d.data_act}`,
  },
  {
    id:"n1", denumire:"Notificare Neplata Servicii Contabile", categorie:"Notificare", culoare:"orange",
    campuri:["numar_notificare","data_notificare","suma_restanta","moneda","nr_facturi","termen_plata_final"],
    gen:(d)=>`NOTIFICARE NR. ${d.numar_notificare} din ${d.data_notificare}
Privind: Neplata serviciilor contabile

DE LA: ${d.firma_denumire}, CUI: ${d.firma_cui}
Administrator: ${d.firma_administrator}

CATRE: ${d.client_denumire}, CUI: ${d.client_cui}
In atentia: ${d.client_administrator||"___"}

Stimate/Stimata ${d.client_administrator||"client"},

Va notificam ca inregistrati restante la plata serviciilor de contabilitate
in suma totala de ${d.suma_restanta} ${d.moneda},
reprezentand contravaloarea a ${d.nr_facturi} facturi neachitate.

Va solicitam achitarea sumei restante pana cel tarziu la: ${d.termen_plata_final}

In caz de neachitare, vom proceda la:
- Suspendarea prestarii serviciilor de contabilitate
- Initierea procedurilor legale de recuperare a creantei

Va rugam sa contactati biroul nostru pentru orice clarificari.

Cu stima,
${d.firma_denumire}
${d.firma_administrator}
Data: ${d.data_notificare}`,
  },
];

const LABELS = {
  numar_contract:"Număr contract", numar_contract_ref:"Nr. contract referință",
  data_contract:"Data contractului", data_contract_ref:"Data contractului referință",
  data_start:"Data intrare în vigoare", prima_luna_tarifata:"Prima lună tarifată",
  tarif:"Tarif (RON/lună)", tarif_contabilitate:"Tarif contabilitate (RON/lună)",
  tarif_hr:"Tarif HR (RON/lună)", tarif_total:"Tarif TOTAL (RON/lună)",
  tarif_bilant:"Tarif bilanț (RON/an)", tarif_vechi:"Tarif vechi (RON)",
  tarif_nou:"Tarif nou (RON)", moneda:"Monedă", periodicitate:"Periodicitate facturare",
  termen_plata:"Termen plată (zile)", nr_salariati:"Număr salariați",
  an_bilant:"Anul bilanțului (ex: 2024)", ani_refacere:"Perioada refacere (ex: 2021-2023)",
  termen_finalizare:"Termen finalizare lucrări", numar_act:"Număr act adițional",
  data_act:"Data actului adițional", data_notificare:"Data notificării",
  data_intrare_vigoare:"Data intrare în vigoare", data_reziliere:"Data rezilierii",
  ultima_luna_lucrata:"Ultima lună lucrată", ultima_luna_facturata:"Ultima lună facturată",
  motiv:"Motiv", numar_notificare:"Număr notificare",
  suma_restanta:"Suma restantă (RON)", nr_facturi:"Număr facturi neachitate",
  termen_plata_final:"Termen limită plată", data_notificare:"Data notificării",
};

const CAT_COLOR = { "Contract":"blue","Act Aditional":"orange","Notificare":"red" };
const CULOARE = { blue:"bg-blue-100 text-blue-800", orange:"bg-orange-100 text-orange-800",
  green:"bg-green-100 text-green-800", red:"bg-red-100 text-red-800",
  indigo:"bg-indigo-100 text-indigo-800", yellow:"bg-yellow-100 text-yellow-800",
  purple:"bg-purple-100 text-purple-800" };

export default function Sabloane() {
  const [firme, setFirme] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFiltru, setCatFiltru] = useState("Toate");
  const [modal, setModal] = useState(false);
  const [sablon, setSablon] = useState(null);
  const [firmaId, setFirmaId] = useState("");
  const [clientId, setClientId] = useState("");
  const [valori, setValori] = useState({});
  const [text, setText] = useState("");
  const [step, setStep] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const [fs, cs] = await Promise.all([
          getDocs(collection(db, "firme_contabilitate")),
          getDocs(collection(db, "clienti")),
        ]);
        setFirme(fs.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => a.denumire?.localeCompare(b.denumire)));
        setClienti(cs.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => a.denumire?.localeCompare(b.denumire)));
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const firma = firme.find(f => f.id === firmaId);
  const client = clienti.find(c => c.id === clientId);

  const adresaFirma = firma ? [firma.strada, firma.numar, firma.localitate, firma.judet].filter(Boolean).join(", ") : "";
  const adresaClient = client ? [client.strada, client.numar, client.localitate, client.judet].filter(Boolean).join(", ") : "";

  const deschide = (s) => {
    setSablon(s); setFirmaId(""); setClientId("");
    setValori({}); setText(""); setStep(1); setModal(true);
  };

  const genereaza = () => {
    if (!firmaId) return alert("Selectează firma de contabilitate!");
    if (!clientId) return alert("Selectează clientul!");
    const date = {
      firma_denumire: firma?.denumire || "___",
      firma_cui: firma?.cui || "___",
      firma_nr_reg_com: firma?.nr_reg_com || "___",
      firma_adresa: adresaFirma || "___",
      firma_administrator: firma?.administrator || "___",
      client_denumire: client?.denumire || "___",
      client_cui: client?.cui || "___",
      client_nr_reg_com: client?.nr_reg_com || "___",
      client_adresa: adresaClient || "___",
      client_administrator: client?.administrator_nume || "___",
      ...valori,
    };
    setText(sablon.gen(date));
    setStep(3);
  };

  const descarca = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sablon.denumire} - ${client?.denumire || "client"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sabloaneFiltrate = SABLOANE.filter(s => catFiltru === "Toate" || s.categorie === catFiltru);

  return (
    <div className="p-6">
      <PageHeader
        title="Sabloane & Drafturi"
        subtitle="Selectezi firma + clientul, completezi cateva campuri, descarci documentul gata de semnat"
      />

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-5 text-xs text-indigo-800">
        <p className="font-bold mb-1">Cum functioneaza</p>
        <p>1. Alegi sablonul  →  2. Selectezi firma ta + clientul (datele se completeaza automat)  →  3. Completezi: nr. contract, data, tarif, prima luna  →  4. Descarci .txt si deschizi in Word</p>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {["Toate","Contract","Act Aditional","Notificare"].map(c => (
          <button key={c} onClick={() => setCatFiltru(c)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${catFiltru===c ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
            {c} {c !== "Toate" && `(${SABLOANE.filter(s=>s.categorie===c).length})`}
          </button>
        ))}
      </div>

      {loading ? <Loading /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sabloaneFiltrate.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5">
              <div className="mb-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CULOARE[s.culoare]}`}>{s.categorie}</span>
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-2">{s.denumire}</h3>
              <p className="text-xs text-gray-400 mb-4">
                {s.campuri.length} câmpuri de completat · restul din baza de date
              </p>
              <button onClick={() => deschide(s)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
                Genereaza Document
              </button>
            </div>
          ))}
        </div>
      )}

      {modal && sablon && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-bold text-gray-900">{sablon.denumire}</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5">

              {/* Steps */}
              <div className="flex items-center gap-3 mb-6">
                {[{n:1,l:"Selectare"},{n:2,l:"Date"},{n:3,l:"Document"}].map((s,i) => (
                  <div key={s.n} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step>=s.n?"bg-indigo-600 text-white":"bg-gray-100 text-gray-400"}`}>{s.n}</div>
                    <span className={`text-xs ${step>=s.n?"text-indigo-700 font-medium":"text-gray-400"}`}>{s.l}</span>
                    {i<2 && <div className={`w-8 h-0.5 ${step>s.n?"bg-indigo-300":"bg-gray-100"}`}/>}
                  </div>
                ))}
              </div>

              {/* STEP 1: Selectare */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Firma de contabilitate <span className="text-red-500">*</span></label>
                    <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={firmaId} onChange={e => setFirmaId(e.target.value)}>
                      <option value="">— Selecteaza firma ta —</option>
                      {firme.map(f => <option key={f.id} value={f.id}>{f.denumire_scurta||f.denumire}</option>)}
                    </select>
                    {firma && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                        <p className="font-bold">{firma.denumire}</p>
                        <p>Administrator: <strong>{firma.administrator||"— necompletat in Firme Contabilitate"}</strong></p>
                        <p>CUI: {firma.cui}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Client <span className="text-red-500">*</span></label>
                    <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={clientId} onChange={e => setClientId(e.target.value)}>
                      <option value="">— Selecteaza clientul —</option>
                      {clienti.map(c => <option key={c.id} value={c.id}>{c.denumire} — {c.cui}</option>)}
                    </select>
                    {client && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                        <p className="font-bold">{client.denumire}</p>
                        <p>Administrator: <strong>{client.administrator_nume||"— necompletat in Clienti Activi"}</strong></p>
                        <p>CUI: {client.cui}</p>
                      </div>
                    )}
                  </div>
                  {firma && !firma.administrator && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                      Administratorul firmei lipseste. Mergi la Firme Contabilitate si completeaza campul Administrator.
                    </div>
                  )}
                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button onClick={() => setModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Anuleaza</button>
                    <button onClick={() => { if(!firmaId||!clientId){alert("Selecteaza firma si clientul!");return;} setStep(2); }}
                      className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Continua</button>
                  </div>
                </div>
              )}

              {/* STEP 2: Completare campuri */}
              {step === 2 && (
                <div>
                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-green-800">
                      <p className="font-bold">Firma (automat)</p>
                      <p>{firma?.denumire}</p>
                      <p>Admin: {firma?.administrator}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-blue-800">
                      <p className="font-bold">Client (automat)</p>
                      <p>{client?.denumire}</p>
                      <p>Admin: {client?.administrator_nume||"— necompletat"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                    {sablon.campuri.map(camp => (
                      <div key={camp}>
                        <label className="block text-xs font-bold text-gray-600 mb-1">{LABELS[camp]||camp} <span className="text-red-400">*</span></label>
                        {camp === "moneda" ? (
                          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            value={valori[camp]||"RON"} onChange={e => setValori(p=>({...p,[camp]:e.target.value}))}>
                            <option value="RON">RON</option><option value="EUR">EUR</option>
                          </select>
                        ) : camp === "periodicitate" ? (
                          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            value={valori[camp]||"lunar"} onChange={e => setValori(p=>({...p,[camp]:e.target.value}))}>
                            <option value="lunar">Lunar</option><option value="trimestrial">Trimestrial</option><option value="semestrial">Semestrial</option><option value="anual">Anual</option>
                          </select>
                        ) : (
                          <input
                            type={camp.startsWith("data")||camp.endsWith("_act") ? "text" : "text"}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white"
                            value={valori[camp]||""}
                            onChange={e => setValori(p=>({...p,[camp]:e.target.value}))}
                            placeholder={camp.includes("data")||camp.includes("luna") ? "Ex: 01.01.2025" : camp.includes("tarif")||camp.includes("suma") ? "0" : ""}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between gap-3 pt-4 mt-3 border-t">
                    <button onClick={() => setStep(1)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Inapoi</button>
                    <button onClick={genereaza} className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Genereaza Documentul</button>
                  </div>
                </div>
              )}

              {/* STEP 3: Previzualizare */}
              {step === 3 && (
                <div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 font-mono text-xs text-gray-800 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                    {text}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Se descarca ca .txt — il deschizi in Word, adaugi antet si trimiti la semnat.
                  </p>
                  <div className="flex justify-between gap-3 pt-4 mt-3 border-t">
                    <button onClick={() => setStep(2)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Modifica datele</button>
                    <button onClick={descarca} className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Descarca .txt</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
