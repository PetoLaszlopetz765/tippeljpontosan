
"use client";
import React, { useEffect, useState } from "react";

interface User {
  id: string;
  username: string;
  role: string;
  credits: number;
  points?: number;
  tipsCount?: number;
  perfectCount?: number;
  tipsCountAdjustment?: number;
  perfectCountAdjustment?: number;
  finalTipsCount?: number;
  finalPerfectCount?: number;
  [key: string]: any;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", inviteCode: "", role: "USER" });
  const [creditEdit, setCreditEdit] = useState<{ [userId: string]: string }>({});
  const [pointsEdit, setPointsEdit] = useState<{ [userId: string]: string }>({});
  const [tipsCountAdjustmentEdit, setTipsCountAdjustmentEdit] = useState<{ [userId: string]: string }>({});
  const [perfectCountAdjustmentEdit, setPerfectCountAdjustmentEdit] = useState<{ [userId: string]: string }>({});
  const [passwordEdit, setPasswordEdit] = useState<{ [userId: string]: string }>({});

  useEffect(() => {
    // Redirect to login if session token is missing
    const storedToken = sessionStorage.getItem("token");
    if (!storedToken) {
      window.location.href = "/login";
      return;
    }
    setToken(storedToken);
    checkAdmin(storedToken);
  }, []);

  const checkAdmin = async (token: string) => {
    try {
      const res = await fetch("/api/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setIsAdmin(true);
      fetchUsers(token);
    } catch {
      setIsAdmin(false);
      window.location.href = "/";
    }
  };

  const fetchUsers = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Hiba a felhasználók lekérdezésekor");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          inviteCode: newUser.inviteCode,
          role: newUser.role,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Hiba a felhasználó létrehozásakor");
      }
      setNewUser({ username: "", password: "", inviteCode: "", role: "USER" });
      fetchUsers(token);
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba");
    }
  };

  const handleCreditChange = (userId: string, value: string) => {
    setCreditEdit((prev) => ({ ...prev, [userId]: value }));
  };

  const handlePointsChange = (userId: string, value: string) => {
    setPointsEdit((prev) => ({ ...prev, [userId]: value }));
  };

  const handleTipsCountAdjustmentChange = (userId: string, value: string) => {
    setTipsCountAdjustmentEdit((prev) => ({ ...prev, [userId]: value }));
  };

  const handlePerfectCountAdjustmentChange = (userId: string, value: string) => {
    setPerfectCountAdjustmentEdit((prev) => ({ ...prev, [userId]: value }));
  };

  const handleCreditUpdate = async (userId: string) => {
    if (!token) return;
    const newCredit = creditEdit[userId];
    if (newCredit === "" || isNaN(Number(newCredit)) || Number(newCredit) < 0) {
      setError("Érvénytelen kredit érték!");
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/credit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newCredit: Number(newCredit) }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Hiba a kredit módosításakor");
      }
      setCreditEdit((prev) => ({ ...prev, [userId]: "" }));
      fetchUsers(token);
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba");
    }
  };

  const handlePasswordUpdate = async (userId: string) => {
    if (!token) return;
    const password = passwordEdit[userId];
    if (!password || password.length < 3) {
      setError("Érvénytelen jelszó (minimum 3 karakter)!");
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Hiba a jelszó módosításakor");
      }
      setPasswordEdit((prev) => ({ ...prev, [userId]: "" }));
      alert("Jelszó sikeresen módosítva!");
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba");
    }
  };

  const handlePointsUpdate = async (userId: string) => {
    if (!token) return;
    const newPoints = pointsEdit[userId];
    if (newPoints === "" || isNaN(Number(newPoints)) || Number(newPoints) < 0) {
      setError("Érvénytelen pont érték!");
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ points: Number(newPoints) }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Hiba a pontszám módosításakor");
      }
      setPointsEdit((prev) => ({ ...prev, [userId]: "" }));
      fetchUsers(token);
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba");
    }
  };

  const handleTipsCountAdjustmentUpdate = async (userId: string) => {
    if (!token) return;
    const newValue = tipsCountAdjustmentEdit[userId];
    if (newValue === "" || isNaN(Number(newValue))) {
      setError("Érvénytelen összes tipp korrekció!");
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tipsCountAdjustment: Number(newValue) }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Hiba az összes tipp korrekció mentésekor");
      }
      setTipsCountAdjustmentEdit((prev) => ({ ...prev, [userId]: "" }));
      fetchUsers(token);
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba");
    }
  };

  const handlePerfectCountAdjustmentUpdate = async (userId: string) => {
    if (!token) return;
    const newValue = perfectCountAdjustmentEdit[userId];
    if (newValue === "" || isNaN(Number(newValue))) {
      setError("Érvénytelen telitalálat korrekció!");
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ perfectCountAdjustment: Number(newValue) }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Hiba a telitalálat korrekció mentésekor");
      }
      setPerfectCountAdjustmentEdit((prev) => ({ ...prev, [userId]: "" }));
      fetchUsers(token);
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba");
    }
  };

  if (loading) return <div>Betöltés...</div>;
  if (!isAdmin) return null;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-3">
            👤 Felhasználók kezelése
          </h1>
          <p className="text-center text-gray-700 text-lg mb-4">
            Itt tudod az összes felhasználót, pontszámukat, kreditjüket és tipp statisztika korrekcióikat áttekinteni, módosítani.
          </p>
        </header>
        <div className="bg-white rounded-2xl shadow-sm border border-blue-300 p-6 mb-8">
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-end">
            <div className="flex flex-col w-full">
              <label className="text-sm font-semibold mb-1 text-gray-900">Felhasználónév</label>
              <input
                type="text"
                placeholder="Felhasználónév"
                value={newUser.username}
                onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                required
                className="border border-gray-300 rounded-xl px-3 py-2 text-gray-900 bg-white shadow-sm"
              />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-sm font-semibold mb-1 text-gray-900">Jelszó</label>
              <input
                type="password"
                placeholder="Jelszó"
                value={newUser.password}
                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                required
                className="border border-gray-300 rounded-xl px-3 py-2 text-gray-900 bg-white shadow-sm"
              />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-sm font-semibold mb-1 text-gray-900">Meghívókód</label>
              <input
                type="text"
                placeholder="Meghívókód"
                value={newUser.inviteCode}
                onChange={e => setNewUser({ ...newUser, inviteCode: e.target.value })}
                required
                className="border border-gray-300 rounded-xl px-3 py-2 text-gray-900 bg-white shadow-sm"
              />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-sm font-semibold mb-1 text-gray-900">Szerepkör</label>
              <select
                value={newUser.role}
                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                className="border border-gray-300 rounded-xl px-3 py-2 text-gray-900 bg-white shadow-sm"
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <button type="submit" className="bg-blue-700 hover:bg-blue-900 text-white font-bold px-6 py-2 rounded-xl shadow w-full md:col-span-2 xl:col-span-1">Létrehozás</button>
          </form>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          {/* Asztali nézet: táblázat */}
          <div className="hidden xl:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-50">
                  <th className="py-2 px-3 text-left text-gray-900 font-bold">Felhasználónév</th>
                  <th className="py-2 px-3 text-left text-gray-900 font-bold">Szerep</th>
                  <th className="py-2 px-3 text-left text-gray-900 font-bold">Pontszám</th>
                  <th className="py-2 px-3 text-left text-gray-900 font-bold">Pont (Új érték)</th>
                  <th className="py-2 px-3 text-left text-gray-900 font-bold">Összes tipp</th>
                  <th className="py-2 px-3 text-left text-gray-900 font-bold">Tipp korrekció</th>
                  <th className="py-2 px-3 text-left text-gray-900 font-bold">Telitalálat</th>
                  <th className="py-2 px-3 text-left text-gray-900 font-bold">Telitalálat korrekció</th>
                  <th className="py-2 px-3 text-left text-gray-900 font-bold">Kredit</th>
                  <th className="py-2 px-3 text-left text-gray-900 font-bold">Kredit (Új érték)</th>
                  <th className="py-2 px-3 text-left text-gray-900 font-bold">Jelszó módosítás</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(users) && users.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-4 text-gray-500">Nincs felhasználó</td></tr>
                ) : (Array.isArray(users) && users.length > 0 ? (
                  users.map(user => (
                    <tr key={user.id} className="border-t border-gray-100 hover:bg-blue-50">
                      <td className="py-2 px-3 font-semibold text-gray-900">{user.username}</td>
                      <td className="py-2 px-3 text-blue-800 font-bold">{user.role}</td>
                      <td className="py-2 px-3 text-gray-900">{typeof user.points === 'number' ? user.points : '-'}</td>
                      <td className="py-2 px-3">
                        <form className="flex flex-row gap-2 items-center" onSubmit={e => { e.preventDefault(); handlePointsUpdate(user.id); }}>
                          <input
                            type="number"
                            value={pointsEdit[user.id] || ""}
                            onChange={e => handlePointsChange(user.id, e.target.value)}
                            min="0"
                            className="border border-amber-300 rounded-xl px-2 py-1 w-24 text-gray-900 bg-white shadow-sm"
                            placeholder="Pl: 10"
                          />
                          <button type="submit" className="bg-amber-700 hover:bg-amber-900 text-white font-bold px-3 py-1 rounded-xl shadow">Beállít</button>
                        </form>
                      </td>
                      <td className="py-2 px-3 text-gray-900 font-semibold">
                        {typeof user.finalTipsCount === "number" ? user.finalTipsCount : (typeof user.tipsCount === "number" ? user.tipsCount : "-")}
                      </td>
                      <td className="py-2 px-3">
                        <form className="flex flex-row gap-2 items-center" onSubmit={e => { e.preventDefault(); handleTipsCountAdjustmentUpdate(user.id); }}>
                          <input
                            type="number"
                            value={tipsCountAdjustmentEdit[user.id] || ""}
                            onChange={e => handleTipsCountAdjustmentChange(user.id, e.target.value)}
                            className="border border-cyan-300 rounded-xl px-2 py-1 w-24 text-gray-900 bg-white shadow-sm"
                            placeholder={`Akt: ${user.tipsCountAdjustment ?? 0}`}
                          />
                          <button type="submit" className="bg-cyan-700 hover:bg-cyan-900 text-white font-bold px-3 py-1 rounded-xl shadow">Beállít</button>
                        </form>
                      </td>
                      <td className="py-2 px-3 text-gray-900 font-semibold">
                        {typeof user.finalPerfectCount === "number" ? user.finalPerfectCount : (typeof user.perfectCount === "number" ? user.perfectCount : "-")}
                      </td>
                      <td className="py-2 px-3">
                        <form className="flex flex-row gap-2 items-center" onSubmit={e => { e.preventDefault(); handlePerfectCountAdjustmentUpdate(user.id); }}>
                          <input
                            type="number"
                            value={perfectCountAdjustmentEdit[user.id] || ""}
                            onChange={e => handlePerfectCountAdjustmentChange(user.id, e.target.value)}
                            className="border border-yellow-300 rounded-xl px-2 py-1 w-24 text-gray-900 bg-white shadow-sm"
                            placeholder={`Akt: ${user.perfectCountAdjustment ?? 0}`}
                          />
                          <button type="submit" className="bg-yellow-700 hover:bg-yellow-900 text-white font-bold px-3 py-1 rounded-xl shadow">Beállít</button>
                        </form>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-mono text-base text-gray-900">{user.credits}</span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex flex-row gap-2 items-center">
                          <form className="flex flex-row gap-2 items-center" onSubmit={e => { e.preventDefault(); handleCreditUpdate(user.id); }}>
                            <input
                              type="number"
                              value={creditEdit[user.id] || ""}
                              onChange={e => handleCreditChange(user.id, e.target.value)}
                              min="0"
                              className="border border-blue-300 rounded-xl px-2 py-1 w-24 text-gray-900 bg-white shadow-sm"
                              placeholder="Pl: 500"
                            />
                            <button type="submit" className="bg-blue-700 hover:bg-blue-900 text-white font-bold px-3 py-1 rounded-xl shadow">Beállít</button>
                          </form>
                          <button
                            className="bg-red-600 hover:bg-red-800 text-white font-bold px-3 py-1 rounded-xl shadow ml-2"
                            title="Felhasználó törlése"
                            onClick={async () => {
                              if (!window.confirm(`Biztosan törölni akarod ${user.username} felhasználót? Ez végleges!`)) return;
                              if (!token) return;
                              const res = await fetch(`/api/users/${user.id}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              if (res.ok) {
                                fetchUsers(token);
                              } else {
                                const data = await res.json().catch(() => ({}));
                                alert(data.message || "Hiba a törlés során");
                              }
                            }}
                          >
                            Törlés
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex flex-row gap-2 items-center">
                          <input
                            type="password"
                            value={passwordEdit[user.id] || ""}
                            onChange={e => setPasswordEdit({ ...passwordEdit, [user.id]: e.target.value })}
                            className="border border-purple-300 rounded-xl px-2 py-1 w-28 text-gray-900 bg-white shadow-sm"
                            placeholder="Új jelszó"
                          />
                          <button
                            onClick={() => handlePasswordUpdate(user.id)}
                            className="bg-purple-700 hover:bg-purple-900 text-white font-bold px-3 py-1 rounded-xl shadow"
                          >
                            Módosít
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : null)}
              </tbody>
            </table>
          </div>

          {/* Mobil nézet: kártyák */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 xl:hidden">
            {Array.isArray(users) && users.length === 0 ? (
              <div className="text-center py-4 text-gray-500">Nincs felhasználó</div>
            ) : (Array.isArray(users) && users.length > 0 ? (
              users.map(user => (
                <div key={user.id} className="border border-gray-200 rounded-xl p-3 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-extrabold text-gray-900">{user.username}</div>
                      <div className="text-xs text-gray-600">Pont: {typeof user.points === 'number' ? user.points : '-'}</div>
                      <div className="text-xs text-gray-600">Tippek: {typeof user.finalTipsCount === 'number' ? user.finalTipsCount : (typeof user.tipsCount === 'number' ? user.tipsCount : '-')}</div>
                      <div className="text-xs text-gray-600">Telitalálat: {typeof user.finalPerfectCount === 'number' ? user.finalPerfectCount : (typeof user.perfectCount === 'number' ? user.perfectCount : '-')}</div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">{user.role}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-700">Kredit:</span>
                    <span className="font-mono font-bold text-gray-900">{user.credits}</span>
                  </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={pointsEdit[user.id] || ""}
                        onChange={e => handlePointsChange(user.id, e.target.value)}
                        min="0"
                        className="flex-1 border border-amber-300 rounded-xl px-2 py-1 text-gray-900 bg-white shadow-sm"
                        placeholder="Pont (pl: 10)"
                      />
                      <button
                        onClick={() => handlePointsUpdate(user.id)}
                        className="bg-amber-700 hover:bg-amber-900 text-white font-bold px-3 py-1 rounded-xl shadow whitespace-nowrap"
                      >
                        Pont
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={tipsCountAdjustmentEdit[user.id] || ""}
                        onChange={e => handleTipsCountAdjustmentChange(user.id, e.target.value)}
                        className="flex-1 border border-cyan-300 rounded-xl px-2 py-1 text-gray-900 bg-white shadow-sm"
                        placeholder={`Összes tipp korrekció (akt: ${user.tipsCountAdjustment ?? 0})`}
                      />
                      <button
                        onClick={() => handleTipsCountAdjustmentUpdate(user.id)}
                        className="bg-cyan-700 hover:bg-cyan-900 text-white font-bold px-3 py-1 rounded-xl shadow whitespace-nowrap"
                      >
                        Tippek
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={perfectCountAdjustmentEdit[user.id] || ""}
                        onChange={e => handlePerfectCountAdjustmentChange(user.id, e.target.value)}
                        className="flex-1 border border-yellow-300 rounded-xl px-2 py-1 text-gray-900 bg-white shadow-sm"
                        placeholder={`Telitalálat korrekció (akt: ${user.perfectCountAdjustment ?? 0})`}
                      />
                      <button
                        onClick={() => handlePerfectCountAdjustmentUpdate(user.id)}
                        className="bg-yellow-700 hover:bg-yellow-900 text-white font-bold px-3 py-1 rounded-xl shadow whitespace-nowrap"
                      >
                        Telitalálat
                      </button>
                    </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={creditEdit[user.id] || ""}
                        onChange={e => handleCreditChange(user.id, e.target.value)}
                        min="0"
                        className="flex-1 border border-blue-300 rounded-xl px-2 py-1 text-gray-900 bg-white shadow-sm"
                        placeholder="Pl: 500"
                      />
                      <button
                        onClick={() => handleCreditUpdate(user.id)}
                        className="bg-blue-700 hover:bg-blue-900 text-white font-bold px-3 py-1 rounded-xl shadow whitespace-nowrap"
                      >
                        Beállít
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={passwordEdit[user.id] || ""}
                        onChange={e => setPasswordEdit({ ...passwordEdit, [user.id]: e.target.value })}
                        className="flex-1 border border-purple-300 rounded-xl px-2 py-1 text-gray-900 bg-white shadow-sm"
                        placeholder="Új jelszó"
                      />
                      <button
                        onClick={() => handlePasswordUpdate(user.id)}
                        className="bg-purple-700 hover:bg-purple-900 text-white font-bold px-3 py-1 rounded-xl shadow whitespace-nowrap"
                      >
                        Jelszó
                      </button>
                    </div>
                    <button
                      className="w-full bg-red-600 hover:bg-red-800 text-white font-bold px-3 py-2 rounded-xl shadow"
                      onClick={async () => {
                        if (!window.confirm(`Biztosan törölni akarod ${user.username} felhasználót? Ez végleges!`)) return;
                        if (!token) return;
                        const res = await fetch(`/api/users/${user.id}`, {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (res.ok) {
                          fetchUsers(token);
                        } else {
                          const data = await res.json().catch(() => ({}));
                          alert(data.message || "Hiba a törlés során");
                        }
                      }}
                    >
                      Törlés
                    </button>
                  </div>
                </div>
              ))
            ) : null)}
          </div>
        </div>
      </div>
    </div>
  );
}
