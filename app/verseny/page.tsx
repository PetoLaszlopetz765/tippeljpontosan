"use client";


import { useEffect, useState } from "react";
import Link from "next/link";

interface User {
  id: number;
  username: string;
  points: number;
  credits: number;
  role: string;
  tipsCount: number;
  perfectCount: number;
}

interface Bet {
  id: number;
  userId: number;
  eventId: number;
  predictedHomeGoals: number;
  predictedAwayGoals: number;
  pointsAwarded: number;
  creditSpent: number;
  user: {
    id: number;
    username: string;
    points: number;
  };
  event: {
    id: number;
    homeTeam: string;
    awayTeam: string;
    kickoffTime: string;
    status: string;
    finalHomeGoals: number | null;
    finalAwayGoals: number | null;
  };
}

export default function VersenyPage() {
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"ranking" | "bets">("ranking");
  const [isAdmin, setIsAdmin] = useState(false);
  const [closeMsg, setCloseMsg] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);
  const [pool, setPool] = useState<{ totalDaily: number, totalChampionship: number }>({ totalDaily: 0, totalChampionship: 0 });
  const [events, setEvents] = useState<any[]>([]);
  // Fetch all events for the "Összes tippek" tab logic
  useEffect(() => {
    if (tab === "bets") {
      fetch("/api/events")
        .then(res => res.ok ? res.json() : [])
        .then(setEvents);
    }
  }, [tab]);

  useEffect(() => {
    fetch("/api/creditpool").then(res => res.ok ? res.json() : { totalDaily: 0, totalChampionship: 0 }).then(setPool);
  }, []);
  useEffect(() => {
    // Ellenőrizzük, hogy az aktuális user admin-e (tokenből vagy API-ból)
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      fetch("/api/profil", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.role === "ADMIN") setIsAdmin(true);
        });
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [leaderRes, betsRes] = await Promise.all([
          fetch("/api/leaderboard"),
          fetch("/api/bets/all-bets"),
        ]);

        if (leaderRes.ok) {
          setLeaderboard(await leaderRes.json());
        }
        if (betsRes.ok) {
          setBets(await betsRes.json());
        }
      } catch (err) {
        setError("Hálózati hiba");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">⚽ Verseny Állása</h1>
          <p className="text-gray-700 mt-2">Játékosok ranglistája és összes tippek</p>
          <div className="flex flex-col md:flex-row gap-4 mt-4 mb-2 items-center justify-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-6 py-3 text-yellow-900 font-semibold text-lg">
              Napi pool (halmozódó): <span className="font-extrabold">{pool.totalDaily} kredit</span>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-6 py-3 text-purple-900 font-semibold text-lg">
              Bajnoki pool: <span className="font-extrabold">{pool.totalChampionship} kredit</span>
            </div>
          </div>
          {isAdmin && (
            <div className="mt-6 mb-2 flex flex-col items-center">
              <button
                className={`px-8 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition mb-2 ${closeLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                disabled={closeLoading}
                onClick={async () => {
                  setCloseLoading(true);
                  setCloseMsg("");
                  const token = localStorage.getItem("token");
                  try {
                    const res = await fetch("/api/competition/close", {
                      method: "POST",
                      headers: { "Authorization": `Bearer ${token}` },
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setCloseMsg("🏆 Verseny sikeresen lezárva! Nyeremények kiosztva.");
                    } else {
                      setCloseMsg(data?.message || "Hiba a verseny lezárásakor.");
                    }
                  } catch (err) {
                    setCloseMsg("Hálózati hiba történt.");
                  } finally {
                    setCloseLoading(false);
                  }
                }}
              >
                {closeLoading ? "Lezárás..." : "Verseny lezárása (nyeremények kiosztása)"}
              </button>
              {closeMsg && <div className="text-center text-lg font-semibold text-green-700 mt-2">{closeMsg}</div>}
            </div>
          )}
        </div>

        {/* Tab gombok */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setTab("ranking")}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              tab === "ranking"
                ? "bg-purple-600 text-white"
                : "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            🏆 Ranglista
          </button>
          <button
            onClick={() => setTab("bets")}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              tab === "bets"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            📋 Összes tippek
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Betöltés...</div>
        ) : tab === "ranking" ? (
          // RANGLISTA TAB
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-gray-200">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">Hely</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">Játékos</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">Pontok</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">Kredit</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">Tippek száma</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">Telitalálat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leaderboard.filter(user => user.role !== "ADMIN").map((user, index) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                          index === 0 ? "bg-yellow-500" :
                          index === 1 ? "bg-gray-400" :
                          index === 2 ? "bg-orange-600" :
                          "bg-gray-300"
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 font-bold text-purple-900">
                          {user.points}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 font-bold text-blue-900">
                          {user.credits}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block bg-green-50 border border-green-200 rounded-lg px-4 py-2 font-bold text-green-900">
                          {user.tipsCount}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 font-bold text-yellow-900">
                          {user.perfectCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // ÚJ: ÖSSZES TIPPEK TAB - események elkülönítve, csak akkor láthatóak a tippek, ha a user is tippelt az eseményre
          <div className="flex flex-col gap-8">
            {(isAdmin
                ? events.filter(event => (event.status === "OPEN" || event.status === "NYITOTT") && event.finalHomeGoals == null && event.finalAwayGoals == null)
                : Array.from(new Set(bets.map(bet => bet.event.id)))
                    .map(eventId => events.find(e => e.id === eventId))
                    .filter(Boolean)
              )
              .slice()
              .sort((a, b) => new Date(b.kickoffTime).getTime() - new Date(a.kickoffTime).getTime())
              .map(event => {
                if (!event) return null;
                const eventBets = bets.filter(bet => bet.event.id === event.id && bet.user && bet.user.username && bet.user.username.toLowerCase() !== "admin");
                return (
                  <div key={event.id} className="bg-white rounded-2xl shadow-md border-2 border-purple-300 p-6 mb-4">
                    {/* Esemény fejléc */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
                      <div>
                        <div className="text-lg font-bold text-purple-900">{event.homeTeam} – {event.awayTeam}</div>
                        <div className="text-sm text-gray-600">{new Date(event.kickoffTime).toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                      <div className="flex flex-col md:items-end gap-1">
                        <span className="text-sm text-gray-700">Feltett kredit: <span className="font-semibold text-blue-900">{event.creditCost}</span></span>
                        <span className="text-sm text-gray-700">Végeredmény: {event.finalHomeGoals !== null ? <span className="font-semibold text-green-900">{event.finalHomeGoals}–{event.finalAwayGoals}</span> : <span className="text-gray-400">-</span>}</span>
                      </div>
                    </div>
                    {/* Tipp lista vagy üzenet */}
                    {eventBets.length === 0 ? (
                      <div className="text-center text-lg text-gray-500 font-semibold py-8">Tippelj először!</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-purple-50 border-b border-purple-200">
                              <th className="px-4 py-3 text-left font-semibold text-gray-900">Játékos</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-900">Tippje</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-900">Pont</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-900">Nyeremény kredit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {(() => {
                              const totalCreditsForEvent = eventBets.reduce((sum: number, b: Bet) => sum + (b.creditSpent || 0), 0);
                              const dailyPool = Math.round(totalCreditsForEvent * 0.6);
                              const winners = eventBets.filter((b: { pointsAwarded?: number }) => b.pointsAwarded === 6);
                              const winCount = winners.length;
                              return eventBets.map((bet: any) => {
                                let wonCredit = 0;
                                if (
                                  event.finalHomeGoals !== null &&
                                  bet.pointsAwarded === 6 &&
                                  winCount > 0 &&
                                  bet.user && bet.user.username && bet.user.username.toLowerCase() !== "admin"
                                ) {
                                  wonCredit = Math.floor(dailyPool / winCount);
                                }
                                return (
                                  <tr key={bet.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                      <span className="font-semibold text-gray-900">{bet.user.username}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className="inline-block bg-blue-50 border border-blue-200 rounded px-2 py-1 font-semibold text-blue-900">
                                        {bet.predictedHomeGoals}–{bet.predictedAwayGoals}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`inline-block rounded px-2 py-1 font-bold ${
                                        bet.pointsAwarded === 0 ? "bg-red-50 text-red-900" :
                                        bet.pointsAwarded <= 2 ? "bg-yellow-50 text-yellow-900" :
                                        bet.pointsAwarded <= 4 ? "bg-blue-50 text-blue-900" :
                                        "bg-purple-50 text-purple-900"
                                      }`}>
                                        {bet.pointsAwarded}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {event.finalHomeGoals !== null ? (
                                        wonCredit > 0 ? (
                                          <span className="inline-block bg-green-50 border border-green-200 rounded px-2 py-1 font-semibold text-green-900">
                                            {wonCredit}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">0</span>
                                        )
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/profil" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
            ← Saját tippjeim
          </Link>
        </div>
      </div>
    </div>
  );
}
