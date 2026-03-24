import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Badge, Loading, Card, PageHeader } from "../components/UI";

export default function FirmeSuspendate() {
  const [clienti, setClienti] = useState([]);
  const [firme, setFirme] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtruFirma, setFiltruFirma] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [cSnap, fSnap] = await Promise.all([
          getDocs(collection(db, "clienti")),
          getDocs(collection(db, "firme_contabilitate")),
        ]);
        const totiClientii = cSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        setClienti(totiClientii.filter(c => c.firma_suspendata));
        setFirme(fSnap.docs.map(d => ({ ...d.data(), id: d.id })));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = clienti.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.denumire?.toLowerCase().includes(q) || c.cui?.includes(q);
    const matchFirma = !filtruFirma || c.firma_contabilitate_id === filtruFirma;
    return matchSearch && matchFirma;
  });

  const hoje = new Date().toISOString().split("T")[0];

  const getStatusSuspendare = (c) => {
    if (!c.data_reactivare) return "activa";
    return c.data_reactivare >= hoje ? "activa" : "expirata";
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Firme Suspendate ONRC"
        subtitle={`${clienti.length} client${clienti.length !== 1 ? "i" : ""} cu firmă suspendată`}
      />

      {/* Filtre */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Caută după denumire sau CUI..."
          className="flex-1 min-w-64 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
        <select
          value={filtruFirma}
          onChange={e => setFiltruFirma(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Toate firmele</option>
          {firme.map(f => (
            <option key={f.id} value={f.id}>{f.denumire_scurta || f.denumire}</option>
          ))}
        </select>
      </div>

      {loading ? <Loading /> : filtered.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Nu există firme suspendate</h3>
          <p className="text-sm text-gray-400">Clienții cu firma suspendată ONRC vor apărea aici automat.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(client => {
            const statusSusp = getStatusSuspendare(client);
            return (
              <Card key={client.id} className="hover:shadow-md transition-shadow cursor-pointer" >
                <div
                  className="p-4 flex items-center justify-between"
                  onClick={() => setSelected(selected?.id === client.id ? null : client)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900">{client.denumire}</h3>
                      <Badge text={client.tip_entitate || "SRL"} color="blue" />
                      <Badge
                        text={statusSusp === "activa" ? "Suspendată activ" : "Suspendare expirată"}
                        color={statusSusp === "activa" ? "red" : "gray"}
                      />
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                      <span>CUI: <strong>{client.cui}</strong></span>
                      {client.firma_contabilitate_denumire && (
                        <span>Firma: {client.firma_contabilitate_denumire}</span>
                      )}
                      {client.contabil_responsabil && (
                        <span>Contabil: {client.contabil_responsabil}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-6 text-xs text-right ml-4 flex-shrink-0">
                    <div>
                      <p className="text-gray-400 mb-0.5">Data suspendării</p>
                      <p className="font-semibold text-red-600">{client.data_suspendare || "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">Reactivare estimată</p>
                      <p className="font-semibold text-green-600">{client.data_reactivare || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Detalii expandabile */}
                {selected?.id === client.id && (
                  <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 rounded-b-xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <p className="text-gray-400 mb-1">Status client</p>
                        <Badge text={client.status_client || "Activ"} color={
                          client.status_client === "Activ" ? "green" :
                          client.status_client === "Suspendat" ? "yellow" : "red"
                        } />
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Plătitor TVA</p>
                        <Badge text={client.platitor_tva ? "DA" : "NU"} color={client.platitor_tva ? "green" : "gray"} />
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Vector fiscal</p>
                        <p className="font-medium text-gray-700">{client.vector_fiscal || "—"}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Nr. salariați</p>
                        <p className="font-medium text-gray-700">{client.nr_salariati || "—"}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Persoană contact</p>
                        <p className="font-medium text-gray-700">{client.persoana_contact_nume || "—"}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Telefon</p>
                        <p className="font-medium text-gray-700">{client.persoana_contact_telefon || "—"}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Tarif lunar</p>
                        <p className="font-medium text-gray-700">
                          {client.tarif_total ? `${client.tarif_total} ${client.moneda || "RON"}/lună` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Procură</p>
                        <Badge text={client.procura ? "DA" : "NU"} color={client.procura ? "green" : "gray"} />
                      </div>
                    </div>
                    {client.observatii_generale && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-400 mb-1">Observații</p>
                        <p className="text-sm text-gray-600">{client.observatii_generale}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
