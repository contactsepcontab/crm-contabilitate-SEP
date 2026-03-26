import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Badge, Loading } from "../components/UI";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [firmeSnap, clientiSnap] = await Promise.all([
          getDocs(collection(db, "firme_contabilitate")),
          getDocs(collection(db, "clienti")),
        ]);
        const firme = firmeSnap.docs.map(d => d.data());
        const clienti = clientiSnap.docs.map(d => d.data());
        setStats({
          firmeTotal: firme.length,
          firmeActive: firme.filter(f => f.status_firma === "Activa").length,
          clientiTotal: clienti.length,
          clientiActivi: clienti.filter(c => c.status_client === "Activ").length,
          clientiSuspendati: clienti.filter(c => c.status_client === "Suspendat").length,
          clientiReziliati: clienti.filter(c => c.status_client === "Reziliat").length,
          clientiProspecti: clienti.filter(c => c.status_client === "Prospect").length,
          firmeSuspendate: clienti.filter(c => c.firma_suspendata).length,
          platitoriTVA: clienti.filter(c => c.platitor_tva && c.status_client === "Activ").length,
          cuHR: clienti.filter(c => c.serviciu_hr && c.status_client === "Activ").length,
          cuBilant: clienti.filter(c => c.serviciu_bilant && c.status_client === "Activ").length,
          venitEstimat: clienti
            .filter(c => c.status_client === "Activ" && c.tarif_total)
            .reduce((sum, c) => sum + (parseFloat(c.tarif_total) || 0), 0),
        });
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="p-6"><Loading /></div>;

  const StatCard = ({ label, value, sub, color, bgColor }) => (
    <div className={`${bgColor || "bg-white"} rounded-2xl p-5 border border-slate-100 `}>
      <div>
        <p className="text-sm text-slate-400 mb-1">{label}</p>
        <p className={`text-3xl font-bold ${color || "text-slate-800"}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-0.5">Bun venit în CRM-ul firmei tale de contabilitate</p>
      </div>

      {/* Statistici principale */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Firme contabilitate" value={stats.firmeActive} sub={`din ${stats.firmeTotal} total`} color="text-primary-500" />
        <StatCard label="Clienți activi" value={stats.clientiActivi} sub={`din ${stats.clientiTotal} total`} color="text-success-400" />
        <StatCard label="Firme suspendate ONRC" value={stats.firmeSuspendate} color="text-warning-500" />
        <StatCard label="Venit estimat lunar" value={`${stats.venitEstimat.toFixed(0)} RON`} sub="din clienți activi" color="text-accent-500" />
      </div>

      {/* Status clienti */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Activi" value={stats.clientiActivi} color="text-success-400" bgColor="bg-success-50" />
        <StatCard label="Suspendați" value={stats.clientiSuspendati} color="text-warning-500" bgColor="bg-warning-50" />
        <StatCard label="Reziliați" value={stats.clientiReziliati} color="text-danger-400" bgColor="bg-danger-50" />
        <StatCard label="Prospecți" value={stats.clientiProspecti} color="text-accent-500" bgColor="bg-accent-50" />
      </div>

      {/* Servicii */}
      <div className="bg-white rounded-xl border border-slate-100  p-5 mb-6">
        <h2 className="text-sm font-bold text-slate-600 mb-4">Distribuție servicii (clienți activi)</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Plătitori TVA", value: stats.platitoriTVA, color: "bg-primary-50 text-primary-500" },
            { label: "Cu serviciu HR", value: stats.cuHR, color: "bg-warning-100 text-warning-600" },
            { label: "Cu bilanț anual", value: stats.cuBilant, color: "bg-success-50 text-success-400" },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-xl p-4`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Module in constructie */}
      <div className="bg-warning-50 border border-warning-200 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-warning-600 mb-3">Module în construcție</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            "Firme Suspendate", "Rezilieri", "Contracte", "Șabloane",
            "Baza Clienți", "Documente Incomplete", "Lead-uri", "Utilizatori"
          ].map(m => (
            <div key={m} className="bg-white rounded-lg px-3 py-2 text-xs text-warning-500 border border-amber-100 font-medium">
              {m}
            </div>
          ))}
        </div>
        <p className="text-xs text-amber-600 mt-3">Le construim modul cu modul. Revenim cu actualizări!</p>
      </div>
    </div>
  );
}

