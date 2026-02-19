"use client";


import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <div className="w-8 h-8 flex flex-col justify-center items-center cursor-pointer">
      <span className={`block h-1 w-7 rounded bg-gray-700 transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`}></span>
      <span className={`block h-1 w-7 rounded bg-gray-700 my-1 transition-all duration-200 ${open ? 'opacity-0' : ''}`}></span>
      <span className={`block h-1 w-7 rounded bg-gray-700 transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`}></span>
    </div>
  );
}

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

    // --- Robust inactivity logout (mobile compatible) ---
    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 perc (session cookie timeout-al sync)
    const LAST_ACTIVITY_KEY = "lastActivity";
    const activityEvents = ["mousemove", "keydown", "mousedown", "touchstart", "touchmove"];

    const setLastActivity = () => {
      if (localStorage.getItem("token")) {
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      }
    };

    const checkInactivity = () => {
      if (!localStorage.getItem("token")) return;
      const last = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || "0", 10);
      if (Date.now() - last > INACTIVITY_TIMEOUT) {
        // Inaktivitás miatt kijelentkezés
        handleLogout();
      }
    };

    activityEvents.forEach(evt => window.addEventListener(evt, setLastActivity));
    setLastActivity();

    // Check inactivity on visibility change (when returning to tab/app)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        checkInactivity();
      }
    });

    // Optionally, check every minute in case of long open tabs
    const interval = setInterval(checkInactivity, 60 * 1000);

    return () => {
      window.removeEventListener("storage", updateNavbarState);
      activityEvents.forEach(evt => window.removeEventListener(evt, setLastActivity));
      document.removeEventListener("visibilitychange", checkInactivity);
      clearInterval(interval);
    };
  }, []);

  function handleLogout() {
    // API logout hívás (session cookie törlése)
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    
    // Local storage törlése
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("lastActivity");
    
    // State frissítés
    setIsLoggedIn(false);
    setRole(null);
    setUsername(null);
    
    // Oldal újratöltése és login-re redirect
    setTimeout(() => {
      window.location.href = "/login";
    }, 100);
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
        {/* Desktop menu */}
        <div className="hidden md:flex gap-4 text-sm font-medium">
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
        {/* Hamburger icon for mobile */}
        <div className="md:hidden flex items-center">
          <button onClick={() => setMobileMenuOpen((v) => !v)} aria-label="Menü" className="focus:outline-none">
            <HamburgerIcon open={mobileMenuOpen} />
          </button>
        </div>
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-40" onClick={() => setMobileMenuOpen(false)}></div>
        )}
        {/* Mobile menu drawer */}
        <div className={`fixed top-0 right-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 md:hidden ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col gap-6 p-6 pt-10 text-lg font-medium">
            <button className="self-end mb-4" onClick={() => setMobileMenuOpen(false)} aria-label="Menü bezárása">
              <span className="text-2xl">×</span>
            </button>
            {!isClient ? null : isLoggedIn && role === "ADMIN" ? (
              <>
                <Link href="/admin" className="text-gray-700 hover:text-blue-600 transition font-semibold" onClick={() => setMobileMenuOpen(false)}>
                  ⚙️ Admin Panel
                </Link>
                <Link href="/verseny" className="text-gray-700 hover:text-purple-600 transition font-semibold" onClick={() => setMobileMenuOpen(false)}>
                  🏆 Verseny állása
                </Link>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="text-gray-700 hover:text-red-600 transition cursor-pointer"
                >
                  Kijelentkezés
                </button>
              </>
            ) : isLoggedIn ? (
              <>
                <Link href="/tippeles" className="text-gray-700 hover:text-blue-600 transition" onClick={() => setMobileMenuOpen(false)}>
                  Tippelés
                </Link>
                <Link href="/profil" className="text-gray-700 hover:text-purple-600 transition" onClick={() => setMobileMenuOpen(false)}>
                  Profilom
                </Link>
                <Link href="/verseny" className="text-gray-700 hover:text-purple-600 transition" onClick={() => setMobileMenuOpen(false)}>
                  Verseny
                </Link>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="text-gray-700 hover:text-red-600 transition cursor-pointer"
                >
                  Kijelentkezés
                </button>
              </>
            ) : null}
          </div>
        </div>
      </nav>
    </header>
  );
}
