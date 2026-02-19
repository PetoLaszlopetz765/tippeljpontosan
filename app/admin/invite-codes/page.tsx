"use client";

import { useEffect, useState } from "react";

interface InviteCode {
  code: string;
  used: boolean;
}

export default function AdminInviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newCode, setNewCode] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // Redirect to login if session token is missing
    const token = typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const token = typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
    fetch("/api/admin/invite-codes", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.ok ? res.json() : Promise.reject("Hiba"))
      .then(data => setCodes(data.codes || []))
      .catch(() => setError("Nem sikerült lekérni a kódokat"))
      .finally(() => setLoading(false));
  }, [newCode]);

  const handleGenerate = async () => {
    setSuccess("");
    setError("");
    // Redirect to login if session cookie is missing
    if (typeof document !== "undefined" && !document.cookie.split(";").some((c) => c.trim().startsWith("session="))) {
      window.location.href = "/login";
      return;
    }
    const token = typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
    const res = await fetch("/api/admin/invite-codes", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setNewCode(data.code || "");
      setSuccess("Új kód generálva!");
    } else {
      setError("Nem sikerült új kódot generálni");
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess(`Kimásolva: ${code}`);
  };

  return (
    <div className="max-w-xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Admin – Meghívó kódok</h1>
      <button
        className="mb-4 px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-semibold"
        onClick={handleGenerate}
      >
        Új meghívó kód generálása
      </button>
      {success && <div className="text-green-700 font-semibold mb-2">{success}</div>}
      {error && <div className="text-red-700 font-semibold mb-2">{error}</div>}
      {loading ? (
        <div>Betöltés...</div>
      ) : (
        <div className="flex flex-col gap-2">
          {codes.length === 0 ? (
            <div className="text-gray-500">Nincs elérhető meghívó kód.</div>
          ) : (
            codes.filter(codeObj => codeObj.used === false).map(codeObj => (
              <button
                key={codeObj.code}
                className="px-4 py-2 bg-gray-100 border rounded text-purple-900 font-mono text-lg hover:bg-purple-50 text-left"
                onClick={() => handleCopy(codeObj.code)}
              >
                {codeObj.code}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
