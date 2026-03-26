import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Badge, Loading, Card } from "../components/UI";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [firmeSnap, clientiSnap, contracteSnap, leaduriSnap, taskuriSnap] = await Promise.all([
          getDocs(collection(db, "firme_contabilitate")),
          getDocs(collection(db, "clienti")),
          getDocs(collection(db, "contracte")),
          getDocs(collection(db, "leaduri")),
          getDocs(collection(db, "taskuri")),
        ]);

        const firme = firmeSnap.docs.map(d => d.data());
        const clienti = clientiSnap.docs.map(d => d.data());
        const contracte = contracteSnap.docs.map(d => d.data());
        const leaduri = leaduriSnap.docs.map(d => d.data());
        const taskuri = taskuriSnap.docs.map(d => d.data());

        const azi = new Date().toISOString().split("T")[0];
        const acum30 = new Date(); acum30.setDate(acum30.getDate() + 30);
        const acum30str = acum30.toISOString().split("T")[0];
        const acum90 = new Date(); acum90.setDate(acum90.getDate() - 90);

        // Luna curenta
        const lunaAzi = azi.slice(0, 7);

        setData({
          // Firme
          firmeTotal: firme.length,
          firmeActive: firme.filter(f => f.status_firma === "Activa").length,
          // Clienti
          clientiTotal: clienti.length,
          clientiActivi: clienti.filter(c => c.status_client === "Activ").length,
          clientiSuspendati: clienti.filter(c => c.status_client === "Suspendat").length,
          clientiReziliati: clienti.filter(c => c.status_client === "Reziliat").length,
          clientiNoi: clienti.filter(c =>
            c.data_inceput_colaborare && c.data_inceput_colaborare >= acum90.toISOString().split("T")[0]
          ).length,
          firmeSuspendate: clienti.filter(c => c.firma_suspendata).length,
          platitoriTVA: clienti.filter(c => c.platitor_tva && c.status_client === "Activ").length,
          cuHR: clienti.filter(c => c.serviciu_hr && c.status_client === "Activ").length,
          cuBilant: clienti.filter(c => c.serviciu_bilant && c.status_client === "Activ").length,
          // Venit estimat
          venitEstimat: clienti
            .filter(c => c.status_client === "Activ" && c.tarif_total)
            .reduce((sum, c) => sum + (parseFloat(c.tarif_total) || 0), 0),
          // Contracte
          contracteActive: contracte.filter(c => c.status_contract === "Activ").length,
          contracteExpiraCurand: contracte.filter(c =>
            c.status_contract === "Activ" && c.data_sfarsit &&
            c.data_sfarsit >= azi && c.data_sfarsit <= acum30str
          ).length,
          contracteExpirate: contracte.filter(c =>
            c.status_contract === "Activ" && c.data_sfarsit && c.data_sfarsit < azi
          ).length,
          // Leaduri
          leaduriActive: leaduri.filter(l => l.stadiu !== "castigat" && l.stadiu !== "pierdut").length,
          leaduriCastigate: leaduri.filter(l => l.stadiu === "castigat").length,
          leaduriAsteptare: leaduri.filter(l =>
            l.data_urmatorului_pas && l.data_urmatorului_pas <= azi &&
            l.stadiu !== "castigat" && l.stadiu !== "pierdut"
          ).length,
          // Taskuri
          taskuriDeFacut: taskuri.filter(t => t.status === "De facut").length,
          taskuriUrgente: taskuri.filter(t => t.prioritate === "Urgenta" && t.status !== "Facut").length,
          taskuriIntarziate: taskuri.filter(t =>
            t.status !== "Facut" && t.data_scadenta && t.data_scadenta < azi
          ).length,
          taskuriFacute: taskuri.filter(t => t.status === "Facut").length,
        });
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="p-6"><Loading /></div>;

  const ora = new Date().getHours();
  const salut = ora < 12 ? "Buna dimineata" : ora < 18 ? "Buna ziua" : "Buna seara";

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">{salut}!</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {new Date().toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Alerte active */}
      {(data.taskuriUrgente > 0 || data.contracteExpiraCurand > 0 || data.leaduriAsteptare > 0 || data.taskuriIntarziate > 0) && (
        <div className="space-y-2">
          {data.taskuriUrgente > 0 && (
            <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-danger-400">
                {data.taskuriUrgente} task{data.taskuriUrgente > 1 ? "uri" : ""} urgent{data.taskuriUrgente > 1 ? "e" : ""} nerezolvat{data.taskuriUrgente > 1 ? "e" : ""}
              </p>
              <Badge text="Urgent" color="red" />
            </div>
          )}
          {data.taskuriIntarziate > 0 && (
            <div className="bg-warning-50 border border-warning-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-warning-600">
                {data.taskuriIntarziate} task{data.taskuriIntarziate > 1 ? "uri" : ""} cu termen depasit
              </p>
              <Badge text="Intarziat" color="orange" />
            </div>
          )}
          {data.contracteExpiraCurand > 0 && (
            <div className="bg-warning-50 border border-warning-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-warning-600">
                {data.contracteExpiraCurand} contract{data.contracteExpiraCurand > 1 ? "e" : ""} expira in urmatoarele 30 de zile
              </p>
              <Badge text="Atentie" color="yellow" />
            </div>
          )}
          {data.leaduriAsteptare > 0 && (
            <div className="bg-accent-50 border border-accent-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-accent-600">
                {data.leaduriAsteptare} lead-uri cu actiuni scadente astazi
              </p>
              <Badge text="De actionar" color="blue" />
            </div>
          )}
        </div>
      )}

      {/* KPI principale */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Portofoliu</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Firme contabilitate" value={data.firmeActive}
            sub={`din ${data.firmeTotal} total`} color="text-primary-500" />
          <StatCard label="Clienti activi" value={data.clientiActivi}
            sub={`din ${data.clientiTotal} total`} color="text-success-400" />
          <StatCard label="Firme suspendate ONRC" value={data.firmeSuspendate}
            color={data.firmeSuspendate > 0 ? "text-warning-500" : "text-slate-400"} />
          <StatCard label="Venit estimat lunar"
            value={`${data.venitEstimat.toFixed(0)} RON`}
            sub="din clienti activi" color="text-accent-500" />
        </div>
      </div>

      {/* Status clienti */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Status clienti</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Activi" value={data.clientiActivi} color="text-success-400" bg="bg-success-50" />
          <StatCard label="Suspendati" value={data.clientiSuspendati} color="text-warning-500" bg="bg-warning-50" />
          <StatCard label="Reziliati" value={data.clientiReziliati} color="text-danger-400" bg="bg-danger-50" />
          <StatCard label="Clienti noi (90 zile)" value={data.clientiNoi} color="text-accent-500" bg="bg-accent-50" />
        </div>
      </div>

      {/* Grid 3 coloane: Servicii | Contracte | Lead-uri & Taskuri */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Servicii */}
        <Card className="p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Servicii active</p>
          <div className="space-y-3">
            {[
              { label: "Platitori TVA",  value: data.platitoriTVA, color: "bg-primary-500" },
              { label: "Cu serviciu HR", value: data.cuHR,         color: "bg-warning-400" },
              { label: "Cu bilant anual",value: data.cuBilant,     color: "bg-success-400" },
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">{s.label}</span>
                  <span className="font-bold text-slate-800">{s.value}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className={`${s.color} h-1.5 rounded-full transition-all`}
                    style={{ width: `${data.clientiActivi ? (s.value / data.clientiActivi) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Contracte */}
        <Card className="p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contracte</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Active</span>
              <span className="font-bold text-success-400 text-lg">{data.contracteActive}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Expira in 30 zile</span>
              <span className={`font-bold text-lg ${data.contracteExpiraCurand > 0 ? "text-warning-500" : "text-slate-300"}`}>
                {data.contracteExpiraCurand}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Expirate</span>
              <span className={`font-bold text-lg ${data.contracteExpirate > 0 ? "text-danger-400" : "text-slate-300"}`}>
                {data.contracteExpirate}
              </span>
            </div>
          </div>
        </Card>

        {/* Lead-uri & Taskuri */}
        <Card className="p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Lead-uri & Taskuri</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Lead-uri active</span>
              <span className="font-bold text-accent-500 text-lg">{data.leaduriActive}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Lead-uri castigate</span>
              <span className="font-bold text-success-400 text-lg">{data.leaduriCastigate}</span>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Taskuri de facut</span>
                <span className={`font-bold text-lg ${data.taskuriDeFacut > 0 ? "text-danger-400" : "text-slate-300"}`}>
                  {data.taskuriDeFacut}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Taskuri finalizate</span>
              <span className="font-bold text-success-400 text-lg">{data.taskuriFacute}</span>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
}

function StatCard({ label, value, sub, color, bg }) {
  return (
    <Card className={`p-4 ${bg || "bg-white"}`}>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || "text-slate-800"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </Card>
  );
}

