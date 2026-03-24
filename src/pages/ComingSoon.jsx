export default function ComingSoon({ title, description }) {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
      <p className="text-gray-500 text-center max-w-md">
        {description || "Acest modul este în construcție și va fi disponibil în curând."}
      </p>
      <div className="mt-6 bg-indigo-50 rounded-xl p-4 text-sm text-indigo-700 max-w-md text-center">
        Modulele se construiesc în ordinea: Firme Contabilitate → Clienți → Contracte → Rezilieri → Documente → Lead-uri
      </div>
    </div>
  );
}
