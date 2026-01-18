"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    function updateNavbarState() {
      const token = localStorage.getItem("token");
      let userRole = localStorage.getItem("role");
      let userName = localStorage.getItem("username");
      userRole = userRole ? userRole.toUpperCase() : null;
      const hasToken = Boolean(token && token !== "null" && token !== "undefined");
      setIsLoggedIn(hasToken);
      setUsername(userName);
      if (hasToken && !userRole) {
        setRole("USER");
      } else {
        setRole(userRole);
      }
    }
    setIsClient(true);
    updateNavbarState();
    window.addEventListener("storage", updateNavbarState);

    // --- Auto-logout after 5 minutes inactivity ---
    let logoutTimer: NodeJS.Timeout | null = null;
    const resetTimer = () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      // Only set timer if logged in
      if (localStorage.getItem("token")) {
        logoutTimer = setTimeout(() => {
          // Clear all session data and redirect
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          localStorage.removeItem("role");
          localStorage.removeItem("username");
          setIsLoggedIn(false);
          setRole(null);
          setUsername(null);
          window.location.href = "/login";
        }, 5 * 60 * 1000); // 5 minutes
      }
    };
    // Listen for user activity
    const activityEvents = ["mousemove", "keydown", "mousedown", "touchstart"];
    activityEvents.forEach(evt => window.addEventListener(evt, resetTimer));
    // Start timer on mount
    resetTimer();

    return () => {
      window.removeEventListener("storage", updateNavbarState);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetTimer));
      if (logoutTimer) clearTimeout(logoutTimer);
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setRole(null);
    setUsername(null);
    router.push("/");
  }

  return (
    <header className="w-full bg-white shadow-md">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold text-green-700">
            ⚽ Tippelde
          </Link>
          {isLoggedIn && username && (
            <span className="text-sm font-semibold text-blue-900 bg-blue-50 rounded-lg px-3 py-1 ml-2">{username}</span>
          )}
        </div>
        <div className="flex gap-4 text-sm font-medium">
          {!isClient ? (
            null
          ) : isLoggedIn && role === "ADMIN" ? (
            <>
              <Link href="/admin" className="text-gray-700 hover:text-blue-600 transition font-semibold">
                ⚙️ Admin Panel
              </Link>
              <Link href="/verseny" className="text-gray-700 hover:text-purple-600 transition font-semibold">
                🏆 Verseny állása
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-red-600 transition cursor-pointer"
              >
                Kijelentkezés
              </button>
            </>
          ) : isLoggedIn ? (
            <>
              <Link href="/tippeles" className="text-gray-700 hover:text-blue-600 transition">
                Tippelés
              </Link>
              <Link href="/profil" className="text-gray-700 hover:text-purple-600 transition">
                Profilom
              </Link>
              <Link href="/verseny" className="text-gray-700 hover:text-purple-600 transition">
                Verseny
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-red-600 transition cursor-pointer"
              >
                Kijelentkezés
              </button>
            </>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
