import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Badge, statusClientColor, Loading, Card, PageHeader } from "../components/UI";

const STATUS_CLIENT = ["Activ", "Suspendat", "Reziliat", "Prospect"];
const VECTORI_FISCALI = ["Lunar", "Trimestrial", "Semestrial", "Anual", "Nu are"];

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

  useEffect(() => {
    const load = async () => {
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
    load();
  }, []);

  // Construim datele imbogatite cu contracte
  const clientiCuContracte = clienti.map(c => {
    const contracteClient = contracte.filter(ctr => ctr.client_id === c.id && ctr.status_contract === "Activ");
    const contractPrincipal = contracteClient[0] || null;
    return {
      ...c,
      contracte_active: contracteClient,
      nr_contract: contractPrincipal?.numar_contract || "",
      data_contract: contractPrincipal?.data_contract || "",
      tarif_contract: contractPrincipal?.tarif || "",
      moneda_contract: contractPrincipal?.moneda || "RON",
      periodicitate_contract: contractPrincipal?.periodicitate_facturare || "",
      tip_contract: contractPrincipal?.tip_contract || "",
    };
  });

  const filtered = clientiCuContracte.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.denumire?.toLowerCase().includes(q) ||
      c.cui?.includes(q) ||
      c.contabil_responsabil?.toLowerCase().includes(q) ||
      c.nr_contract?.toLowerCase().includes(q);
    const matchStatus = !filtruStatus || c.status_client === filtruStatus;
    const matchFirma = !filtruFirma || c.firma_contabilitate_id === filtruFirma;
    const matchTVA = !filtruTVA || (filtruTVA === "da" ? c.platitor_tva : !c.platitor_tva);
    const matchVector = !filtruVector || c.vector_fiscal === filtruVector;
    const matchPunctLucru = !filtruPunctLucru || (filtruPunctLucru === "da" ? c.punct_lucru : !c.punct_lucru);
    const matchCUIIntra = !filtruCUIIntra || (filtruCUIIntra === "da" ? c.cui_intracomunitar : !c.cui_intracomunitar);
    const matchProcura = !filtruProcura || (filtruProcura === "da" ? c.procura : !c.procura);
    const matchPeriodicitate = !filtruPeriodicitate || c.periodicitate_contract === filtruPeriodicitate;

    let matchServicii = true;
    if (filtruServicii === "contabilitate") matchServicii = c.serviciu_contabilitate;
    else if (filtruServicii === "bilant") matchServicii = c.serviciu_bilant && !c.serviciu_contabilitate;
    else if (filtruServicii === "contab_bilant") matchServicii = c.serviciu_contabilitate && c.serviciu_bilant;
    else if (filtruServicii === "hr") matchServicii = c.serviciu_hr;

    return matchSearch && matchStatus && matchFirma && matchTVA && matchVector &&
      matchPunctLucru && matchCUIIntra && matchProcura && matchServicii && matchPeriodicitate;
  });

  const resetFiltre = () => {
    setSearch("");
    setFiltruStatus("");
    setFiltruFirma("");
    setFiltruTVA("");
    setFiltruVector("");
    setFiltruPunctLucru("");
    setFiltruCUIIntra("");
    setFiltruProcura("");
    setFiltruServicii("");
    setFiltruPeriodicitate("");
  };

  const nrFiltreActive = [filtruStatus, filtruFirma, filtruTVA, filtruVector,
    filtruPunctLucru, filtruCUIIntra, filtruProcura, filtruServicii, filtruPeriodicitate]
    .filter(Boolean).length;

  return (
    <div className="p-6">
      <PageHeader
        title="Baza Clienților"
        subtitle={`${filtered.length} din ${clienti.length} clienți`}
      />

      {/* Bara de cautare si butoane filtre */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Caută după denumire, CUI, contabil, nr. contract..."
          className="flex-1 min-w-64 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
        <button
          onClick={() => setShowFiltre(!showFiltre)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            showFiltre || nrFiltreActive > 0
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Filtre avansate {nrFiltreActive > 0 && `(${nrFiltreActive})`}
        </button>
        {nrFiltreActive > 0 && (
          <button
            onClick={resetFiltre}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
          >
            Resetează filtrele
          </button>
        )}
      </div>

      {/* Filtre avansate expandabile */}
      {showFiltre && (
        <div className="bg-gray-50 rounded-xl p-4 mb-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Status client</label>
            <select
              value={filtruStatus}
              onChange={e => setFiltruStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Toate</option>
              {STATUS_CLIENT.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Firma contabilitate</label>
            <select
              value={filtruFirma}
              onChange={e => setFiltruFirma(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Toate</option>
              {firme.map(f => <option key={f.id} value={f.id}>{f.denumire_scurta || f.denumire}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Servicii</label>
            <select
              value={filtruServicii}
              onChange={e => setFiltruServicii(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Toate</option>
              <option value="contabilitate">Contabilitate</option>
              <option value="bilant">Doar bilanț</option>
              <option value="contab_bilant">Contabilitate + bilanț</option>
              <option value="hr">HR</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Periodicitate plată</label>
            <select
              value={filtruPeriodicitate}
              onChange={e => setFiltruPeriodicitate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Toate</option>
              {VECTORI_FISCALI.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Plătitor TVA</label>
            <select
              value={filtruTVA}
              onChange={e => setFiltruTVA(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Toate</option>
              <option value="da">Da</option>
              <option value="nu">Nu</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Vector fiscal</label>
            <select
              value={filtruVector}
              onChange={e => setFiltruVector(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Toate</option>
              {VECTORI_FISCALI.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Punct de lucru</label>
            <select
              value={filtruPunctLucru}
              onChange={e => setFiltruPunctLucru(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Toate</option>
              <option value="da">Da</option>
              <option value="nu">Nu</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">CUI intracomunitar</label>
            <select
              value={filtruCUIIntra}
              onChange={e => setFiltruCUIIntra(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Toate</option>
              <option value="da">Da</option>
              <option value="nu">Nu</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Procură</label>
            <select
              value={filtruProcura}
              onChange={e => setFiltruProcura(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Toate</option>
              <option value="da">Da</option>
              <option value="nu">Nu</option>
            </select>
          </div>
        </div>
      )}

      {/* Tabel */}
      {loading ? <Loading /> : filtered.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Niciun client nu corespunde filtrelor</h3>
          <button onClick={resetFiltre} className="text-sm text-indigo-600 hover:underline mt-2">Resetează filtrele</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">CUI</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Firma</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Nr. Contract</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Tarif</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Detalii</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(client => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{client.denumire}</p>
                      {client.contabil_responsabil && (
                        <p className="text-xs text-gray-400">{client.contabil_responsabil}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{client.cui}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">{client.firma_contabilitate_denumire || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {client.nr_contract ? (
                        <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {client.nr_contract}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{client.data_contract || "—"}</td>
                    <td className="px-4 py-3">
                      {client.tarif_contract ? (
                        <span className="font-semibold text-gray-800">
                          {client.tarif_contract} {client.moneda_contract}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {client.tarif_total ? `${client.tarif_total} RON` : "—"}
                        </span>
                      )}
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
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            {filtered.length} client{filtered.length !== 1 ? "i" : ""} afișat{filtered.length !== 1 ? "i" : ""}
            {nrFiltreActive > 0 && ` (${nrFiltreActive} filtr${nrFiltreActive > 1 ? "e" : "u"} activ${nrFiltreActive > 1 ? "e" : ""})`}
          </div>
        </div>
      )}
    </div>
  );
}
