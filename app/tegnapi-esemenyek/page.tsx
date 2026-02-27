"use client";

import { useEffect, useMemo, useState } from "react";

type UserBet = {
  eventId: number;
  predictedHomeGoals: number;
  predictedAwayGoals: number;
};

type VisibleBet = {
  id: number;
  userId: number;
  eventId: number;
  predictedHomeGoals: number;
  predictedAwayGoals: number;
  pointsAwarded: number;
  user: {
    id: number;
    username: string;
  };
};

type EventItem = {
  id: number;
  homeTeam: string;
  awayTeam: string;
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

type LeaderboardUser = {
  id: number;
  username: string;
  points: number;
  credits: number;
  role: string;
  tipsCount: number;
  perfectCount: number;
};

export default function TegnapiEsemenyekPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [myBets, setMyBets] = useState<UserBet[]>([]);
  const [allVisibleBets, setAllVisibleBets] = useState<VisibleBet[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const storedUserId = sessionStorage.getItem("userId");

    if (storedUserId) {
      setCurrentUserId(Number(storedUserId));
    }

    if (!token) {
      window.location.href = "/login";
      return;
    }

    async function loadData() {
      try {
        const [eventsRes, myBetsRes, allVisibleRes, leaderboardRes] = await Promise.all([
          fetch("/api/events", { cache: "no-store" }),
          fetch("/api/bets/my-bets", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch("/api/bets/all-visible", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch("/api/leaderboard", { cache: "no-store" }),
        ]);

        if (!eventsRes.ok) {
          setError("Nem sikerült betölteni az eseményeket.");
          return;
        }

        const eventsData = (await eventsRes.json()) as EventItem[];
        setEvents(eventsData || []);

        if (myBetsRes.ok) {
          const myBetsData = (await myBetsRes.json()) as UserBet[];
          setMyBets(myBetsData || []);
        }

        if (allVisibleRes.ok) {
          const visibleData = (await allVisibleRes.json()) as { bets: VisibleBet[] };
          setAllVisibleBets(visibleData?.bets || []);
        }

        if (leaderboardRes.ok) {
          const leaderboardData = (await leaderboardRes.json()) as LeaderboardUser[];
          setLeaderboard(leaderboardData || []);
        }
      } catch {
        setError("Hálózati hiba történt.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const yesterdayEvents = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const isSameSystemDay = (date: Date) =>
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();

    return events
      .filter((event) => isSameSystemDay(new Date(event.kickoffTime)))
      .sort((a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime());
  }, [events]);

  const myBetsByEventId = useMemo(() => {
    return new Map(myBets.map((bet) => [bet.eventId, bet]));
  }, [myBets]);

  const userStatsMap = useMemo(() => {
    const filteredUsers = leaderboard
      .filter((user) => user.role !== "ADMIN")
      .slice();

    const eventIdSet = new Set(yesterdayEvents.map((event) => event.id));
    const periodPointsByUser = new Map<number, number>();

    allVisibleBets.forEach((bet) => {
      if (!eventIdSet.has(bet.eventId)) return;
      periodPointsByUser.set(bet.userId, (periodPointsByUser.get(bet.userId) || 0) + (bet.pointsAwarded || 0));
    });

    const sortUsers = (users: Array<LeaderboardUser & { computedPoints: number }>) =>
      users.sort((a, b) => {
        if (b.computedPoints !== a.computedPoints) return b.computedPoints - a.computedPoints;
        if (b.credits !== a.credits) return b.credits - a.credits;
        if (b.perfectCount !== a.perfectCount) return b.perfectCount - a.perfectCount;
        return a.username.localeCompare(b.username);
      });

    const currentSorted = sortUsers(
      filteredUsers.map((user) => ({ ...user, computedPoints: user.points }))
    );
    const previousSorted = sortUsers(
      filteredUsers.map((user) => ({
        ...user,
        computedPoints: user.points - (periodPointsByUser.get(user.id) || 0),
      }))
    );

    const currentRankMap = new Map<number, number>();
    const previousRankMap = new Map<number, number>();

    currentSorted.forEach((user, index) => currentRankMap.set(user.id, index + 1));
    previousSorted.forEach((user, index) => previousRankMap.set(user.id, index + 1));

    const result = new Map<number, {
      rank: number;
      prevRank: number;
      points: number;
      credits: number;
    }>();

    filteredUsers.forEach((user) => {
      result.set(user.id, {
        rank: currentRankMap.get(user.id) || 0,
        prevRank: previousRankMap.get(user.id) || 0,
        points: user.points,
        credits: user.credits,
      });
    });

    return result;
  }, [leaderboard, yesterdayEvents, allVisibleBets]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 px-3 sm:px-4 py-6 sm:py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-slate-100">🗓️ Tegnapi események</h1>
          <p className="text-gray-700 dark:text-slate-300 mt-2 text-sm sm:text-base">
            A tegnapi nap eseményei az összes felhasználó tippjével.
          </p>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 text-center text-gray-600 dark:text-slate-300">
            Betöltés...
          </div>
        ) : error ? (
          <div className="bg-red-50 rounded-2xl border border-red-200 shadow-sm p-6 text-center text-red-700 font-semibold">
            {error}
          </div>
        ) : yesterdayEvents.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 text-center text-gray-700 dark:text-slate-300">
            Tegnapra nincs megjeleníthető esemény.
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5">
            {yesterdayEvents.map((event) => {
              const poolTotal = (event.dailyPool?.totalDaily || 0) + (event.dailyPool?.carriedFromPrevious || 0);
              const myBet = myBetsByEventId.get(event.id);
              const eventBets = allVisibleBets.filter((bet) => bet.eventId === event.id);
              const nonAdminBets = eventBets.filter((bet) => bet.user.username.toLowerCase() !== "admin");
              const winners = nonAdminBets.filter((bet) => bet.pointsAwarded === 6);
              const winCount = winners.length;
              const totalDistributed = event.dailyPool?.totalDistributed || 0;

              return (
                <div key={event.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-sm p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 leading-tight">
                      {event.homeTeam} – {event.awayTeam}
                    </h2>
                    <span className="text-xs sm:text-sm font-semibold px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200">
                      {event.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-3 bg-gray-50 dark:bg-slate-700/40">
                      <p className="text-gray-600 dark:text-slate-300 text-xs mb-1">Kezdés</p>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {new Date(event.kickoffTime).toLocaleString("hu-HU", {
                          timeZone: "Europe/Budapest",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-3 bg-gray-50 dark:bg-slate-700/40">
                      <p className="text-gray-600 dark:text-slate-300 text-xs mb-1">Tipp ára</p>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">{event.creditCost} kredit</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-3 bg-gray-50 dark:bg-slate-700/40">
                      <p className="text-gray-600 dark:text-slate-300 text-xs mb-1">Napi pool</p>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">{poolTotal} kredit</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-3 bg-gray-50 dark:bg-slate-700/40 sm:col-span-3">
                      <p className="text-gray-600 dark:text-slate-300 text-xs mb-1">Végeredmény</p>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {event.finalHomeGoals !== null && event.finalAwayGoals !== null
                          ? `${event.finalHomeGoals} - ${event.finalAwayGoals}`
                          : "Még nincs végeredmény"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 p-3">
                    <p className="text-xs text-purple-700 dark:text-purple-200 mb-1">Saját tipped</p>
                    {myBet ? (
                      <p className="font-bold text-purple-900 dark:text-purple-100 text-lg">
                        {myBet.predictedHomeGoals} – {myBet.predictedAwayGoals}
                      </p>
                    ) : (
                      <p className="font-semibold text-gray-700 dark:text-slate-300">Erre az eseményre nem tippeltél.</p>
                    )}
                  </div>

                  <div className="mt-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 p-3">
                    <p className="text-xs text-blue-700 dark:text-blue-200 mb-2">Összes tipp erre az eseményre</p>
                    {eventBets.length === 0 ? (
                      <p className="font-semibold text-gray-700 dark:text-slate-300">Még nincs leadott tipp.</p>
                    ) : (
                      <>
                        <div className="overflow-x-auto hidden md:block">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-purple-50 dark:bg-purple-900/30 border-b border-purple-200 dark:border-purple-800">
                                <th className="px-3 py-2 text-left font-semibold text-gray-900 dark:text-slate-100">Játékos</th>
                                <th className="px-3 py-2 text-center font-semibold text-gray-900 dark:text-slate-100">Tippje</th>
                                <th className="px-3 py-2 text-center font-semibold text-gray-900 dark:text-slate-100">Pont</th>
                                <th className="px-3 py-2 text-center font-semibold text-gray-900 dark:text-slate-100">Nyeremény kredit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                              {eventBets.map((bet) => {
                                const isOwn = currentUserId !== null && bet.userId === currentUserId;
                                const userStats = userStatsMap.get(bet.userId);
                                const movement = userStats
                                  ? userStats.prevRank > userStats.rank
                                    ? "up"
                                    : userStats.prevRank < userStats.rank
                                      ? "down"
                                      : "same"
                                  : "same";
                                let wonCredit = 0;
                                if (
                                  event.finalHomeGoals !== null &&
                                  bet.pointsAwarded === 6 &&
                                  winCount > 0 &&
                                  bet.user.username.toLowerCase() !== "admin" &&
                                  totalDistributed > 0
                                ) {
                                  wonCredit = Math.floor(totalDistributed / winCount);
                                }

                                return (
                                  <tr key={bet.id} className={isOwn ? "bg-purple-100/60 dark:bg-purple-900/25" : ""}>
                                    <td className="px-3 py-2 font-semibold text-gray-900 dark:text-slate-100">
                                      {bet.user.username}
                                      {isOwn ? " (Te)" : ""}
                                      {userStats && (
                                        <span className="ml-2 text-xs font-medium text-gray-600 dark:text-slate-300">
                                          • #{userStats.rank} • {userStats.points} pont • {userStats.credits} kredit{" "}
                                          {movement === "up" ? (
                                            <span className="text-red-600 dark:text-red-400">⬆</span>
                                          ) : movement === "down" ? (
                                            <span className="text-red-600 dark:text-red-400">⬇</span>
                                          ) : (
                                            <span className="text-yellow-500">●</span>
                                          )}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className="font-bold text-blue-900 dark:text-blue-200">
                                        {bet.predictedHomeGoals} - {bet.predictedAwayGoals}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className={`inline-block rounded px-2 py-1 text-xs font-bold ${
                                        bet.pointsAwarded === 0
                                          ? "bg-red-50 text-red-900"
                                          : bet.pointsAwarded <= 2
                                            ? "bg-yellow-50 text-yellow-900"
                                            : bet.pointsAwarded <= 4
                                              ? "bg-blue-50 text-blue-900"
                                              : "bg-purple-50 text-purple-900"
                                      }`}>
                                        {bet.pointsAwarded}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
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
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="grid gap-2 md:hidden">
                          {eventBets.map((bet) => {
                            const isOwn = currentUserId !== null && bet.userId === currentUserId;
                            const userStats = userStatsMap.get(bet.userId);
                            const movement = userStats
                              ? userStats.prevRank > userStats.rank
                                ? "up"
                                : userStats.prevRank < userStats.rank
                                  ? "down"
                                  : "same"
                              : "same";
                            let wonCredit = 0;
                            if (
                              event.finalHomeGoals !== null &&
                              bet.pointsAwarded === 6 &&
                              winCount > 0 &&
                              bet.user.username.toLowerCase() !== "admin" &&
                              totalDistributed > 0
                            ) {
                              wonCredit = Math.floor(totalDistributed / winCount);
                            }

                            return (
                              <div
                                key={bet.id}
                                className={`rounded-lg border px-3 py-2 ${
                                  isOwn
                                    ? "border-purple-300 dark:border-purple-700 bg-purple-100 dark:bg-purple-900/40"
                                    : "border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                                    {bet.user.username}
                                    {isOwn ? " (Te)" : ""}
                                  </p>
                                  <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
                                    {bet.predictedHomeGoals} - {bet.predictedAwayGoals}
                                  </p>
                                </div>
                                {userStats && (
                                  <p className="text-xs text-gray-600 dark:text-slate-300 mb-1">
                                    #{userStats.rank} • {userStats.points} pont • {userStats.credits} kredit{" "}
                                    {movement === "up" ? (
                                      <span className="text-red-600 dark:text-red-400">⬆</span>
                                    ) : movement === "down" ? (
                                      <span className="text-red-600 dark:text-red-400">⬇</span>
                                    ) : (
                                      <span className="text-yellow-500">●</span>
                                    )}
                                  </p>
                                )}
                                <div className="flex items-center justify-between text-xs">
                                  <span className={`inline-block rounded px-2 py-1 font-bold ${
                                    bet.pointsAwarded === 0
                                      ? "bg-red-50 text-red-900"
                                      : bet.pointsAwarded <= 2
                                        ? "bg-yellow-50 text-yellow-900"
                                        : bet.pointsAwarded <= 4
                                          ? "bg-blue-50 text-blue-900"
                                          : "bg-purple-50 text-purple-900"
                                  }`}>
                                    Pont: {bet.pointsAwarded}
                                  </span>
                                  <span className="text-gray-700 dark:text-slate-300">
                                    Nyeremény: {event.finalHomeGoals !== null ? wonCredit : "-"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
