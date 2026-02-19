
import React, { useState } from "react";

interface Props {
  eventId: number;
}

const AdminResultInput: React.FC<Props> = ({ eventId }) => {
  const [homeGoals, setHomeGoals] = useState("");
  const [awayGoals, setAwayGoals] = useState("");
  const [resultMsg, setResultMsg] = useState("");
  const [resultLoading, setResultLoading] = useState(false);

  return (
    <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-2">
      <span className="font-semibold text-yellow-900">Eredmény könyvelése:</span>
      <input
        type="number"
        className="w-16 px-2 py-1 border rounded"
        placeholder="Hazai"
        value={homeGoals}
        onChange={e => setHomeGoals(e.target.value)}
        min={0}
      />
      <span className="font-bold">-</span>
      <input
        type="number"
        className="w-16 px-2 py-1 border rounded"
        placeholder="Vendég"
        value={awayGoals}
        onChange={e => setAwayGoals(e.target.value)}
        min={0}
      />
      <button
        className={`px-4 py-2 rounded bg-green-600 text-white font-bold hover:bg-green-700 transition ${resultLoading ? "opacity-60 cursor-not-allowed" : ""}`}
        disabled={resultLoading}
        onClick={async () => {
          setResultLoading(true);
          setResultMsg("");
          // Check session token before submit
          const token = sessionStorage.getItem("token");
          if (!token) {
            setResultMsg("❌ Nincs bejelentkezve. Kérlek, jelentkezz be!");
            window.location.href = "/login";
            setResultLoading(false);
            return;
          }
          try {
            const res = await fetch(`/api/events/${eventId}/result`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
              body: JSON.stringify({
                finalHomeGoals: Number(homeGoals),
                finalAwayGoals: Number(awayGoals),
              }),
            });
            const data = await res.json();
            if (res.ok) {
              setResultMsg("Eredmény rögzítve!");
            } else {
              setResultMsg(data?.message || "Hiba az eredmény rögzítésénél.");
            }
          } catch (err) {
            setResultMsg("Hálózati hiba történt.");
          } finally {
            setResultLoading(false);
          }
        }}
      >
        {resultLoading ? "Mentés..." : "Eredmény mentése"}
      </button>
      {resultMsg && <span className="ml-2 font-semibold text-green-700">{resultMsg}</span>}
    </div>
  );
};

export default AdminResultInput;
