"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!token) {
      setMessage("❌ Hiányzó vagy hibás visszaállító token.");
      return;
    }

    if (newPassword.length < 6) {
      setMessage("❌ A jelszónak legalább 6 karakter hosszúnak kell lennie.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("❌ A két jelszó nem egyezik.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.message || "❌ Nem sikerült a jelszó visszaállítása.");
      } else {
        setMessage("✅ A jelszó sikeresen módosítva. Most már bejelentkezhetsz az új jelszóval.");
        setNewPassword("");
        setConfirmPassword("");
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
          <h1 className="text-3xl font-extrabold text-gray-900 text-center">Jelszó visszaállítása</h1>
          <p className="mt-2 text-center text-gray-700">Adj meg egy új jelszót a fiókodhoz.</p>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Új jelszó</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-4 rounded-xl border-2 border-gray-300 text-gray-900 font-semibold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Új jelszó megerősítése</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
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
                loading ? "bg-green-400 cursor-not-allowed" : "bg-green-700 hover:bg-green-800 active:bg-green-900"
              }`}
            >
              {loading ? "Mentés..." : "Új jelszó mentése"}
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
