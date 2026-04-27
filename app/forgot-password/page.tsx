"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.message || "❌ Hiba történt.");
      } else {
        setMessage(data?.message || "✅ Ha létezik fiók, elküldtük a visszaállító linket.");
      }
    } catch {
      setMessage("❌ Hálózati hiba történt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-md mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 text-center">Elfelejtett jelszó</h1>
          <p className="mt-2 text-center text-gray-700">Add meg az email címed, és küldünk visszaállító linket.</p>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Email cím</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pl. valaki@email.com"
                className="w-full h-12 px-4 rounded-xl border-2 border-gray-300 text-gray-900 font-semibold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
                required
              />
            </div>

            {message && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                <p className="text-gray-900 font-semibold">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full h-12 rounded-2xl text-white font-extrabold shadow transition ${
                loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-700 hover:bg-blue-800 active:bg-blue-900"
              }`}
            >
              {loading ? "Küldés..." : "Visszaállító link kérése"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link className="font-bold text-blue-700 hover:text-blue-800" href="/login">
              Vissza a belépéshez
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
