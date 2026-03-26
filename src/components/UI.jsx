// ============================================================
// COMPONENTE UI REUTILIZABILE — paleta culori actualizata
// ============================================================

export const Badge = ({ text, color = "gray" }) => {
  const colors = {
    // Verde inchis — activ, confirmat
    green:   "bg-success-50 text-success-400 border border-success-200",
    // Verde deschis — badge secondary activ
    teal:    "bg-mint-100 text-mint-400 border border-mint-200",
    // Rosu — eroare, reziliat, notificare
    red:     "bg-danger-50 text-danger-400 border border-danger-200",
    // Portocaliu — suspendat, avertisment
    yellow:  "bg-warning-50 text-warning-500 border border-warning-200",
    orange:  "bg-warning-100 text-warning-600 border border-warning-300",
    // Albastru inchis — primary, selectat
    blue:    "bg-accent-50 text-accent-500 border border-accent-200",
    indigo:  "bg-primary-50 text-primary-500 border border-primary-200",
    // Mov
    purple:  "bg-purple-100 text-purple-700 border border-purple-200",
    // Neutru
    gray:    "bg-slate-100 text-slate-600 border border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color] || colors.gray}`}>
      {text}
    </span>
  );
};

export const statusFirmaColor = (s) => ({
  "Activa": "green", "Suspendata": "yellow", "Radiata": "red"
}[s] || "gray");

export const statusClientColor = (s) => ({
  "Activ": "green", "Suspendat": "yellow", "Reziliat": "red", "Prospect": "blue"
}[s] || "gray");

export const statusContractColor = (s) => ({
  "Activ": "green", "Draft": "gray", "Suspendat": "yellow",
  "Reziliat": "red", "Expirat": "orange", "Trimis spre semnare": "blue"
}[s] || "gray");

export function Modal({ title, size = "md", onClose, children }) {
  const sizes = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className={`bg-white rounded-2xl w-full ${sizes[size]} my-8`} style={{ boxShadow: "0 20px 60px -10px rgb(0 0 0 / 0.25)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function FormSection({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-primary-500 uppercase tracking-widest mb-3 pb-2 border-b border-primary-100">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export function FormField({ label, required, full, children }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
        {label}{required && <span className="text-danger-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export function Input({ ...props }) {
  return (
    <input
      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all bg-slate-50 focus:bg-white placeholder:text-slate-300"
      {...props}
    />
  );
}

export function Select({ options, placeholder, ...props }) {
  return (
    <select
      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value ?? o} value={o.value ?? o}>
          {o.label ?? o}
        </option>
      ))}
    </select>
  );
}

export function Textarea({ ...props }) {
  return (
    <textarea
      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all bg-slate-50 focus:bg-white resize-none placeholder:text-slate-300"
      rows={3}
      {...props}
    />
  );
}

export function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-400 accent-primary-500"
      />
      <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
    </label>
  );
}

export function Btn({ variant = "primary", size = "md", onClick, disabled, children, type = "button" }) {
  const variants = {
    primary:   "bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white shadow-sm",
    secondary: "bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm",
    danger:    "bg-danger-400 hover:bg-danger-500 active:bg-danger-600 text-white shadow-sm",
    success:   "bg-success-400 hover:bg-success-500 active:bg-success-600 text-white shadow-sm",
    ghost:     "hover:bg-slate-100 active:bg-slate-200 text-slate-600",
    accent:    "bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-white shadow-sm",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-2.5 text-sm",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function EmptyState({ title, subtitle, action }) {
  return (
    <div className="text-center py-16">
      <div className="w-12 h-12 bg-slate-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-300 rounded-md" />
      </div>
      <h3 className="text-base font-semibold text-slate-600 mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-slate-400 mb-4">{subtitle}</p>}
      {action}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary-100 border-t-primary-500 rounded-full animate-spin mb-3"></div>
      <p className="text-sm text-slate-400">Se incarca...</p>
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-100 ${className}`} style={{ boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.08)" }}>
      {children}
    </div>
  );
}

// Alerta cu tipuri: info | success | warning | danger
export function Alert({ type = "info", title, children }) {
  const styles = {
    info:    "bg-accent-50 border-accent-200 text-accent-700",
    success: "bg-success-50 border-success-200 text-success-500",
    warning: "bg-warning-50 border-warning-200 text-warning-600",
    danger:  "bg-danger-50 border-danger-200 text-danger-400",
  };
  return (
    <div className={`border rounded-xl p-4 ${styles[type]}`}>
      {title && <p className="text-sm font-bold mb-1">{title}</p>}
      <div className="text-sm">{children}</div>
    </div>
  );
}

// Indicator notificare (punct rosu)
export function NotifDot({ count }) {
  if (!count) return null;
  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-danger-400 text-white text-xs font-bold rounded-full badge-pulse">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export const JUDETE = [
  "Alba","Arad","Arges","Bacau","Bihor","Bistrita-Nasaud","Botosani","Braila",
  "Brasov","Bucuresti","Buzau","Calarasi","Caras-Severin","Cluj","Constanta",
  "Covasna","Dambovita","Dolj","Galati","Giurgiu","Gorj","Harghita","Hunedoara",
  "Ialomita","Iasi","Ilfov","Maramures","Mehedinti","Mures","Neamt","Olt",
  "Prahova","Salaj","Satu Mare","Sibiu","Suceava","Teleorman","Timis","Tulcea",
  "Valcea","Vaslui","Vrancea"
];

export const BANCI = [
  "BCR","BRD","ING Bank","Raiffeisen Bank","UniCredit","Alpha Bank",
  "CEC Bank","Banca Transilvania","OTP Bank","Garanti BBVA","Libra Bank",
  "First Bank","Exim Banca","Patria Bank","TBI Bank","Alta banca"
];
