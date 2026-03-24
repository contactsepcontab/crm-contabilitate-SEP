// ============================================================
// COMPONENTE UI REUTILIZABILE
// ============================================================

export const Badge = ({ text, color = "gray" }) => {
  const colors = {
    green:  "bg-green-100 text-green-800 border border-green-200",
    red:    "bg-red-100 text-red-800 border border-red-200",
    yellow: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    blue:   "bg-blue-100 text-blue-800 border border-blue-200",
    gray:   "bg-gray-100 text-gray-700 border border-gray-200",
    orange: "bg-orange-100 text-orange-800 border border-orange-200",
    purple: "bg-purple-100 text-purple-800 border border-purple-200",
    indigo: "bg-indigo-100 text-indigo-800 border border-indigo-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} my-8`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function FormSection({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-1 border-b border-indigo-100">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export function FormField({ label, required, full, children }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export function Input({ ...props }) {
  return (
    <input
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
      {...props}
    />
  );
}

export function Select({ options, placeholder, ...props }) {
  return (
    <select
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
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
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all bg-gray-50 focus:bg-white resize-none"
      rows={3}
      {...props}
    />
  );
}

export function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

export function Btn({ variant = "primary", size = "md", onClick, disabled, children, type = "button" }) {
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
    secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    success: "bg-green-600 hover:bg-green-700 text-white",
    ghost: "hover:bg-gray-100 text-gray-600",
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
      className={`inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function EmptyState({ title, subtitle, action }) {
  return (
    <div className="text-center py-16">
      <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-gray-400 mb-4">{subtitle}</p>}
      {action}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
      <p className="text-sm text-gray-400">Se încarcă...</p>
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export const JUDETE = [
  "Alba","Arad","Argeș","Bacău","Bihor","Bistrița-Năsăud","Botoșani","Brăila",
  "Brașov","București","Buzău","Călărași","Caraș-Severin","Cluj","Constanța",
  "Covasna","Dâmbovița","Dolj","Galați","Giurgiu","Gorj","Harghita","Hunedoara",
  "Ialomița","Iași","Ilfov","Maramureș","Mehedinți","Mureș","Neamț","Olt",
  "Prahova","Sălaj","Satu Mare","Sibiu","Suceava","Teleorman","Timiș","Tulcea",
  "Vâlcea","Vaslui","Vrancea"
];

export const BANCI = [
  "BCR","BRD","ING Bank","Raiffeisen Bank","UniCredit","Alpha Bank",
  "CEC Bank","Banca Transilvania","OTP Bank","Garanti BBVA","Libra Bank",
  "First Bank","Exim Banca","Patria Bank","TBI Bank","Altă bancă"
];
