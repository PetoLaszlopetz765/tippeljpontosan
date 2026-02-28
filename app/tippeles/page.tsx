
"use client";
import dynamic from "next/dynamic";
const SupportBanner = dynamic(() => import("../components/SupportBanner"), { ssr: false });
interface BetWithEventId extends BetInput {
  eventId: number;
}

import { useEffect, useMemo, useState } from "react";



interface Event {
  id: number;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  status: "OPEN" | "CLOSED" | "NYITOTT" | "LEZÁRT";
  creditCost: number;
}

interface BetInput {
  predictedHomeGoals: number;
  predictedAwayGoals: number;
}

function isEventOpen(status: Event["status"]) {
  return status === "OPEN" || status === "NYITOTT";
}

export default function TippelesPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [bets, setBets] = useState<Record<number, BetInput>>({});
  const [userBets, setUserBets] = useState<Record<number, BetInput>>({});
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Redirect to login if session token is missing
    const token = sessionStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    async function loadEvents() {
      const res = await fetch("/api/events", { cache: "no-store" });
      if (res.ok) {
        const data: Event[] = await res.json();
        setEvents(data);
      }
    }
    async function loadUserBets() {
      if (!token) return;
      const res = await fetch("/api/bets/my-bets", {
        headers: { "Authorization": `Bearer ${token}` },
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        const betsMap: Record<number, BetInput> = {};
        data.forEach((bet: BetWithEventId) => {
          betsMap[bet.eventId] = {
            predictedHomeGoals: bet.predictedHomeGoals,
            predictedAwayGoals: bet.predictedAwayGoals,
          };
        });
        setUserBets(betsMap);
      }
    }
    loadEvents();
    loadUserBets();
  }, []);

  function handleChange(eventId: number, field: keyof BetInput, value: string) {
    // Csak számjegyek engedélyezése
    const numValue = value.replace(/[^0-9]/g, '');
    const n = numValue === "" ? 0 : Number(numValue);
    setBets((prev) => ({
      ...prev,
      [eventId]: {
        predictedHomeGoals: prev[eventId]?.predictedHomeGoals ?? 0,
        predictedAwayGoals: prev[eventId]?.predictedAwayGoals ?? 0,
        [field]: Number.isFinite(n) ? n : 0,
      },
    }));
  }

  const hasOpenEvent = useMemo(
    () => events.some((e) => isEventOpen(e.status)),
    [events]
  );

  async function reloadUserBets(token: string) {
    const betsRes = await fetch("/api/bets/my-bets", {
      headers: { "Authorization": `Bearer ${token}` },
      cache: "no-store"
    });
    if (betsRes.ok) {
      const data = await betsRes.json();
      const betsMap: Record<number, BetInput> = {};
      data.forEach((bet: BetWithEventId) => {
        betsMap[bet.eventId] = {
          predictedHomeGoals: bet.predictedHomeGoals,
          predictedAwayGoals: bet.predictedAwayGoals,
        };
      });
      setUserBets(betsMap);
    }
  }

  async function submitBets(payload: Array<{ eventId: number; predictedHomeGoals: number; predictedAwayGoals: number }>) {
    if (submitting) return;

    setMessage("");
    setSubmitting(true);

    const token = sessionStorage.getItem("token");
    if (!token) {
      setMessage("❌ Nincs bejelentkezve. Kérlek, jelentkezz be!");
      window.location.href = "/login";
      setSubmitting(false);
      return;
    }

    if (payload.length === 0) {
      setMessage("⚠️ Adj meg legalább egy tippet a leadáshoz! ⚠️");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage(data.message || "✅ Tipp(ek) sikeresen leadva!");
        setBets({});
        await reloadUserBets(token);
        localStorage.setItem("refreshBets", Date.now().toString());
        localStorage.setItem("refreshEvents", Date.now().toString());
      } else {
        const data = await res.json();
        setMessage(data.message || "❌ Hiba történt a tipp leadásakor.");
      }
    } catch {
      setMessage("❌ Hálózati hiba történt a tipp leadásakor.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // csak nyitott meccsek tippjeit küldjük
    const openIds = new Set(events.filter((e) => isEventOpen(e.status)).map((e) => e.id));

    const payload = Object.entries(bets)
      .map(([eventId, bet]) => ({ eventId: Number(eventId), ...bet }))
      .filter((x: { eventId: number }) => openIds.has(x.eventId));

    if (payload.length === 0) {
      setMessage("⚠️ Minden nyitott eseményre tippeltél már! ⚠️");
      return;
    }

    await submitBets(payload);
  }

  async function handleSingleSubmit(eventId: number) {
    const event = events.find((currentEvent) => currentEvent.id === eventId);
    if (!event || !isEventOpen(event.status)) {
      setMessage("⚠️ Erre az eseményre már nem lehet tippelni.");
      return;
    }

    const currentBet = bets[eventId];
    if (!currentBet) {
      setMessage("⚠️ Adj meg tippet ehhez az eseményhez, majd próbáld újra.");
      return;
    }

    await submitBets([{ eventId, ...currentBet }]);
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 text-center">
            Tippelés – Foci VB 2026
          </h1>
          <p className="mt-2 text-center text-gray-700">
            Tippeld meg a mérkőzések pontos végeredményét! (Hazai – Vendég)
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {events.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-gray-800 font-semibold">
                Jelenleg nincsenek elérhető események.
              </p>
            </div>
          )}

          {events.filter(e => !(e.id in userBets)).map((event) => {
            // Csak azokat az eseményeket mutatjuk, amikre MÉG NEM tippelt a user (nyitott vagy zárt is lehet)
            const open = isEventOpen(event.status);
            const hasUserBet = false; // ezekre biztosan nem tippelt

            return (
              <div
                key={event.id}
                className={`bg-white rounded-2xl shadow-sm border p-5 border-gray-200`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* MECCS INFÓ */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-extrabold text-gray-900">
                        {event.homeTeam}
                      </span>
                      <span className="text-gray-800 font-extrabold">–</span>
                      <span className="text-lg font-extrabold text-gray-900">
                        {event.awayTeam}
                      </span>

                      <span
                        className="ml-2 text-xs font-bold px-2.5 py-1 rounded-full border bg-green-50 text-green-800 border-green-200"
                      >
                        Nyitott
                      </span>

                      {hasUserBet && (
                        <span className="ml-2 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                          ✓ Te már tippeltél
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="text-gray-700">Kezdés:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(event.kickoffTime).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" })}
                      </span>
                      <span className="ml-4 text-gray-700">Tippelés díja:</span>
                      <span className="font-semibold text-green-800">{event.creditCost} kredit</span>
                    </div>
                  </div>

                  {/* TIPP INPUTOK */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Hazai"
                      value={hasUserBet ? userBets[event.id]?.predictedHomeGoals : (bets[event.id]?.predictedHomeGoals ?? "")}
                      onChange={(e) => handleChange(event.id, "predictedHomeGoals", e.target.value)}
                      onFocus={(e) => {
                        // Kattintáskor kijelölés
                        if (e.target.value) e.target.select();
                      }}
                      disabled={!open || hasUserBet}
                      className={`w-20 h-12 rounded-xl border-2 text-center text-lg font-extrabold
                        placeholder:text-gray-400
                        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500
                        ${
                          open && !hasUserBet
                            ? "bg-white border-gray-300 text-gray-900"
                            : "bg-gray-100 border-gray-200 text-gray-700 cursor-not-allowed"
                        }`}
                    />
                    <span className="text-gray-900 font-extrabold text-lg">–</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Vendég"
                      value={hasUserBet ? userBets[event.id]?.predictedAwayGoals : (bets[event.id]?.predictedAwayGoals ?? "")}
                      onChange={(e) => handleChange(event.id, "predictedAwayGoals", e.target.value)}
                      onFocus={(e) => {
                        // Kattintáskor kijelölés
                        if (e.target.value) e.target.select();
                      }}
                      disabled={!open || hasUserBet}
                      className={`w-20 h-12 rounded-xl border-2 text-center text-lg font-extrabold
                        placeholder:text-gray-400
                        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500
                        ${
                          open && !hasUserBet
                            ? "bg-white border-gray-300 text-gray-900"
                            : "bg-gray-100 border-gray-200 text-gray-700 cursor-not-allowed"
                        }`}
                    />
                  </div>
                </div>

                {open && hasUserBet && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-blue-800">
                      ✓ Te már tippeltél erre a meccsre. Több tipp leadása nem lehetséges.
                    </p>
                  </div>
                )}

                {open && !hasUserBet && (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSingleSubmit(event.id)}
                      disabled={submitting}
                      className={`h-10 rounded-xl text-white font-bold px-5 shadow transition ${
                        submitting
                          ? "bg-green-400 cursor-not-allowed"
                          : "bg-green-700 hover:bg-green-800 active:bg-green-900"
                      }`}
                    >
                      {submitting ? "Küldés..." : "Esemény tipp leadása"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {message && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 text-center">
              <p className="font-semibold text-gray-900">{message}</p>
            </div>
          )}

          {hasOpenEvent && (
            <button
              type="submit"
              disabled={submitting}
              className={`w-full h-12 rounded-2xl text-white font-extrabold shadow transition ${
                submitting
                  ? "bg-green-400 cursor-not-allowed"
                  : "bg-green-700 hover:bg-green-800 active:bg-green-900"
              }`}
            >
              {submitting ? "Küldés..." : "Tipp leadása"}
            </button>
          )}

          {!hasOpenEvent && events.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 text-center">
              <p className="text-gray-800 font-semibold">
                Jelenleg nincs nyitott mérkőzés, amire tippelni lehet.
              </p>
            </div>
          )}
        </form>
      </div>
      <div className="mt-10">
        <SupportBanner />
      </div>
    </div>
  );
}
