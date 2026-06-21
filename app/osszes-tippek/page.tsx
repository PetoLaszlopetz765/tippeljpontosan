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
    league: string;
    kickoffTime: string;
    status: string;
    finalHomeGoals: number | null;
    finalAwayGoals: number | null;
    creditCost: number;
    dailyPool?: {
      totalDaily: number;
      carriedFromPrevious: number;
      totalDistributed: number;
    } | null;
  };
}

export default function OsszesTippekPage() {
    // Pagination state for events
    const [visibleEventsCount, setVisibleEventsCount] = useState(5);
  const [tab] = useState<"ranking" | "bets">("bets");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [userEventIds, setUserEventIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [closeMsg, setCloseMsg] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);
  const [pool, setPool] = useState<{ totalDaily: number, totalChampionship: number }>({ totalDaily: 0, totalChampionship: 0 });
  const [events, setEvents] = useState<any[]>([]);
  // ÚJ: Frissítés trigger figyelése (tippelés után) - events és bets
  useEffect(() => {
    const handler = () => {
      if (tab === "bets") {
        const token = typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
        fetch("/api/bets/all-bets", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
          .then(res => res.ok ? res.json() : { bets: [], userEventIds: [] })
          .then(data => {
            setBets(data.bets || []);
            setUserEventIds(data.userEventIds || []);
          });
        // Eventos pool frissítés
        fetch("/api/events")
          .then(res => res.ok ? res.json() : [])
          .then(setEvents);
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === "refreshBets" || e.key === "refreshEvents") {
        handler();
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [tab]);
  // Események frissítése tab váltáskor is, hogy mindig naprakész legyen
  useEffect(() => {
    if (tab === "bets") {
      fetch("/api/events")
        .then(res => res.ok ? res.json() : [])
        .then(setEvents);
    }
  }, [tab]);
  // ...existing code...
  // Események betöltése mindig mountkor is

  useEffect(() => {
    // Redirect to login if session token is missing
    const token = sessionStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    fetch("/api/events")
      .then(res => res.ok ? res.json() : [])
      .then(setEvents);
  }, []);

  useEffect(() => {
    fetch("/api/creditpool").then(res => res.ok ? res.json() : { totalDaily: 0, totalChampionship: 0 }).then(setPool);
  }, []);
  useEffect(() => {
    // Ellenőrizzük, hogy az aktuális user admin-e (tokenből vagy API-ból)
    const token = typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
    if (!token) {
      window.location.href = "/login";
      return;
    }
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
      // Redirect to login if session token is missing
      const token = typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
      if (!token) {
        window.location.href = "/login";
        return;
      }
      try {
        const [leaderRes, betsRes] = await Promise.all([
          fetch("/api/leaderboard"),
          fetch("/api/bets/all-bets", {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }),
        ]);

        if (leaderRes.ok) {
          setLeaderboard(await leaderRes.json());
        }
        if (betsRes.ok) {
          const data = await betsRes.json();
          if (Array.isArray(data)) {
            setBets(data);
          } else {
            setBets(data.bets || []);
            setUserEventIds(data.userEventIds || []);
          }
        }
      } catch (err) {
        setError("Hálózati hiba");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Következő nyitott esemény napi poolja (halmozott összeg)
  const nextEvent = [...events]
    .filter((e) => e.finalHomeGoals === null && e.finalAwayGoals === null)
    .sort((a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime())[0];

  // Ha nincs következő nyitott esemény, megkeressük az utolsó lezárt eseményt a göngyölített szum-hoz
  const lastEvent = [...events]
    .sort((a, b) => new Date(b.kickoffTime).getTime() - new Date(a.kickoffTime).getTime())[0];

  const nextEventPool = nextEvent?.dailyPool
    ? (nextEvent.dailyPool.totalDaily || 0) + (nextEvent.dailyPool.carriedFromPrevious || 0)
    : (lastEvent?.dailyPool?.totalDaily || 0) + (lastEvent?.dailyPool?.carriedFromPrevious || 0);

  const nextEventLabel = nextEvent
    ? `${nextEvent.homeTeam} – ${nextEvent.awayTeam} (${nextEvent.league || "Ismeretlen liga"})`
    : "Nincs közelgő esemény";

  const nextEventTime = nextEvent
    ? new Date(nextEvent.kickoffTime).toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest" })
    : "";

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-slate-900 px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100">⚽ Verseny Állása</h1>
          <p className="text-gray-700 dark:text-slate-300 mt-2">Játékosok ranglistája és összes tippek</p>
          <div className="flex flex-col md:flex-row gap-4 mt-4 mb-2 items-center justify-center">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-6 py-3 text-blue-900 font-semibold text-lg text-center">
              Következő esemény napi poolja: <span className="font-extrabold">{nextEventPool}</span> kredit
              <div className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                {nextEventLabel}{nextEventTime ? ` • ${nextEventTime}` : ""}
              </div>
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
                  if (!window.confirm("⚠️ Biztosan lezárni szeretnéd a versenyt és kiosztani a nyeremények? Ez végleges és visszavonhatatlan!")) {
                    return;
                  }
                  setCloseLoading(true);
                  setCloseMsg("");
                  const token = sessionStorage.getItem("token");
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
              {closeMsg && <div className="text-center text-lg font-semibold text-green-700 dark:text-green-300 mt-2">{closeMsg}</div>}
            </div>
          )}
        </div>

        <div className="mb-8" />

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-slate-400">Betöltés...</div>
        ) : tab === "ranking" ? (
          // RANGLISTA TAB
          <div>
            {/* Asztali nézet: táblázat */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/30 border-b border-gray-200 dark:border-slate-700">
                      <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">Hely</th>
                      <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">Játékos</th>
                      <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">Pontok</th>
                      <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">Kredit</th>
                      <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">Tippek száma</th>
                      <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">Telitalálat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leaderboard
                      .filter(user => user.role !== "ADMIN")
                      .slice() // copy to avoid mutating state
                      .sort((a, b) => {
                        if (b.points !== a.points) return b.points - a.points;
                        if (b.credits !== a.credits) return b.credits - a.credits;
                        if (b.perfectCount !== a.perfectCount) return b.perfectCount - a.perfectCount;
                        return a.username.localeCompare(b.username);
                      })
                      .map((user, index) => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                              index === 0 ? "bg-yellow-500" :
                              index === 1 ? "bg-gray-400" :
                              index === 2 ? "bg-orange-600" :
                              "bg-gray-300"
                            }`}>
                              {index + 1}.
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

            {/* Mobil nézet: kártyák */}
            <div className="grid gap-3 md:hidden">
              {leaderboard
                .filter(user => user.role !== "ADMIN")
                .slice()
                .sort((a, b) => {
                  if (b.points !== a.points) return b.points - a.points;
                  if (b.credits !== a.credits) return b.credits - a.credits;
                  if (b.perfectCount !== a.perfectCount) return b.perfectCount - a.perfectCount;
                  return a.username.localeCompare(b.username);
                })
                .map((user, index) => (
                  <div key={user.id} className="border border-purple-200 dark:border-purple-800 rounded-xl p-4 bg-white dark:bg-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-white text-lg ${
                          index === 0 ? "bg-yellow-500" :
                          index === 1 ? "bg-gray-400" :
                          index === 2 ? "bg-orange-600" :
                          "bg-gray-300"
                        }`}>
                          {index + 1}.
                        </span>
                        <div>
                          <div className="font-extrabold text-gray-900">{user.username}</div>
                          <div className="text-xs text-gray-600 dark:text-slate-300">Tippek: {user.tipsCount}</div>
                        </div>
                      </div>
                      <span className="inline-block bg-purple-50 border border-purple-200 rounded-lg px-3 py-1 font-bold text-purple-900 text-sm">
                        <span className="mr-1 text-xs text-gray-700 font-normal">pont:</span><span className="text-lg font-extrabold">{user.points}</span>
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Kredit</span>
                        <span className="inline-block bg-blue-50 border border-blue-200 rounded px-2 py-1 font-bold text-blue-900 text-sm">
                          {user.credits}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Telitalálat</span>
                        <span className="inline-block bg-yellow-50 border border-yellow-200 rounded px-2 py-1 font-bold text-yellow-900 text-sm">
                          {user.perfectCount}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {(() => {
              const eventMap = new Map<number, { event: Bet["event"]; bets: Bet[] }>();
              const allowedEventIds = new Set(userEventIds);

              bets
                .filter(
                  (bet) =>
                    bet.user &&
                    bet.user.username &&
                    bet.user.username.toLowerCase() !== "admin" &&
                    allowedEventIds.has(bet.event.id)
                )
                .forEach((bet) => {
                  if (!eventMap.has(bet.event.id)) {
                    eventMap.set(bet.event.id, { event: bet.event, bets: [] });
                  }
                  eventMap.get(bet.event.id)?.bets.push(bet);
                });

              const eventEntries = Array.from(eventMap.values()).sort(
                (a, b) => new Date(b.event.kickoffTime).getTime() - new Date(a.event.kickoffTime).getTime()
              );
              const selectedEvent =
                eventEntries.find(({ event }) => event.id === selectedEventId) ?? null;

              const renderEventDetails = (event: Bet["event"], eventBets: Bet[]) => {
                const nonAdminBets = eventBets.filter((bet) => bet.user.username.toLowerCase() !== "admin");
                const winners = nonAdminBets.filter((bet) => bet.pointsAwarded === 6);
                const winCount = winners.length;
                const totalDistributed = event.dailyPool?.totalDistributed || 0;

                const calculateWonCredit = (bet: Bet) => {
                  if (
                    event.finalHomeGoals !== null &&
                    bet.pointsAwarded === 6 &&
                    winCount > 0 &&
                    bet.user.username.toLowerCase() !== "admin" &&
                    totalDistributed > 0
                  ) {
                    return Math.floor(totalDistributed / winCount);
                  }
                  return event.finalHomeGoals !== null ? 0 : null;
                };

                return eventBets.length === 0 ? (
                  <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 p-3">
                    <p className="font-semibold text-gray-700 dark:text-slate-300">Még nincs leadott tipp.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto hidden md:block">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-purple-50 dark:bg-purple-900/30 border-b border-purple-200 dark:border-purple-800">
                            <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-slate-100">Játékos</th>
                            <th className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-slate-100">Tippje</th>
                            <th className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-slate-100">Pont</th>
                            <th className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-slate-100">Nyeremény kredit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                          {eventBets.map((bet) => {
                            const wonCredit = calculateWonCredit(bet);
                            const displayWonCredit = wonCredit ?? 0;
                            return (
                              <tr key={bet.id}>
                                <td className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-slate-100">{bet.user.username}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="font-bold text-purple-900 dark:text-purple-200 text-lg">{bet.predictedHomeGoals}–{bet.predictedAwayGoals}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-block rounded px-2 py-1 text-xs font-bold ${
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
                                    displayWonCredit > 0 ? (
                                      <span className="inline-block bg-green-50 border border-green-200 rounded px-2 py-1 font-semibold text-green-900">
                                        {displayWonCredit}
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
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid gap-3 md:hidden">
                      {eventBets.map((bet) => {
                        const wonCredit = calculateWonCredit(bet);
                        const displayWonCredit = wonCredit ?? 0;
                        return (
                          <div key={bet.id} className="border border-purple-200 dark:border-purple-800 rounded-xl p-3 bg-purple-50/40 dark:bg-purple-900/30">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-900 dark:text-slate-100">{bet.user.username}</span>
                              <span className={`inline-block rounded px-2 py-1 text-xs font-bold ${
                                bet.pointsAwarded === 0 ? "bg-red-50 text-red-900" :
                                bet.pointsAwarded <= 2 ? "bg-yellow-50 text-yellow-900" :
                                bet.pointsAwarded <= 4 ? "bg-blue-50 text-blue-900" :
                                "bg-purple-50 text-purple-900"
                              } text-lg md:text-base font-extrabold px-3 py-1`}>
                                <span className="mr-1 text-xs text-gray-700 font-normal">szerzett pont:</span>{bet.pointsAwarded}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="inline-block bg-blue-50 border border-blue-200 rounded px-2 py-1 font-semibold text-blue-900">
                                {bet.predictedHomeGoals}–{bet.predictedAwayGoals}
                              </span>
                              <span className="text-gray-600 dark:text-slate-300">Tipp</span>
                            </div>
                            <div className="text-sm flex items-center justify-between">
                              <span className="text-gray-700 dark:text-slate-300">Nyeremény:</span>
                              {event.finalHomeGoals !== null ? (
                                displayWonCredit > 0 ? (
                                  <span className="inline-block bg-green-50 border border-green-200 rounded px-2 py-1 font-semibold text-green-900">
                                    {displayWonCredit}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">0</span>
                                )
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              };

              return (
                <>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-purple-200 dark:border-purple-800 p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-purple-900 dark:text-purple-100">Események</h2>
                        <p className="text-sm text-gray-600 dark:text-slate-300">
                          Kattints egy eseményre, és a kártya lenyílik a részletekkel együtt.
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200">
                        {eventEntries.length} esemény
                      </span>
                    </div>

                    {eventEntries.length === 0 ? (
                      <p className="font-semibold text-gray-700 dark:text-slate-300">Még nincs megjeleníthető esemény.</p>
                    ) : (
                      <div className="grid gap-2">
                        {eventEntries.map(({ event, bets: eventBets }) => {
                          const isSelected = selectedEventId === event.id;

                          return (
                            <div
                              key={event.id}
                              className={`rounded-xl border transition ${
                                isSelected
                                  ? "border-purple-400 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-700"
                                  : "border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedEventId((current) => (current === event.id ? null : event.id))}
                                className="w-full text-left rounded-xl px-4 py-3 transition hover:bg-gray-50/80 dark:hover:bg-slate-700/40"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-bold text-gray-900 dark:text-slate-100">
                                      {event.homeTeam} – {event.awayTeam}
                                    </div>
                                    <div className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                                      {event.league || "Ismeretlen liga"}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-slate-300 mt-1">
                                      {new Date(event.kickoffTime).toLocaleString("hu-HU", {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        timeZone: "Europe/Budapest",
                                      })}
                                    </div>
                                  </div>
                                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${
                                    isSelected
                                      ? "bg-purple-100 border-purple-200 text-purple-800 dark:bg-purple-900/40 dark:border-purple-800 dark:text-purple-200"
                                      : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200"
                                  }`}>
                                    {event.finalHomeGoals !== null && event.finalAwayGoals !== null
                                      ? `${event.finalHomeGoals} - ${event.finalAwayGoals}`
                                      : event.status}
                                  </span>
                                </div>
                              </button>

                              {isSelected && (
                                <div className="border-t border-purple-200 dark:border-purple-800 px-4 py-4">
                                  {renderEventDetails(event, eventBets)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
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
