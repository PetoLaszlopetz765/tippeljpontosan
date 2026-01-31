"use client";

import { useEffect, useState } from "react";
//
interface LeaderboardUser {
  id: number;
  username: string;
  points: number;
  credits: number;
  role: string;
  tipsCount: number;
  perfectCount: number;
}
import Link from "next/link";

interface Bet {
  id: number;
  userId: number;
  eventId: number;
  predictedHomeGoals: number;
  predictedAwayGoals: number;
  pointsAwarded: number;
  creditSpent: number;
  winnings: number;
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

export default function ProfilPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalPoints, setTotalPoints] = useState(0);
  const [profile, setProfile] = useState<{ username: string, credits: number, points: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch("/api/profil", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch {}
    }
    loadProfile();
  }, []);

  // Fetch leaderboard and determine user rank
  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch("/api/leaderboard");
        if (res.ok) {
          const data: LeaderboardUser[] = await res.json();
          setLeaderboard(data);
          if (profile) {
            const filtered = data.filter(u => u.role !== "ADMIN");
            const idx = filtered.findIndex(u => u.username === profile.username);
            setUserRank(idx !== -1 ? idx + 1 : null);
          }
        }
      } catch {}
    }
    if (profile) fetchLeaderboard();
  }, [profile]);

  useEffect(() => {
    async function loadBets() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          window.location.href = "/login";
          return;
        }

        const res = await fetch("/api/bets/my-bets-detailed", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setBets(data);
          const total = data.reduce((sum: number, bet: Bet) => sum + bet.pointsAwarded, 0);
          setTotalPoints(total);
        } else {
          setError("Nem sikerült betölteni a tippeket");
        }
      } catch (err) {
        setError("Hálózati hiba");
      } finally {
        setLoading(false);
      }
    }

    loadBets();
  }, []);

  if (!loading && error) {
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
          <h1 className="text-3xl font-extrabold text-gray-900">Saját Tippjeim</h1>
          <p className="text-gray-700 mt-2">Összes tippem és pontjaim</p>
          {/* User ranking card */}
          {profile && userRank && (
            <div className="flex flex-col items-center justify-center mt-4 mb-2">
              <div className="bg-gradient-to-r from-purple-100 to-purple-200 border border-purple-300 rounded-2xl px-8 py-4 text-center shadow-md">
                <div className="text-lg font-semibold text-purple-900 mb-1">Jelenlegi helyezésed</div>
                <div className="flex items-center justify-center gap-3">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full font-extrabold text-white text-2xl bg-purple-600">{userRank}.</span>
                  <span className="font-bold text-purple-900 text-xl">{profile.username}</span>
                </div>
              </div>
            </div>
          )}
          {profile && (
            <div className="flex flex-col md:flex-row gap-4 mt-4 items-center justify-center">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-6 py-3 text-yellow-900 font-semibold text-lg">
                Kredit egyenleg: <span className="font-extrabold">{profile.credits} kredit</span>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl px-6 py-3 text-purple-900 font-semibold text-lg">
                Pont egyenleg: <span className="font-extrabold">{profile.points} pont</span>
              </div>
            </div>
          )}
        </div>

        {/* Pontok összegzés */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-extrabold text-gray-900 mb-4">📊 Statisztikák</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-gray-700 mb-1">Összes tipp</p>
              <p className="text-3xl font-extrabold text-blue-900">{bets.length}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="text-sm text-gray-700 mb-1">Lezárt tippek</p>
              <p className="text-3xl font-extrabold text-green-900">
                {bets.filter(b => b.event.status === "CLOSED").length}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
              <p className="text-sm text-gray-700 mb-1">Összesen pontok</p>
              <p className="text-3xl font-extrabold text-purple-900">{totalPoints}</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <p className="text-sm text-gray-700 mb-1">Telitalálatok (6 pont)</p>
              <p className="text-3xl font-extrabold text-yellow-900">
                {bets.filter(b => b.pointsAwarded === 6).length}
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl border border-red-200">
              <p className="text-sm text-gray-700 mb-1">Nyertes aránya</p>
              <p className="text-3xl font-extrabold text-red-900">
                {bets.length > 0 ? ((bets.filter(b => b.winnings > 0).length / bets.length * 100).toFixed(1)) : "0"}%
              </p>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-xl border border-indigo-200">
              <p className="text-sm text-gray-700 mb-1">Átlagos pontok</p>
              <p className="text-3xl font-extrabold text-indigo-900">
                {bets.length > 0 ? (totalPoints / bets.length).toFixed(1) : "0"}
              </p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
              <p className="text-sm text-gray-700 mb-1">Összes felhasznált kredit</p>
              <p className="text-3xl font-extrabold text-orange-900">
                {bets.reduce((sum: number, b: Bet) => sum + b.creditSpent, 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-teal-50 rounded-xl border border-teal-200">
              <p className="text-sm text-gray-700 mb-1">Legjobb tipp pontjai</p>
              <p className="text-3xl font-extrabold text-teal-900">
                {bets.length > 0 ? Math.max(...bets.map(b => b.pointsAwarded), 0) : "0"}
              </p>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-sm text-gray-700 mb-1">Összes nyeremény</p>
              <p className="text-3xl font-extrabold text-emerald-900">
                {bets.reduce((sum: number, b: Bet) => sum + b.winnings, 0)}
              </p>
            </div>
          </div>
        </div>


        {/* Tippek: asztali táblázat + mobil kártyák */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Betöltés...</div>
          ) : bets.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-700 mb-4">Még nincsenek tippjeid!</p>
              <Link href="/tippeles" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Tippelésre menni
              </Link>
            </div>
          ) : (
            <>
              {/* Asztali nézet: táblázat */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Meccs</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Tippem</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Végeredmény</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Feltett kredit</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Nyeremény</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Pontok</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Státusz</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bets.map((bet) => (
                      <tr key={bet.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {bet.event.homeTeam} – {bet.event.awayTeam}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {new Date(bet.event.kickoffTime).toLocaleString("hu-HU")}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 font-semibold text-blue-900">
                            {bet.predictedHomeGoals} – {bet.predictedAwayGoals}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {bet.event.finalHomeGoals !== null && bet.event.finalAwayGoals !== null ? (
                            <span className="inline-block bg-green-50 border border-green-200 rounded-lg px-3 py-1 font-semibold text-green-900">
                              {bet.event.finalHomeGoals} – {bet.event.finalAwayGoals}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1 font-semibold text-yellow-900">
                            {bet.creditSpent}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block bg-green-50 border border-green-200 rounded-lg px-3 py-1 font-semibold text-green-900 ${bet.winnings > 0 ? "font-bold" : "text-gray-400"}`}>
                            {bet.winnings}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block rounded-lg px-3 py-1 font-bold ${
                            bet.pointsAwarded === 0 ? "bg-red-50 text-red-900" :
                            bet.pointsAwarded <= 2 ? "bg-yellow-50 text-yellow-900" :
                            bet.pointsAwarded <= 4 ? "bg-blue-50 text-blue-900" :
                            "bg-purple-50 text-purple-900"
                          }`}>
                            {bet.pointsAwarded}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                            bet.event.status === "CLOSED" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"
                          }`}>
                            {bet.event.status === "CLOSED" ? "Lezárt" : "Nyitott"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobil nézet: kártyák */}
              <div className="grid gap-3 md:hidden p-3">
                {bets.map((bet) => (
                  <div key={bet.id} className="border border-purple-200 rounded-xl p-3 bg-purple-50/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900 text-left">{bet.event.homeTeam} – {bet.event.awayTeam}</span>
                      <span className={`inline-block rounded px-2 py-1 text-xs font-bold text-right ${
                        bet.pointsAwarded === 0 ? "bg-red-50 text-red-900" :
                        bet.pointsAwarded <= 2 ? "bg-yellow-50 text-yellow-900" :
                        bet.pointsAwarded <= 4 ? "bg-blue-50 text-blue-900" :
                        "bg-purple-50 text-purple-900"
                      } text-lg md:text-base font-extrabold px-3 py-1`}>
                        <span className="mr-1 text-xs text-gray-700 font-normal">pont:</span>{bet.pointsAwarded}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 text-left">Tipp</span>
                      <span className="inline-block bg-blue-50 border border-blue-200 rounded px-2 py-1 font-semibold text-blue-900 text-right">
                        {bet.predictedHomeGoals}–{bet.predictedAwayGoals}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 text-left">Végeredmény</span>
                      <span className="inline-block bg-green-50 border border-green-200 rounded px-2 py-1 font-semibold text-green-900 text-right">
                        {bet.event.finalHomeGoals !== null && bet.event.finalAwayGoals !== null ? `${bet.event.finalHomeGoals}–${bet.event.finalAwayGoals}` : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 text-left">Feltett kredit</span>
                      <span className="inline-block bg-yellow-50 border border-yellow-200 rounded px-2 py-1 font-semibold text-yellow-900 text-right">
                        {bet.creditSpent}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 text-left">Nyeremény</span>
                      <span className={`inline-block bg-green-50 border border-green-200 rounded px-2 py-1 font-semibold text-right ${bet.winnings > 0 ? "text-green-900 font-bold" : "text-gray-400"}`}>
                        {bet.winnings}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 text-left">Státusz</span>
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-bold text-right ${
                        bet.event.status === "CLOSED" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"
                      }`}>
                        {bet.event.status === "CLOSED" ? "Lezárt" : "Nyitott"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-right">
                      {new Date(bet.event.kickoffTime).toLocaleString("hu-HU")}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link href="/verseny" className="inline-block px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700">
            ⚽ Verseny állása
          </Link>
        </div>
      </div>
    </div>
  );
}
