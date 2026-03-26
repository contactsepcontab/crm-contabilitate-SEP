import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import FirmeContabilitate from "./pages/FirmeContabilitate";
import ClientiActivi from "./pages/ClientiActivi";
import BazaClienti from "./pages/BazaClienti";
import FirmeSuspendate from "./pages/FirmeSuspendate";
import Rezilieri from "./pages/Rezilieri";
import ContracteEmise from "./pages/ContracteEmise";
import DocumenteIncomplete from "./pages/DocumenteIncomplete";
import Leaduri from "./pages/Leaduri";
import EmailMarketing from "./pages/EmailMarketing";
import Taskuri from "./pages/Taskuri";
import ImportClienti from "./pages/ImportClienti";
import Utilizatori from "./pages/Utilizatori";
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
      { id: "clienti_activi",      label: "Clienti Activi",      component: ClientiActivi },
      { id: "baza_clienti",        label: "Baza Clienti",        component: BazaClienti },
      { id: "firme_suspendate",    label: "Firme Suspendate",    component: FirmeSuspendate },
      { id: "rezilieri",           label: "Rezilieri",           component: Rezilieri },
    ]
  },
  {
    section: "Contracte & Documente",
    items: [
      { id: "contracte_emise",     label: "Contracte Emise",     component: ContracteEmise },
      { id: "sabloane",            label: "Sabloane Contracte",  component: () => <ComingSoon title="Sabloane & Drafturi" description="Completare automata + export PDF/Word. Disponibil in versiunea urmatoare." /> },
      { id: "doc_incomplete",      label: "Doc. Incomplete",     component: DocumenteIncomplete },
    ]
  },
  {
    section: "Vanzari & Marketing",
    items: [
      { id: "leaduri",             label: "Lead-uri",            component: Leaduri },
      { id: "email_marketing",     label: "Email Marketing",     component: EmailMarketing },
    ]
  },
  {
    section: "Productivitate",
    items: [
      { id: "taskuri",             label: "Taskuri & To-Do",     component: Taskuri },
    ]
  },
  {
    section: "Administrare",
    items: [
      { id: "import_clienti",      label: "Import Clienti CSV",  component: ImportClienti },
      { id: "utilizatori",         label: "Utilizatori",         component: Utilizatori },
      { id: "setari",              label: "Setari",              component: () => <ComingSoon title="Setari" description="Configurari generale ale aplicatiei." /> },
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
      {/* Logo */}
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-4 py-4 border-b border-slate-700/60`}>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-sm tracking-tight">SEP CRM</p>
            <p className="text-slate-400 text-xs mt-0.5">Contabilitate</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-500 hover:text-white w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700 transition-all font-bold text-sm"
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {MODULES.map(section => (
          <div key={section.section} className="mb-3">
            {!collapsed && (
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-2">
                {section.section}
              </p>
            )}
            {section.items.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-sm font-medium transition-all ${
                  currentModule === item.id
                    ? "bg-primary-500 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-700/40 hover:text-slate-100"
                }`}
                title={collapsed ? item.label : ""}
              >
                {collapsed ? (
                  <span className="text-[11px] font-bold w-5 text-center flex-shrink-0 tracking-tight">
                    {item.label.slice(0, 2)}
                  </span>
                ) : (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-700/60">
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success-400 rounded-full"></div>
              <p className="text-xs text-slate-300 font-medium">Firebase conectat</p>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 ml-4">sep-crm-contabilitate</p>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar Desktop */}
      <aside className={`${collapsed ? "w-14" : "w-56"} bg-slate-900 flex-col transition-all duration-200 fixed h-full z-30 hidden md:flex`}>
        <SidebarContent />
      </aside>

      {/* Sidebar Mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 h-full w-56 bg-slate-900 flex flex-col z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className={`flex-1 ${collapsed ? "md:ml-14" : "md:ml-56"} transition-all duration-200 min-h-screen`}>
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
          <button onClick={() => setMobileOpen(true)}
            className="text-slate-600 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
            ≡
          </button>
          <span className="font-bold text-slate-700 text-sm">
            {allItems.find(m => m.id === currentModule)?.label}
          </span>
        </div>
        <CurrentPage />
      </main>
    </div>
  );
}
