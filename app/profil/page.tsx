"use client";

import { useEffect, useState } from "react";
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-gray-700 mb-1">Összes tipp</p>
              <p className="text-3xl font-extrabold text-blue-900">{bets.length}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="text-sm text-gray-700 mb-1">Teljesített tippek</p>
              <p className="text-3xl font-extrabold text-green-900">
                {bets.filter(b => b.event.status === "CLOSED").length}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
              <p className="text-sm text-gray-700 mb-1">Összesen pontok</p>
              <p className="text-3xl font-extrabold text-purple-900">{totalPoints}</p>
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
                      <span className="font-semibold text-gray-900">{bet.event.homeTeam} – {bet.event.awayTeam}</span>
                      <span className={`inline-block rounded px-2 py-1 text-xs font-bold ${
                        bet.pointsAwarded === 0 ? "bg-red-50 text-red-900" :
                        bet.pointsAwarded <= 2 ? "bg-yellow-50 text-yellow-900" :
                        bet.pointsAwarded <= 4 ? "bg-blue-50 text-blue-900" :
                        "bg-purple-50 text-purple-900"
                      }`}>
                        {bet.pointsAwarded}p
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="inline-block bg-blue-50 border border-blue-200 rounded px-2 py-1 font-semibold text-blue-900">
                        {bet.predictedHomeGoals}–{bet.predictedAwayGoals}
                      </span>
                      <span className="text-gray-600">Tipp</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="inline-block bg-green-50 border border-green-200 rounded px-2 py-1 font-semibold text-green-900">
                        {bet.event.finalHomeGoals !== null && bet.event.finalAwayGoals !== null ? `${bet.event.finalHomeGoals}–${bet.event.finalAwayGoals}` : '-'}
                      </span>
                      <span className="text-gray-600">Végeredmény</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="inline-block bg-yellow-50 border border-yellow-200 rounded px-2 py-1 font-semibold text-yellow-900">
                        {bet.creditSpent}
                      </span>
                      <span className="text-gray-600">Feltett kredit</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className={`inline-block bg-green-50 border border-green-200 rounded px-2 py-1 font-semibold ${bet.winnings > 0 ? "text-green-900 font-bold" : "text-gray-400"}`}>
                        {bet.winnings}
                      </span>
                      <span className="text-gray-600">Nyeremény</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${
                        bet.event.status === "CLOSED" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"
                      }`}>
                        {bet.event.status === "CLOSED" ? "Lezárt" : "Nyitott"}
                      </span>
                      <span className="text-gray-600">Státusz</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
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
