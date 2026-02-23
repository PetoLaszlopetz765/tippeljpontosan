"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function EsemenyekPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    async function loadEvents() {
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
        if (!res.ok) {
          setError("Nem sikerült betölteni az eseményeket.");
          return;
        }

        const data = (await res.json()) as EventItem[];
        setEvents(data || []);
      } catch {
        setError("Hálózati hiba történt.");
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  const nextTwoEvents = useMemo(() => {
    const now = new Date();

    const upcoming = events
      .filter(
        (event) =>
          event.finalHomeGoals === null &&
          event.finalAwayGoals === null &&
          new Date(event.kickoffTime) >= now
      )
      .sort((a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime())
      .slice(0, 2);

    if (upcoming.length === 2) {
      return upcoming;
    }

    const fallback = events
      .filter((event) => event.finalHomeGoals === null && event.finalAwayGoals === null)
      .sort((a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime())
      .slice(0, 2);

    return fallback;
  }, [events]);

  return (
    <div className="min-h-screen bg-gray-100 px-3 sm:px-4 py-6 sm:py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">📅 Következő események</h1>
          <p className="text-gray-700 mt-2 text-sm sm:text-base">Az aktuális következő 2 esemény gyors nézetben.</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center text-gray-600">
            Betöltés...
          </div>
        ) : error ? (
          <div className="bg-red-50 rounded-2xl border border-red-200 shadow-sm p-6 text-center text-red-700 font-semibold">
            {error}
          </div>
        ) : nextTwoEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center text-gray-700">
            Jelenleg nincs közelgő esemény.
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5">
            {nextTwoEvents.map((event) => {
              const poolTotal = (event.dailyPool?.totalDaily || 0) + (event.dailyPool?.carriedFromPrevious || 0);

              return (
                <div key={event.id} className="bg-white rounded-2xl border border-blue-200 shadow-sm p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                      {event.homeTeam} – {event.awayTeam}
                    </h2>
                    <span className="text-xs sm:text-sm font-semibold px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
                      {event.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                      <p className="text-gray-600 text-xs mb-1">Kezdés</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(event.kickoffTime).toLocaleString("hu-HU", {
                          timeZone: "Europe/Budapest",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                      <p className="text-gray-600 text-xs mb-1">Tipp ára</p>
                      <p className="font-semibold text-gray-900">{event.creditCost} kredit</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                      <p className="text-gray-600 text-xs mb-1">Napi pool</p>
                      <p className="font-semibold text-gray-900">{poolTotal} kredit</p>
                    </div>
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
