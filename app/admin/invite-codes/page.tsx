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
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendingCode, setSendingCode] = useState("");
  const token = typeof window !== "undefined" ? sessionStorage.getItem("token") : null;

  useEffect(() => {
    // Redirect to login if session token is missing
    if (!token) {
      window.location.href = "/login";
      return;
    }
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
    if (!token) {
      window.location.href = "/login";
      return;
    }
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

  const handleSendInvite = async (code: string) => {
    setSuccess("");
    setError("");

    const email = recipientEmail.trim();
    if (!email) {
      setError("Adj meg egy email címet a küldéshez.");
      return;
    }

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setSendingCode(code);
    try {
      const res = await fetch("/api/admin/invite-codes/send-email", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message || "Nem sikerült elküldeni az emailt.");
        return;
      }

      setSuccess(data?.message || `Meghívó elküldve: ${email}`);
    } catch {
      setError("Hálózati hiba történt az email küldésekor.");
    } finally {
      setSendingCode("");
    }
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
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-1">Címzett email</label>
        <input
          type="email"
          className="w-full rounded border border-gray-300 px-3 py-2"
          placeholder="pelda@email.com"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
        />
      </div>
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
              <div key={codeObj.code} className="px-4 py-2 bg-gray-100 border rounded">
                <div className="flex items-center justify-between gap-3">
                  <button
                    className="text-purple-900 font-mono text-lg hover:bg-purple-50 text-left rounded px-2 py-1"
                    onClick={() => handleCopy(codeObj.code)}
                  >
                    {codeObj.code}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendInvite(codeObj.code)}
                    disabled={sendingCode === codeObj.code}
                    className="px-3 py-1 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {sendingCode === codeObj.code ? "Küldés..." : "Küldés emailben"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
