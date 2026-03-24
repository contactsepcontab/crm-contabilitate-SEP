import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import FirmeContabilitate from "./pages/FirmeContabilitate";
import ClientiActivi from "./pages/ClientiActivi";
import BazaClienti from "./pages/BazaClienti";
import FirmeSuspendate from "./pages/FirmeSuspendate";
import Rezilieri from "./pages/Rezilieri";
import ContracteEmise from "./pages/ContracteEmise";
import ComingSoon from "./pages/ComingSoon";

const MODULES = [
  {
    section: "Principal",
    items: [
      { id: "dashboard", label: "Dashboard", component: Dashboard },
    ]
  },
  {
    section: "Firme & Clienti",
    items: [
      { id: "firme_contabilitate", label: "Firme Contabilitate", component: FirmeContabilitate },
      { id: "clienti_activi", label: "Clienti Activi", component: ClientiActivi },
      { id: "baza_clienti", label: "Baza Clienti", component: BazaClienti },
      { id: "firme_suspendate", label: "Firme Suspendate", component: FirmeSuspendate },
      { id: "rezilieri", label: "Rezilieri", component: Rezilieri },
    ]
  },
  {
    section: "Contracte & Documente",
    items: [
      { id: "contracte_emise", label: "Contracte Emise", component: ContracteEmise },
      { id: "sabloane", label: "Sabloane Contracte", component: () => <ComingSoon title="Sabloane & Drafturi" description="Modele de contracte care se completeaza automat cu datele clientului. Export PDF si Word. — Etapa 3" /> },
      { id: "doc_incomplete", label: "Doc. Incomplete", component: () => <ComingSoon title="Documente Incomplete" description="Alerta automata pentru clientii cu dosare incomplete. — Etapa 3" /> },
    ]
  },
  {
    section: "Vanzari",
    items: [
      { id: "leaduri", label: "Lead-uri", component: () => <ComingSoon title="Potentiali Clienti (Lead-uri)" description="Pipeline complet: Nou → Contactat → Ofertat → Negociere → Asteptare semnare → Castigat/Pierdut. — Etapa 3" /> },
    ]
  },
  {
    section: "Administrare",
    items: [
      { id: "utilizatori", label: "Utilizatori", component: () => <ComingSoon title="Utilizatori & Drepturi" description="Gestionare utilizatori si roluri: Admin, Manager, Contabil, Operator. — Etapa 3" /> },
      { id: "setari", label: "Setari", component: () => <ComingSoon title="Setari" /> },
    ]
  }
];

const allItems = MODULES.flatMap(m => m.items);

export default function App() {
  const [currentModule, setCurrentModule] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const CurrentPage = allItems.find(m => m.id === currentModule)?.component || Dashboard;

  const navigate = (id) => {
    setCurrentModule(id);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-4 py-4 border-b border-slate-700`}>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-sm">SEP CRM</p>
            <p className="text-slate-400 text-xs">Contabilitate</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 transition-colors font-bold"
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {MODULES.map(section => (
          <div key={section.section} className="mb-4">
            {!collapsed && (
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 mb-1">
                {section.section}
              </p>
            )}
            {section.items.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors ${
                  currentModule === item.id
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                }`}
                title={collapsed ? item.label : ""}
              >
                {collapsed ? (
                  <span className="text-xs font-bold w-5 text-center flex-shrink-0">
                    {item.label.charAt(0)}
                  </span>
                ) : (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="p-3 border-t border-slate-700">
          <div className="bg-slate-700/50 rounded-lg p-3">
            <p className="text-xs text-slate-400">Firebase conectat</p>
            <p className="text-xs text-slate-500 mt-0.5">sep-crm-contabilitate</p>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside
        className={`${collapsed ? "w-16" : "w-60"} bg-slate-900 flex-col transition-all duration-200 fixed h-full z-30 hidden md:flex`}
      >
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 flex flex-col z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      <main className={`flex-1 ${collapsed ? "md:ml-16" : "md:ml-60"} transition-all duration-200 min-h-screen`}>
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-20">
          <button onClick={() => setMobileOpen(true)} className="text-gray-600 font-bold text-lg">≡</button>
          <span className="font-bold text-gray-800">
            {allItems.find(m => m.id === currentModule)?.label}
          </span>
        </div>

        <CurrentPage />
      </main>
    </div>
  );
}
