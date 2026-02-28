"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [pool, setPool] = useState({ totalDaily: 0, totalChampionship: 0 });
  const [poolEdit, setPoolEdit] = useState({ totalDaily: "", totalChampionship: "" });
  const [initialCredits, setInitialCredits] = useState(0);
  const [initialCreditsEdit, setInitialCreditsEdit] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [hardResetPassword, setHardResetPassword] = useState("");
  const [hardResetLoading, setHardResetLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Redirect to login if session token is missing
    const tokenFromStorage = sessionStorage.getItem("token");
    if (!tokenFromStorage) {
      window.location.href = "/login";
      return;
    }
    setToken(tokenFromStorage);
  }, []);

  useEffect(() => {
    if (token && isClient) {
      fetchPool();
      fetchInitialCredits();
    }
  }, [token, isClient]);

  const fetchPool = async () => {
    try {
      const res = await fetch("/api/creditpool");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPool(data);
      setPoolEdit({ totalDaily: String(data.totalDaily), totalChampionship: String(data.totalChampionship) });
    } catch {
      setPool({ totalDaily: 0, totalChampionship: 0 });
    }
  };

  const handlePoolUpdate = async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch("/api/creditpool", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          totalDaily: Number(poolEdit.totalDaily) || 0,
          totalChampionship: Number(poolEdit.totalChampionship) || 0,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Hiba a pool módosításakor");
      }
      await fetchPool();
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba");
    }
  };

  const fetchInitialCredits = async () => {
    try {
      const res = await fetch("/api/settings/initial-credits", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const value = Number(data?.initialCredits) || 0;
      setInitialCredits(value);
      setInitialCreditsEdit(String(value));
    } catch {
      setInitialCredits(0);
      setInitialCreditsEdit("0");
    }
  };

  const handleInitialCreditsUpdate = async () => {
    if (!token) return;
    setError(null);

    const parsedValue = Number(initialCreditsEdit);

    if (initialCreditsEdit.trim() === "" || !Number.isFinite(parsedValue) || parsedValue < 0) {
      setError("A kezdő kredit értéke nem lehet negatív.");
      return;
    }

    try {
      const res = await fetch("/api/settings/initial-credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value: parsedValue }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Hiba a kezdő kredit mentésekor");
      }

      await fetchInitialCredits();
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba");
    }
  };

  const handleExport = async () => {
    if (!token) return;
    setError(null);
    setExportLoading(true);
    try {
      const res = await fetch("/api/admin/export", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Hiba export közben");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sportfogadas-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Ismeretlen export hiba");
    } finally {
      setExportLoading(false);
    }
  };

  const handleImport = async () => {
    if (!token || !importFile) return;
    setError(null);
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Hiba import közben");
      }

      alert(`Import sikeres.\n\nRészletek:\n${JSON.stringify(data.stats || {}, null, 2)}`);
      setImportFile(null);
      await fetchPool();
    } catch (err: any) {
      setError(err.message || "Ismeretlen import hiba");
    } finally {
      setImportLoading(false);
    }
  };

  // Meghívókód logika külön oldalon, nincs több loadInviteCodes

  if (!isClient) {
    return null;
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-3">
              ⚙️  Admin Panel
            </h1>
            <p className="text-center text-gray-700 text-lg">
              Admin panel
            </p>
          </header>

          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center mb-8">
            <p className="text-red-800 font-semibold text-lg mb-4">
              ⚠️  Nincsenek bejelentkezve!
            </p>
            <p className="text-red-700 mb-6">
              Az admin funkciók eléréséhez be kell jelentkezned.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition"
            >
              Bejelentkezés
            </Link>
          </div>

          <div className="text-center text-sm text-gray-700">
            {/* Footer Info removed, handled by layout Footer */}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-3">
            ⚙️  Admin Panel
          </h1>
          <p className="text-center text-gray-700 text-lg">
            Válassz a kezelő felületek közül
          </p>
        </header>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded-xl mb-6 border border-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Adat export */}
          <div className="bg-white rounded-2xl shadow-sm border border-indigo-300 p-8">
            <h2 className="text-xl font-extrabold text-indigo-800 mb-4">📤 Adat export (Excel)</h2>
            <p className="text-gray-700 mb-4">
              Letölti a fő táblák teljes tartalmát egy .xlsx fájlba (Setting, User, InviteCode, Event, Bet, CreditPool, DailyPool, ChatMessage).
            </p>
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className={`w-full font-bold px-4 py-2 rounded-xl shadow text-white transition ${
                exportLoading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-700 hover:bg-indigo-800"
              }`}
            >
              {exportLoading ? "Export folyamatban..." : "Excel export letöltése"}
            </button>
          </div>

          {/* Adat import */}
          <div className="bg-white rounded-2xl shadow-sm border border-amber-300 p-8">
            <h2 className="text-xl font-extrabold text-amber-800 mb-4">📥 Adat import (Excel)</h2>
            <p className="text-gray-700 mb-4">
              Korábban exportált .xlsx fájl visszatöltése. A meglévő sorokat frissíti, a hiányzókat létrehozza.
            </p>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 bg-white shadow-sm mb-3"
            />
            <button
              onClick={handleImport}
              disabled={importLoading || !importFile}
              className={`w-full font-bold px-4 py-2 rounded-xl shadow text-white transition ${
                importLoading || !importFile ? "bg-amber-400 cursor-not-allowed" : "bg-amber-700 hover:bg-amber-800"
              }`}
            >
              {importLoading ? "Import folyamatban..." : "Excel import indítása"}
            </button>
          </div>

          {/* Pool kezelés */}
          <div className="bg-white rounded-2xl shadow-sm border border-green-300 p-8">
            <h2 className="text-xl font-extrabold text-green-800 mb-4">💰 Pool Kredit Kezelés</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-900">Napi Pool (nincs használva - eseményenkénti pool van)</label>
                <input
                  type="number"
                  value={poolEdit.totalDaily}
                  onChange={(e) => setPoolEdit({ ...poolEdit, totalDaily: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 bg-white shadow-sm mt-1"
                  placeholder="0"
                  disabled
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-900">Bajnoki Pool</label>
                <input
                  type="number"
                  value={poolEdit.totalChampionship}
                  onChange={(e) => setPoolEdit({ ...poolEdit, totalChampionship: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 bg-white shadow-sm mt-1"
                  placeholder="0"
                />
              </div>
              <button
                onClick={handlePoolUpdate}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-bold px-4 py-2 rounded-xl shadow"
              >
                Mentés
              </button>
              <p className="text-sm text-gray-600">
                Jelenlegi: Napi {pool.totalDaily} kredit | Bajnoki {pool.totalChampionship} kredit
              </p>
            </div>
          </div>

          {/* Kezdő kredit beállítás */}
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-300 p-8">
            <h2 className="text-xl font-extrabold text-emerald-800 mb-4">🪙 Kezdő kredit (regisztrációhoz)</h2>
            <p className="text-gray-700 mb-4">
              Ezt az összeget kapja minden új felhasználó a regisztrációkor.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-900">Kezdő kredit</label>
                <input
                  type="number"
                  min={0}
                  value={initialCreditsEdit}
                  onChange={(e) => setInitialCreditsEdit(e.target.value.replace(/[^0-9]/g, ""))}
                  onFocus={(e) => e.target.select()}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 bg-white shadow-sm mt-1"
                  placeholder="0"
                />
              </div>
              <button
                onClick={handleInitialCreditsUpdate}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl shadow"
              >
                Mentés
              </button>
              <p className="text-sm text-gray-600">Jelenlegi kezdő kredit: {initialCredits}</p>
            </div>
          </div>

          {/* Meghívókódok külön oldalra */}
          <Link
            href="/admin/invite-codes"
            className="bg-white rounded-2xl shadow-sm border border-blue-300 p-8 mb-8 flex flex-col items-center hover:shadow-lg hover:border-purple-400 transition"
          >
            <h2 className="text-xl font-extrabold text-blue-800 mb-4">Meghívókódok kezelése</h2>
            <span className="text-blue-700">Új kód generálás, másolás, lista</span>
          </Link>

          {/* Esemény kezelés */}
          <Link
            href="/admin/events"
            className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-lg hover:border-blue-300 transition"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="text-5xl">📅</div>
              <h2 className="text-2xl font-extrabold text-gray-900">
                Esemény kezelés
              </h2>
            </div>
            <p className="text-gray-700 mb-6">
              Új eseményeket hozhatsz létre és az eredményeket felviheted.
            </p>
            <div className="text-blue-600 font-semibold group-hover:text-blue-700 flex items-center gap-2">
              Megnyitás
              <span>→</span>
            </div>
          </Link>

          {/* Felhasználó kezelés */}
          <Link
            href="/admin/users"
            className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-lg hover:border-purple-300 transition"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="text-5xl">👥</div>
              <h2 className="text-2xl font-extrabold text-gray-900">
                Felhasználó kezelés
              </h2>
            </div>
            <p className="text-gray-700 mb-6">
              Új felhasználókat hozhatsz létre és kezelheted azok szerepkörét.
            </p>
            <div className="text-purple-600 font-semibold group-hover:text-purple-700 flex items-center gap-2">
              Megnyitás
              <span>→</span>
            </div>
          </Link>
        </div>

        {/* Hard reset panel: legalul, extra védelemmel */}
        <div className="bg-white rounded-2xl shadow-sm border border-red-300 p-8 mt-16 mb-8 flex flex-col items-center">
          <h2 className="text-xl font-extrabold text-red-800 mb-4">⚠️ Hard Reset</h2>
          <p className="text-red-700 mb-4 text-center">Ez a gomb minden felhasználót, eseményt és tippet töröl! Csak admin használhatja.<br/>A törléshez add meg újra az admin jelszavad!</p>
          <input
            type="password"
            placeholder="Admin jelszó"
            className="w-full max-w-xs border border-gray-300 rounded-xl px-3 py-2 text-gray-900 bg-white shadow-sm mb-4"
            value={hardResetPassword}
            onChange={e => setHardResetPassword(e.target.value)}
          />
          <button
            disabled={!hardResetPassword || hardResetLoading}
            onClick={async () => {
              if (!window.confirm("Biztosan törölni akarod az összes adatot? Ez nem visszavonható!")) return;
              setHardResetLoading(true);
              const res = await fetch("/api/admin/hard-reset", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ password: hardResetPassword }),
              });
              const data = await res.json();
              setHardResetLoading(false);
              setHardResetPassword("");
              alert(data.message || "Hard reset lefutott.");
              window.location.reload();
            }}
            className={`px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition w-full max-w-xs ${hardResetLoading ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {hardResetLoading ? "Törlés folyamatban..." : "Minden adat törlése"}
          </button>
        </div>

        <div className="text-center text-sm text-gray-700">
          {/* Footer Info removed, handled by layout Footer */}
        </div>
      </div>
    </div>
  );

}


