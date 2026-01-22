
"use client";
import dynamic from "next/dynamic";
const SupportBanner = dynamic(() => import("../components/SupportBanner"), { ssr: false });

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [acceptedRules, setAcceptedRules] = useState(false);

  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!acceptedRules) {
      setMessage("❌ A regisztrációhoz el kell fogadnod a szabályzatot.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, inviteCode }),
      });

      if (res.ok) {
        setMessage("✅ Sikeres regisztráció! Átirányítás a belépéshez...");
        setTimeout(() => router.push("/login"), 1200);
      } else {
        const data = await res.json().catch(() => null);
        setMessage(data?.message || "❌ Nem sikerült a regisztráció.");
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Hálózati hiba történt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-md mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 text-center">
            Regisztráció
          </h1>
          <p className="mt-2 text-center text-gray-700">
            Tippelde – Foci VB 2026 (csak meghívóval)
          </p>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                Felhasználónév
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="pl. petz765"
                className="w-full h-12 px-4 rounded-xl border-2 border-gray-300 text-gray-900 font-semibold
                  placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
                required
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-bold text-gray-900 mb-1">
                Jelszó
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-4 rounded-xl border-2 border-gray-300 text-gray-900 font-semibold
                  placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 pr-12"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-9 transform -translate-y-1/2 text-gray-500 hover:text-blue-700 focus:outline-none"
                style={{
                  padding: 0,
                  background: 'none',
                  border: 'none',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '9999px',
                  touchAction: 'manipulation',
                }}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.336-3.234.938-4.675M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.062-4.675A9.956 9.956 0 0122 9c0 5.523-4.477 10-10 10a9.956 9.956 0 01-4.675-.938M3 3l18 18" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm7-2s-3-5-10-5S2 10 2 10s3 5 10 5 10-5 10-5z" /></svg>
                )}
              </button>
              <p className="mt-1 text-sm text-gray-700">
                Tipp: legalább 6–8 karakter javasolt.
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                Meghívókód
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="pl. ABCD-1234"
                className="w-full h-12 px-4 rounded-xl border-2 border-gray-300 text-gray-900 font-semibold
                  placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-700">
                Meghívókódot a szervezőtől kapsz.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedRules}
                  onChange={(e) => setAcceptedRules(e.target.checked)}
                  className="mt-1 h-5 w-5"
                />
                <span className="text-gray-900 font-semibold">
                  Elfogadom a{" "}
                  <Link
                    href="/szabalyzat"
                    className="text-blue-700 hover:text-blue-800 font-extrabold"
                  >
                    szabályzatot
                  </Link>
                  .
                </span>
              </label>
              <p className="mt-2 text-sm text-gray-700">
                A részvétellel elfogadod a játék szabályait (nincs valódi pénz).
              </p>
            </div>

            {message && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                <p className="text-gray-900 font-semibold">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full h-12 rounded-2xl text-white font-extrabold shadow transition
                ${loading ? "bg-green-400 cursor-not-allowed" : "bg-green-700 hover:bg-green-800 active:bg-green-900"}`}
            >
              {loading ? "Regisztráció..." : "Regisztráció"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-700">
              Már van fiókod?{" "}
              <Link
                className="font-bold text-blue-700 hover:text-blue-800"
                href="/login"
              >
                Belépés
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-700">
          made by <span className="font-bold text-gray-900">@petz765</span>
        </div>
        <div className="mt-10">
          <SupportBanner />
        </div>
      </div>
    </div>
  );
}
