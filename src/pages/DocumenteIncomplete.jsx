import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Badge, Loading, Card, PageHeader, Btn } from "../components/UI";

// Documente obligatorii per tip entitate
const CERINTE = {
  SRL: [
    "Certificat inregistrare",
    "Act constitutiv",
    "CI administrator",
    "Dovada sediu",
  ],
  SA: [
    "Certificat inregistrare",
    "Act constitutiv",
    "CI administrator",
    "Dovada sediu",
  ],
  PFA: [
    "Certificat inregistrare",
    "CI titular",
    "Dovada sediu",
  ],
  II: [
    "Certificat inregistrare",
    "CI titular",
    "Dovada sediu",
  ],
  IF: [
    "Certificat inregistrare",
    "CI titular",
    "Dovada sediu",
  ],
  ONG: [
    "Certificat inregistrare",
    "Act constitutiv",
    "CI presedinte",
    "Dovada sediu",
  ],
  Asociatie: [
    "Certificat inregistrare",
    "Act constitutiv",
    "CI presedinte",
    "Dovada sediu",
  ],
  Fundatie: [
    "Certificat inregistrare",
    "Act constitutiv",
    "CI presedinte",
    "Dovada sediu",
  ],
  DEFAULT: [
    "Certificat inregistrare",
    "CI administrator",
    "Dovada sediu",
  ],
};

// Documente suplimentare conditionale
const CONDITIONALE = [
  { conditie: (c) => c.platitor_tva,       doc: "Certificat TVA" },
  { conditie: (c) => c.cui_intracomunitar, doc: "Certificat CUI intracomunitar" },
  { conditie: (c) => c.punct_lucru,        doc: "Documente punct de lucru" },
  { conditie: (c) => c.procura,            doc: "Procura" },
];

function getDocumenteNecesare(client) {
  const tip = client.tip_entitate || "DEFAULT";
  const baza = CERINTE[tip] || CERINTE.DEFAULT;
  const extra = CONDITIONALE
    .filter(c => c.conditie(client))
    .map(c => c.doc);
  return [...new Set([...baza, ...extra])];
}

function getDocumenteExistente(client) {
  if (!client.documente || !Array.isArray(client.documente)) return [];
  return client.documente.map(d =>
    (d.categorie || d.denumire || "").toLowerCase()
  );
}

function getLipsuri(client) {
  const necesare = getDocumenteNecesare(client);
  const existente = getDocumenteExistente(client);
  return necesare.filter(doc =>
    !existente.some(e => e.includes(doc.toLowerCase()) || doc.toLowerCase().includes(e))
  );
}

export default function DocumenteIncomplete() {
  const [clienti, setClienti] = useState([]);
  const [firme, setFirme] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtruFirma, setFiltruFirma] = useState("");
  const [filtruTip, setFiltruTip] = useState("incomplete"); // incomplete | complete | toate
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [cSnap, fSnap] = await Promise.all([
          getDocs(collection(db, "clienti")),
          getDocs(collection(db, "firme_contabilitate")),
        ]);
        const c = cSnap.docs.map(d => ({ ...d.data(), id: d.id }))
          .filter(c => c.status_client === "Activ" || c.status_client === "Suspendat")
          .sort((a, b) => a.denumire?.localeCompare(b.denumire));
        setClienti(c);
        setFirme(fSnap.docs.map(d => ({ ...d.data(), id: d.id })));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  // Calculeaza lipsuri pentru toti clientii
  const clientiCuLipsuri = clienti.map(c => ({
    ...c,
    lipsuri: getLipsuri(c),
    necesare: getDocumenteNecesare(c),
    existente: getDocumenteExistente(c),
  }));

  const filtered = clientiCuLipsuri.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.denumire?.toLowerCase().includes(q) ||
      c.cui?.includes(q) ||
      c.contabil_responsabil?.toLowerCase().includes(q);
    const matchFirma = !filtruFirma || c.firma_contabilitate_id === filtruFirma;
    const matchTip =
      filtruTip === "incomplete" ? c.lipsuri.length > 0 :
      filtruTip === "complete"   ? c.lipsuri.length === 0 :
      true;
    return matchSearch && matchFirma && matchTip;
  });

  const nrIncomplete = clientiCuLipsuri.filter(c => c.lipsuri.length > 0).length;
  const nrComplete = clientiCuLipsuri.filter(c => c.lipsuri.length === 0).length;
  const totalLipsuri = clientiCuLipsuri.reduce((sum, c) => sum + c.lipsuri.length, 0);

  const getProcentCompletare = (c) => {
    if (!c.necesare.length) return 100;
    return Math.round(((c.necesare.length - c.lipsuri.length) / c.necesare.length) * 100);
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Documente Incomplete"
        subtitle="Verificare automata a dosarelor clientilor activi"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${filtruTip === "incomplete" ? "border-danger-200 bg-danger-50" : ""}`}
          onClick={() => setFiltruTip("incomplete")}>
          <p className="text-xs text-slate-400 mb-1">Dosare incomplete</p>
          <p className="text-2xl font-bold text-danger-400">{nrIncomplete}</p>
          <p className="text-xs text-slate-400 mt-1">{totalLipsuri} documente lipsa total</p>
        </Card>
        <Card className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${filtruTip === "complete" ? "border-success-200 bg-success-50" : ""}`}
          onClick={() => setFiltruTip("complete")}>
          <p className="text-xs text-slate-400 mb-1">Dosare complete</p>
          <p className="text-2xl font-bold text-success-400">{nrComplete}</p>
        </Card>
        <Card className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${filtruTip === "toate" ? "border-primary-200 bg-primary-50" : ""}`}
          onClick={() => setFiltruTip("toate")}>
          <p className="text-xs text-slate-400 mb-1">Total clienti verificati</p>
          <p className="text-2xl font-bold text-primary-500">{clientiCuLipsuri.length}</p>
        </Card>
      </div>

      {/* Nota */}
      <div className="bg-accent-50 border border-accent-200 rounded-xl p-4 mb-5 text-sm text-accent-700">
        <p className="font-semibold mb-1">Cum functioneaza verificarea automata</p>
        <p className="text-xs">
          Sistemul verifica documentele incarcate in fisa fiecarui client si le compara cu lista obligatorie
          per tip de entitate (SRL, PFA, ONG etc.) si conditii specifice (platitor TVA, punct de lucru, procura).
          Adauga documentele lipsa direct din fisa clientului — modulul Clienti Activi.
        </p>
      </div>

      {/* Filtre */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cauta dupa denumire, CUI, contabil..."
          className="flex-1 min-w-64 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white" />
        <select value={filtruFirma} onChange={e => setFiltruFirma(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400">
          <option value="">Toate firmele</option>
          {firme.map(f => <option key={f.id} value={f.id}>{f.denumire_scurta || f.denumire}</option>)}
        </select>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[
            { key: "incomplete", label: "Incomplete" },
            { key: "complete",   label: "Complete" },
            { key: "toate",      label: "Toate" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFiltruTip(tab.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                filtruTip === tab.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? <Loading /> : filtered.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-base font-semibold text-slate-600 mb-1">
            {filtruTip === "incomplete" ? "Toti clientii au dosarul complet!" : "Niciun rezultat"}
          </h3>
          {filtruTip === "incomplete" && (
            <p className="text-sm text-success-400 font-semibold mt-2">Excelent!</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(client => {
            const proc = getProcentCompletare(client);
            const isOpen = selected === client.id;
            return (
              <Card key={client.id}
                className={`transition-all hover:shadow-md ${client.lipsuri.length > 0 ? "border-l-4 border-l-danger-300" : "border-l-4 border-l-success-400"}`}>
                <div className="p-4">
                  <div className="flex items-center justify-between cursor-pointer"
                    onClick={() => setSelected(isOpen ? null : client.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-800">{client.denumire}</h3>
                        <Badge text={client.tip_entitate || "SRL"} color="blue" />
                        {client.lipsuri.length === 0
                          ? <Badge text="Dosar complet" color="green" />
                          : <Badge text={`${client.lipsuri.length} doc. lipsa`} color="red" />
                        }
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-slate-400 flex-wrap">
                        <span>CUI: <strong>{client.cui}</strong></span>
                        {client.firma_contabilitate_denumire && (
                          <span>Firma: {client.firma_contabilitate_denumire}</span>
                        )}
                        {client.contabil_responsabil && (
                          <span>Contabil: {client.contabil_responsabil}</span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <div className="w-24 hidden md:block">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Dosar</span>
                          <span className={proc === 100 ? "text-success-400 font-bold" : "text-danger-400 font-bold"}>{proc}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${proc === 100 ? "bg-success-400" : proc >= 50 ? "bg-warning-400" : "bg-danger-400"}`}
                            style={{ width: `${proc}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-slate-300 text-lg">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Detalii expandabile */}
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Documente lipsa */}
                        {client.lipsuri.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-danger-400 uppercase tracking-wide mb-2">
                              Documente lipsa ({client.lipsuri.length})
                            </p>
                            <div className="space-y-1">
                              {client.lipsuri.map((doc, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <div className="w-4 h-4 rounded border-2 border-danger-300 flex-shrink-0" />
                                  <span className="text-slate-700">{doc}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Documente existente */}
                        <div>
                          <p className="text-xs font-bold text-success-400 uppercase tracking-wide mb-2">
                            Documente prezente ({client.necesare.length - client.lipsuri.length} din {client.necesare.length})
                          </p>
                          <div className="space-y-1">
                            {client.necesare.filter(d => !client.lipsuri.includes(d)).map((doc, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <div className="w-4 h-4 rounded bg-success-400 flex-shrink-0 flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <span className="text-slate-500">{doc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      {client.lipsuri.length > 0 && (
                        <p className="text-xs text-slate-400 mt-3">
                          Adauga documentele lipsa din modulul <strong>Clienti Activi → fisa clientului → tab Documente</strong>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
