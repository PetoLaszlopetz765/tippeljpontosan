"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Event {
  id: number;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  status: "OPEN" | "CLOSED" | "NYITOTT" | "LEZÁRT";
  creditCost: number;
  finalHomeGoals?: number | null;
  finalAwayGoals?: number | null;
  dailyPool?: {
    id: number;
    eventId: number;
    totalDaily: number;
    carriedFromPrevious: number;
    totalDistributed: number;
  } | null;
}

function isEventOpen(status: Event["status"]) {
  return status === "OPEN" || status === "NYITOTT";
}

export default function EventsAdminPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [kickoffTime, setKickoffTime] = useState("");
  const [creditCost, setCreditCost] = useState("100");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [resultEventId, setResultEventId] = useState<number | null>(null);
  const [resultHome, setResultHome] = useState("");
  const [resultAway, setResultAway] = useState("");
  const [resultLoading, setResultLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [closingEventId, setClosingEventId] = useState<number | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);
  const [poolAmount, setPoolAmount] = useState<{ [eventId: number]: string }>({});
  const [poolLoading, setPoolLoading] = useState<number | null>(null);

  useEffect(() => {
    console.log("🔧 EVENTS ADMIN PAGE MOUNTED");
    setIsClient(true);
    const savedToken = localStorage.getItem("token");
    console.log("📦 Token from localStorage:", savedToken ? "✓ Found (length: " + savedToken.length + ")" : "✗ Not found");
    setToken(savedToken);
    
    if (!savedToken) {
      setMessage("⚠️  Nem vagy bejelentkezve! Az eredmény feltöltéséhez be kell jelentkezned.");
    }
  }, []);

  async function loadEvents() {
    console.log("📥 Loading events...");
    const res = await fetch("/api/events", { cache: "no-store" });
    if (res.ok) {
      let data: Event[] = await res.json();
      // Legújabb kickoffTime legyen elöl
      data = data.sort((a: { kickoffTime: string }, b: { kickoffTime: string }) => new Date(b.kickoffTime).getTime() - new Date(a.kickoffTime).getTime());
      console.log("✓ Events loaded:", data.length, "items");
      setEvents(data);
      // Initialize pool amounts from existing data
      const poolAmounts: { [eventId: number]: string } = {};
      data.forEach(e => {
        if (e.dailyPool) {
          poolAmounts[e.id] = String(e.dailyPool.totalDaily);
        }
      });
      setPoolAmount(poolAmounts);
    }
  }

  useEffect(() => {
    console.log("🔧 useEffect: isClient =", isClient);
    if (isClient) {
      console.log("✅ Client-side, loading data...");
      loadEvents();
    } else {
      console.log("✗ Not yet client-side");
    }
  }, [isClient]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (!token) {
      setMessage("✗ Nincs bejelentkezve. Csak adminok tudnak eseményt létrehozni!");
      window.location.href = "/login";
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ homeTeam, awayTeam, kickoffTime, creditCost: parseInt(creditCost) || 100 }),
      });

      if (res.ok) {
        setMessage("✓ Esemény létrehozva!");
        setHomeTeam("");
        setAwayTeam("");
        setKickoffTime("");
        setCreditCost("100");
        await loadEvents();
      } else {
        const data = await res.json().catch(() => null);
        setMessage(data?.message || "✗ Hiba az esemény létrehozásakor.");
      }
    } catch (err) {
      console.error(err);
      setMessage("✗ Hálózati hiba történt.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResultSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("\n\n🚀 ========== RESULT SUBMIT STARTED ==========");
    console.log("⬆️  Time:", new Date().toISOString());
    console.log("📊 resultEventId:", resultEventId);
    console.log("🔐 token exists:", token ? "✓ YES (length: " + token.length + ")" : "✗ NO");
    console.log("🎯 resultHome value:", resultHome, "type:", typeof resultHome);
    console.log("⚽ resultAway value:", resultAway, "type:", typeof resultAway);
    console.log("🔦 isClient:", isClient);
    
    if (resultEventId === null) {
      console.log("✗ ERROR: resultEventId is null");
      setMessage("✗ Nincs kiválasztott esemény!");
      return;
    }
    
    if (!token) {
      console.log("✗ ERROR: token is missing");
      setMessage("✗ Nincs bejelentkezve!");
      console.log("📄 Redirecting to /login");
      window.location.href = "/login";
      return;
    }

    setMessage("");
    setResultLoading(true);
    console.log("✅ Validations passed, proceeding with submit...");

    const homeGoals = parseInt(resultHome);
    const awayGoals = parseInt(resultAway);

    console.log("🎘 Parsed goals:", { homeGoals, awayGoals, homeGoalsNaN: isNaN(homeGoals), awayGoalsNaN: isNaN(awayGoals) });

    if (isNaN(homeGoals) || isNaN(awayGoals)) {
      console.log("✗ ERROR: Invalid goal values");
      setMessage("✗ Az eredmény mező kitöltése szükséges!");
      setResultLoading(false);
      return;
    }

    try {
      const url = `/api/events/${resultEventId}/result`;
      const bodyData = {
        finalHomeGoals: homeGoals,
        finalAwayGoals: awayGoals,
      };
      
      console.log("\n📇 SENDING REQUEST:");
      console.log("   URL:", url);
      console.log("   Method: POST");
      console.log("   Headers: { Authorization: Bearer [token], Content-Type: application/json }");
      console.log("   Body:", JSON.stringify(bodyData));
      
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });

      console.log("\n📣 RESPONSE RECEIVED:");
      console.log("   Status:", res.status, res.statusText);
      console.log("   OK:", res.ok);
      console.log("   Content-Type:", res.headers.get("content-type"));
      
      if (res.ok) {
        const data = await res.json();
        console.log("✅ SUCCESS! Data:", data);
        setMessage(`✅ ${data.message}`);
        setResultEventId(null);
        setResultHome("");
        setResultAway("");
        console.log("📄 Reloading events...");
        await loadEvents();
        console.log("✅ Events reloaded");
      } else {
        try {
          const data = await res.json();
          console.log("✗ ERROR RESPONSE:", data);
          setMessage(data?.message || `✗ Hiba az eredmény feltöltésekor. (${res.status})`);
        } catch (parseErr) {
          console.log("✗ Could not parse error response");
          setMessage(`✗ Hiba: ${res.statusText}`);
        }
      }
    } catch (err) {
      console.error("\n✗ FETCH ERROR:", err);
      console.error("   Error type:", err instanceof Error ? err.constructor.name : typeof err);
      console.error("   Error message:", err instanceof Error ? err.message : String(err));
      if (err instanceof Error && err.stack) {
        console.error("   Stack:", err.stack);
      }
      setMessage("✗ Hálózati hiba történt.");
    } finally {
      console.log("\n🏁 FINALLY BLOCK - setResultLoading(false)");
      setResultLoading(false);
    }
    console.log("========== RESULT SUBMIT END ==========\n\n");
  }

  async function handleCloseEvent(eventId: number) {
    if (!token) {
      setMessage("✗ Nincs bejelentkezve!");
      return;
    }

    setClosingEventId(eventId);
    setMessage("");

    try {
      const res = await fetch(`/api/events/${eventId}/close`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setMessage("✅ Esemény sikeresen lezárva!");
        await loadEvents();
      } else if (res.status === 401) {
        setMessage("✗ A session lejárt! Kérjük jelentkezz be újra.");
        window.location.href = "/login";
      } else {
        const data = await res.json().catch(() => null);
        setMessage(data?.message || "✗ Hiba az esemény lezárásakor.");
      }
    } catch (err) {
      console.error(err);
      setMessage("✗ Hálózati hiba történt.");
    } finally {
      setClosingEventId(null);
    }
  }

  async function handleUpdatePool(eventId: number) {
    if (!token) {
      setMessage("✗ Nincs bejelentkezve!");
      return;
    }

    const amount = poolAmount[eventId];
    if (!amount || isNaN(Number(amount))) {
      setMessage("✗ Érvénytelen pool összeg!");
      return;
    }

    setPoolLoading(eventId);
    setMessage("");

    try {
      const res = await fetch(`/api/events/${eventId}/pool`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ totalDaily: Number(amount) }),
      });

      if (res.ok) {
        setMessage("✅ Pool sikeresen frissítve!");
        await loadEvents();
      } else {
        const data = await res.json().catch(() => null);
        setMessage(data?.message || "✗ Hiba a pool frissítésekor.");
      }
    } catch (err) {
      console.error(err);
      setMessage("✗ Hálózati hiba történt.");
    } finally {
      setPoolLoading(null);
    }
  }

  async function handleDeleteEvent(eventId: number) {
    if (!token) {
      setMessage("✗ Nincs bejelentkezve!");
      return;
    }

    if (!confirm("Biztosan törlöd ezt az eseményt? Ezzel az összes erre leadott tipp is törlődik!")) {
      return;
    }

    setDeletingEventId(eventId);
    setMessage("");

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setMessage(`✅ Esemény és ${data.deletedBetsCount} tipp sikeresen törölve!`);
        await loadEvents();
      } else if (res.status === 401) {
        setMessage("✗ A session lejárt! Kérjük jelentkezz be újra.");
        window.location.href = "/login";
      } else {
        const data = await res.json().catch(() => null);
        setMessage(data?.message || "✗ Hiba az esemény törlésekor.");
      }
    } catch (err) {
      console.error(err);
      setMessage("✗ Hálózati hiba történt.");
    } finally {
      setDeletingEventId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h1 className="text-3xl font-extrabold text-gray-900">
              📅 Esemény kezelés
            </h1>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg bg-gray-800 text-white font-semibold hover:bg-gray-900 transition"
            >
              ← Vissza az admin felületre
            </Link>
          </div>
          <p className="text-gray-700">
            Új események létrehozása és eredmények felvétele
          </p>
        </header>

        <div className="space-y-8">
          {/* Új esemény form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-extrabold text-gray-900 mb-4">
              Új esemény létrehozása
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Hazai csapat
                  </label>
                  <input
                    value={homeTeam}
                    onChange={(e) => setHomeTeam(e.target.value)}
                    placeholder="pl. Magyarország"
                    className="w-full h-12 px-4 rounded-xl border-2 border-gray-300 text-gray-900 font-semibold
                      placeholder:text-gray-400
                      focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Vendég csapat
                  </label>
                  <input
                    value={awayTeam}
                    onChange={(e) => setAwayTeam(e.target.value)}
                    placeholder="pl. Ausztria"
                    className="w-full h-12 px-4 rounded-xl border-2 border-gray-300 text-gray-900 font-semibold
                      placeholder:text-gray-400
                      focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Kezdés időpontja
                </label>
                <input
                  type="datetime-local"
                  value={kickoffTime}
                  onChange={(e) => setKickoffTime(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border-2 border-gray-300 text-gray-900 font-semibold
                    focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
                  required
                />
                <p className="mt-1 text-sm text-gray-700">
                  A meccs létrehozás után automatikusan nyitott lesz.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Tipp költsége (kredit)
                </label>
                <input
                  type="number"
                  min="1"
                  value={creditCost}
                  onChange={(e) => setCreditCost(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border-2 border-gray-300 text-gray-900 font-semibold
                    focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
                  required
                />
                <p className="mt-1 text-sm text-gray-700">
                  A tipp elkészítésére felhasználandó kredit mennyisége.
                </p>
              </div>

              {message && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-gray-900 font-semibold">{message}</p>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 h-12 rounded-2xl text-white font-extrabold shadow transition
                    ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-700 hover:bg-blue-800 active:bg-blue-900"}`}
                >
                  {loading ? "Mentés..." : "Esemény mentése"}
                </button>

                <button
                  type="button"
                  onClick={loadEvents}
                  className="flex-1 h-12 rounded-2xl bg-gray-900 text-white font-extrabold shadow hover:bg-black transition"
                >
                  Lista frissítése
                </button>
              </div>
            </form>
          </div>

          {/* Létrehozott események */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-extrabold text-gray-900">
                Létrehozott események
              </h2>
              <p className="text-sm text-gray-700">
                Összesen: <span className="font-bold text-gray-900">{events.length}</span>
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {events.length === 0 && (
                <p className="text-gray-800 font-semibold">
                  Még nincs esemény.
                </p>
              )}

              {events.filter(e => e.finalHomeGoals === null || e.finalAwayGoals === null).map((e) => {
                const open = isEventOpen(e.status);
                return (
                  <div
                    key={e.id}
                    className="border border-gray-200 rounded-2xl p-4 flex flex-col gap-3"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="text-lg font-extrabold text-gray-900">
                          {e.homeTeam} – {e.awayTeam}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          Kezdés:{" "}
                          <span className="font-semibold text-gray-900">
                            {new Date(e.kickoffTime).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" })}
                          </span>
                        <span className="ml-4 text-gray-700">Tipp díj:</span>
                        <span className="font-semibold text-green-800">{e.creditCost} kredit</span>
                        {e.dailyPool && (
                          <>
                            <span className="ml-4 text-gray-700">Pool:</span>
                            <span className="font-semibold text-yellow-800">
                              {e.dailyPool.totalDaily + e.dailyPool.carriedFromPrevious} kredit
                              {e.dailyPool.totalDistributed > 0 && <span className="text-green-700"> (szétosztva: {e.dailyPool.totalDistributed})</span>}
                            </span>
                          </>
                        )}
                        </p>
                      </div>

                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border self-start md:self-auto ${
                          open
                            ? "bg-green-50 text-green-800 border-green-200"
                            : "bg-red-50 text-red-800 border-red-200"
                        }`}
                      >
                        {open ? "Nyitott" : "Lezárt"}
                      </span>
                    </div>

                    {/* Pool kezelés */}
                    <div className="flex gap-2 items-center border-t pt-3">
                      <label className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        💰 Pool kredit:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={poolAmount[e.id] || ""}
                        onChange={(e2) => setPoolAmount({ ...poolAmount, [e.id]: e2.target.value })}
                        placeholder="0"
                        className="flex-1 h-10 px-3 rounded-lg border-2 border-gray-300 text-gray-900 font-semibold
                          focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500"
                      />
                      <button
                        onClick={() => handleUpdatePool(e.id)}
                        disabled={poolLoading === e.id}
                        className={`px-4 py-2 rounded-lg font-bold transition ${
                          poolLoading === e.id
                            ? "bg-yellow-300 text-yellow-900 cursor-not-allowed"
                            : "bg-yellow-500 text-white hover:bg-yellow-600"
                        }`}
                      >
                        {poolLoading === e.id ? "..." : "Frissít"}
                      </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center md:justify-between">
                      <div>
                        {e.finalHomeGoals !== null && e.finalAwayGoals !== null ? (
                          <div className="text-sm font-semibold text-gray-900 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                            📊 Eredmény: {e.finalHomeGoals} – {e.finalAwayGoals}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-600">
                            Nincs eredmény beírva
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {open && (
                          <button
                            onClick={() => handleCloseEvent(e.id)}
                            disabled={closingEventId === e.id}
                            className={`text-sm font-bold px-3 py-1 rounded-lg transition ${
                              closingEventId === e.id
                                ? "bg-orange-300 text-orange-900 cursor-not-allowed"
                                : "bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100"
                            }`}
                          >
                            {closingEventId === e.id ? "Lezárás..." : "🔒 Lezárás"}
                          </button>
                        )}
                        
                        {!open && !e.finalHomeGoals && !e.finalAwayGoals && (
                          <button
                            onClick={() => {
                              console.log("🔔 RESULT BUTTON CLICKED for event", e.id);
                              setResultEventId(e.id);
                              setResultHome("");
                              setResultAway("");
                            }}
                            className="text-sm font-bold px-3 py-1 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200 hover:bg-yellow-100 transition"
                          >
                            Eredmény felvétele
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteEvent(e.id)}
                          disabled={deletingEventId === e.id}
                          className={`text-sm font-bold px-3 py-1 rounded-lg transition ${
                            deletingEventId === e.id
                              ? "bg-red-300 text-red-900 cursor-not-allowed"
                              : "bg-red-50 text-red-800 border border-red-200 hover:bg-red-100"
                          }`}
                        >
                          {deletingEventId === e.id ? "Törlés..." : "🗑️ Törlés"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Eredmény form */}
          {resultEventId !== null && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-extrabold text-gray-900 mb-4">
                Eredmény felvétele
              </h2>

              <form onSubmit={(e) => {
                console.log("📋 FORM onSubmit EVENT FIRED");
                handleResultSubmit(e);
              }} className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-bold">Esemény:</span> {events.find(e => e.id === resultEventId)?.homeTeam} – {events.find(e => e.id === resultEventId)?.awayTeam}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Hazai gólok
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={resultHome}
                      onChange={(e) => {
                        console.log("📝 Home goals changed:", e.target.value);
                        setResultHome(e.target.value);
                      }}
                      placeholder="0"
                      className="w-full h-12 px-4 rounded-xl border-2 border-gray-300 text-gray-900 font-semibold text-center text-lg
                        focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Vendég gólok
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={resultAway}
                      onChange={(e) => {
                        console.log("📝 Away goals changed:", e.target.value);
                        setResultAway(e.target.value);
                      }}
                      placeholder="0"
                      className="w-full h-12 px-4 rounded-xl border-2 border-gray-300 text-gray-900 font-semibold text-center text-lg
                        focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    onClick={(e) => {
                      console.log("🔴 SUBMIT BUTTON CLICKED!");
                      console.log("   resultHome:", resultHome, "resultAway:", resultAway);
                      console.log("   disabled?", resultLoading || !resultHome || !resultAway);
                    }}
                    disabled={resultLoading || !resultHome || !resultAway}
                    className={`flex-1 h-12 rounded-2xl text-white font-extrabold shadow transition
                      ${resultLoading ? "bg-green-400 cursor-not-allowed" : "bg-green-700 hover:bg-green-800 active:bg-green-900"}`}
                  >
                    {resultLoading ? "Mentés..." : "Eredmény mentése"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      console.log("✗ Cancel button clicked");
                      setResultEventId(null);
                    }}
                    className="flex-1 h-12 rounded-2xl bg-gray-300 text-gray-900 font-extrabold shadow hover:bg-gray-400 transition"
                  >
                    Mégse
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-700">
          {/* Footer Info removed, handled by layout Footer */}
        </div>
      </div>
    </div>
  );
}
