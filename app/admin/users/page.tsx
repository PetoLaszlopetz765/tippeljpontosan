
"use client";
import React, { useEffect, useState } from "react";

interface User {
  id: string;
  username: string;
  role: string;
  credits: number;
  points?: number;
  [key: string]: any;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", inviteCode: "" });
  const [creditEdit, setCreditEdit] = useState<{ [userId: string]: string }>({});

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
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
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Hiba a felhasználó létrehozásakor");
      }
      setNewUser({ username: "", password: "", inviteCode: "" });
      fetchUsers(token);
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba");
    }
  };

  const handleCreditChange = (userId: string, value: string) => {
    setCreditEdit((prev) => ({ ...prev, [userId]: value }));
  };

  const handleCreditUpdate = async (userId: string) => {
    if (!token) return;
    const amount = creditEdit[userId];
    if (!amount || isNaN(Number(amount))) {
      setError("Érvénytelen összeg!");
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
        body: JSON.stringify({ amount: Number(amount) }),
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

  if (loading) return <div>Betöltés...</div>;
  if (!isAdmin) return null;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-3">
            👤 Felhasználók kezelése
          </h1>
          <p className="text-center text-gray-700 text-lg mb-4">
            Itt tudod az összes felhasználót, pontszámukat és kreditjüket áttekinteni, módosítani.
          </p>
        </header>
        <div className="bg-white rounded-2xl shadow-sm border border-blue-300 p-6 mb-8">
          <form onSubmit={handleCreateUser} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex flex-col flex-1 w-full">
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
            <div className="flex flex-col flex-1 w-full">
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
            <div className="flex flex-col flex-1 w-full">
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
            <button type="submit" className="bg-blue-700 hover:bg-blue-900 text-white font-bold px-6 py-2 rounded-xl shadow w-full md:w-auto">Létrehozás</button>
          </form>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <table className="w-full">
            <thead>
              <tr className="bg-blue-50">
                <th className="py-2 px-3 text-left text-gray-900 font-bold">Felhasználónév</th>
                <th className="py-2 px-3 text-left text-gray-900 font-bold">Szerep</th>
                <th className="py-2 px-3 text-left text-gray-900 font-bold">Pontszám</th>
                <th className="py-2 px-3 text-left text-gray-900 font-bold">Kredit</th>
                <th className="py-2 px-3 text-left text-gray-900 font-bold">Kredit módosítás</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(users) && users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4 text-gray-500">Nincs felhasználó</td></tr>
              ) : (Array.isArray(users) && users.length > 0 ? (
                users.map(user => (
                  <tr key={user.id} className="border-t border-gray-100 hover:bg-blue-50">
                    <td className="py-2 px-3 font-semibold text-gray-900">{user.username}</td>
                    <td className="py-2 px-3 text-blue-800 font-bold">{user.role}</td>
                    <td className="py-2 px-3 text-gray-900">{typeof user.points === 'number' ? user.points : '-'}</td>
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
                            className="border border-blue-300 rounded-xl px-2 py-1 w-20 text-gray-900 bg-white shadow-sm"
                            placeholder="Új kredit"
                          />
                          <button type="submit" className="bg-blue-700 hover:bg-blue-900 text-white font-bold px-3 py-1 rounded-xl shadow">Módosít</button>
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
                  </tr>
                ))
              ) : null)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
