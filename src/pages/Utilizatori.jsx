import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [parola, setParola] = useState("");
  const [loading, setLoading] = useState(false);
  const [eroare, setEroare] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetTrimis, setResetTrimis] = useState(false);
  const [aratParola, setAratParola] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !parola) return setEroare("Completează email-ul și parola!");
    setLoading(true);
    setEroare("");
    try {
      await signInWithEmailAndPassword(auth, email, parola);
      // Autentificarea reușită — App.jsx detectează automat
    } catch (err) {
      const mesaje = {
        "auth/user-not-found":    "Nu există niciun cont cu acest email.",
        "auth/wrong-password":    "Parola este incorectă.",
        "auth/invalid-email":     "Adresa de email nu este validă.",
        "auth/too-many-requests": "Prea multe încercări. Încearcă din nou mai târziu.",
        "auth/invalid-credential":"Email sau parolă incorectă.",
        "auth/user-disabled":     "Contul tău a fost dezactivat. Contactează administratorul.",
      };
      setEroare(mesaje[err.code] || "Eroare la autentificare. Verifică datele și încearcă din nou.");
    }
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email) return setEroare("Introdu adresa de email pentru a reseta parola.");
    setLoading(true);
    setEroare("");
    try {
      await sendPasswordResetEmail(auth, email);
      setResetTrimis(true);
    } catch (err) {
      setEroare("Nu s-a putut trimite email-ul de resetare. Verifică adresa.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">

      {/* Card login */}
      <div className="w-full max-w-sm">

        {/* Logo / Titlu */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-black text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-white">SEP CRM</h1>
          <p className="text-slate-400 text-sm mt-1">Contabilitate</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {!resetMode ? (
            <>
              <h2 className="text-lg font-bold text-slate-800 mb-6">Autentificare</h2>

              {eroare && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-red-700">
                  {eroare}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Adresă email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nume@firma.ro"
                    autoComplete="email"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Parolă
                  </label>
                  <div className="relative">
                    <input
                      type={aratParola ? "text" : "password"}
                      value={parola}
                      onChange={e => setParola(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setAratParola(!aratParola)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-medium"
                    >
                      {aratParola ? "Ascunde" : "Arată"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? "Se verifică..." : "Intră în cont"}
                </button>
              </form>

              <button
                onClick={() => { setResetMode(true); setEroare(""); }}
                className="w-full text-center text-xs text-slate-400 hover:text-primary-500 mt-4 transition-colors"
              >
                Am uitat parola
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setResetMode(false); setResetTrimis(false); setEroare(""); }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-5 transition-colors"
              >
                ← Înapoi la login
              </button>

              <h2 className="text-lg font-bold text-slate-800 mb-2">Resetare parolă</h2>
              <p className="text-sm text-slate-500 mb-6">
                Introdu adresa de email și îți trimitem un link pentru a seta o parolă nouă.
              </p>

              {resetTrimis ? (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-sm text-green-700 text-center">
                  <p className="font-bold mb-1">Email trimis!</p>
                  <p>Verifică inbox-ul la <strong>{email}</strong> și urmează instrucțiunile.</p>
                  <button
                    onClick={() => { setResetMode(false); setResetTrimis(false); }}
                    className="mt-3 text-xs text-green-600 hover:text-green-800 underline"
                  >
                    Înapoi la login
                  </button>
                </div>
              ) : (
                <>
                  {eroare && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
                      {eroare}
                    </div>
                  )}
                  <form onSubmit={handleReset} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">
                        Adresă email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="nume@firma.ro"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-slate-50 focus:bg-white transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60"
                    >
                      {loading ? "Se trimite..." : "Trimite link resetare"}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Acces restricționat — doar pentru echipa autorizată
        </p>
      </div>
    </div>
  );
}

