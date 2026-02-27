"use client";


import Link from "next/link";
import { useEffect, useState } from "react";

type ThemeMode = "system" | "dark" | "light";

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light");

  function applyTheme(nextMode: ThemeMode) {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextResolved = nextMode === "system" ? (systemDark ? "dark" : "light") : nextMode;

    root.classList.remove("light", "dark");
    root.classList.add(nextResolved);
    setResolvedTheme(nextResolved);
  }

  function cycleTheme() {
    const next: ThemeMode = themeMode === "system" ? "dark" : themeMode === "dark" ? "light" : "system";
    setThemeMode(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  }

  useEffect(() => {
    function updateNavbarState() {
      const token = sessionStorage.getItem("token");
      let userRole = sessionStorage.getItem("role");
      let userName = sessionStorage.getItem("username");
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

    const storedTheme = localStorage.getItem("theme");
    const initialTheme: ThemeMode =
      storedTheme === "dark" || storedTheme === "light" || storedTheme === "system"
        ? storedTheme
        : "system";
    setThemeMode(initialTheme);
    applyTheme(initialTheme);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => {
      const current = (localStorage.getItem("theme") as ThemeMode | null) ?? "system";
      if (current === "system") {
        applyTheme("system");
      }
    };

    media.addEventListener("change", onSystemThemeChange);

    window.addEventListener("storage", updateNavbarState);

    // --- Robust inactivity logout (mobile compatible) ---
    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 perc (session cookie timeout-al sync)
    const LAST_ACTIVITY_KEY = "lastActivity";
    const activityEvents = ["mousemove", "keydown", "mousedown", "touchstart", "touchmove"];

    const setLastActivity = () => {
      if (sessionStorage.getItem("token")) {
        sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      }
    };

    const checkInactivity = () => {
      if (!sessionStorage.getItem("token")) return;
      const last = parseInt(sessionStorage.getItem(LAST_ACTIVITY_KEY) || "0", 10);
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
      media.removeEventListener("change", onSystemThemeChange);
      window.removeEventListener("storage", updateNavbarState);
      activityEvents.forEach(evt => window.removeEventListener(evt, setLastActivity));
      document.removeEventListener("visibilitychange", checkInactivity);
      clearInterval(interval);
    };
  }, []);

  function handleLogout() {
    // API logout hívás (session cookie törlése)
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    
    // Session storage törlése
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("lastActivity");
    
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
    <header className="w-full bg-white dark:bg-slate-900 shadow-md border-b border-gray-200 dark:border-slate-800">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold text-green-700">
            ⚽ Tippelde
          </Link>
          {isLoggedIn && username && (
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100 bg-blue-50 dark:bg-blue-900/40 rounded-lg px-3 py-1 ml-2">{username}</span>
          )}
        </div>
        {/* Desktop menu */}
        <div className="hidden md:flex gap-4 text-sm font-medium">
          {!isClient ? (
            null
          ) : isLoggedIn && role === "ADMIN" ? (
            <>
              <Link href="/admin" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition font-semibold">
                ⚙️ Admin Panel
              </Link>
              <Link href="/esemenyek" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition font-semibold">
                Mai események
              </Link>
              <Link href="/tegnapi-esemenyek" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition font-semibold">
                Tegnapi események
              </Link>
              <Link href="/chat" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition font-semibold">
                💬 Chat
              </Link>
              <Link href="/szabalyzat" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition font-semibold">
                Szabályzat
              </Link>
              <Link href="/ranglista" className="text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-300 transition font-semibold">
                🏆 Ranglista
              </Link>
              <Link href="/osszes-tippek" className="text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-300 transition font-semibold">
                📋 Minden tipp
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-300 transition cursor-pointer"
              >
                Kijelentkezés
              </button>
            </>
          ) : isLoggedIn ? (
            <>
              <Link href="/tippeles" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition">
                Tippelés
              </Link>
              <Link href="/esemenyek" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition">
                Mai események
              </Link>
              <Link href="/tegnapi-esemenyek" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition">
                Tegnapi események
              </Link>
              <Link href="/chat" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition">
                Chat
              </Link>
              <Link href="/szabalyzat" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition">
                Szabályzat
              </Link>
              <Link href="/profil" className="text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-300 transition">
                Profilom
              </Link>
              <Link href="/ranglista" className="text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-300 transition">
                Ranglista
              </Link>
              <Link href="/osszes-tippek" className="text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-300 transition">
                Minden tipp
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-300 transition cursor-pointer"
              >
                Kijelentkezés
              </button>
            </>
          ) : (
            <>
              <Link href="/szabalyzat" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition">
                Szabályzat
              </Link>
              <Link href="/login" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition">
                Bejelentkezés
              </Link>
            </>
          )}
          {isClient && (
            <button
              onClick={cycleTheme}
              className="px-3 py-1 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              title="Téma váltása: rendszer / sötét / világos"
            >
              {themeMode === "system" ? "🖥️ Rendszer" : resolvedTheme === "dark" ? "🌙 Sötét" : "☀️ Világos"}
            </button>
          )}
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
        <div className={`fixed top-0 right-0 z-50 h-full w-64 bg-white dark:bg-slate-900 shadow-lg transform transition-transform duration-300 md:hidden ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col gap-6 p-6 pt-10 text-lg font-medium">
            {isClient && (
              <button
                onClick={cycleTheme}
                className="self-start px-3 py-1 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                title="Téma váltása: rendszer / sötét / világos"
              >
                {themeMode === "system" ? "🖥️ Rendszer" : resolvedTheme === "dark" ? "🌙 Sötét" : "☀️ Világos"}
              </button>
            )}
            <button className="self-end mb-4" onClick={() => setMobileMenuOpen(false)} aria-label="Menü bezárása">
              <span className="text-2xl">×</span>
            </button>
            {!isClient ? null : isLoggedIn && role === "ADMIN" ? (
              <>
                <Link href="/admin" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition font-semibold" onClick={() => setMobileMenuOpen(false)}>
                  ⚙️ Admin Panel
                </Link>
                <Link href="/esemenyek" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition font-semibold" onClick={() => setMobileMenuOpen(false)}>
                  Mai események
                </Link>
                <Link href="/tegnapi-esemenyek" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition font-semibold" onClick={() => setMobileMenuOpen(false)}>
                  Tegnapi események
                </Link>
                <Link href="/chat" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition font-semibold" onClick={() => setMobileMenuOpen(false)}>
                  💬 Chat
                </Link>
                <Link href="/szabalyzat" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition font-semibold" onClick={() => setMobileMenuOpen(false)}>
                  Szabályzat
                </Link>
                <Link href="/ranglista" className="text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-300 transition font-semibold" onClick={() => setMobileMenuOpen(false)}>
                  🏆 Ranglista
                </Link>
                <Link href="/osszes-tippek" className="text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-300 transition font-semibold" onClick={() => setMobileMenuOpen(false)}>
                  📋 Minden tipp
                </Link>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-300 transition cursor-pointer"
                >
                  Kijelentkezés
                </button>
              </>
            ) : isLoggedIn ? (
              <>
                <Link href="/tippeles" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition" onClick={() => setMobileMenuOpen(false)}>
                  Tippelés
                </Link>
                <Link href="/esemenyek" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition" onClick={() => setMobileMenuOpen(false)}>
                  Mai események
                </Link>
                <Link href="/tegnapi-esemenyek" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition" onClick={() => setMobileMenuOpen(false)}>
                  Tegnapi események
                </Link>
                <Link href="/chat" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition" onClick={() => setMobileMenuOpen(false)}>
                  Chat
                </Link>
                <Link href="/szabalyzat" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition" onClick={() => setMobileMenuOpen(false)}>
                  Szabályzat
                </Link>
                <Link href="/profil" className="text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-300 transition" onClick={() => setMobileMenuOpen(false)}>
                  Profilom
                </Link>
                <Link href="/ranglista" className="text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-300 transition" onClick={() => setMobileMenuOpen(false)}>
                  Ranglista
                </Link>
                <Link href="/osszes-tippek" className="text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-300 transition" onClick={() => setMobileMenuOpen(false)}>
                  Minden tipp
                </Link>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-300 transition cursor-pointer"
                >
                  Kijelentkezés
                </button>
              </>
            ) : (
              <>
                <Link href="/szabalyzat" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition" onClick={() => setMobileMenuOpen(false)}>
                  Szabályzat
                </Link>
                <Link href="/login" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 transition" onClick={() => setMobileMenuOpen(false)}>
                  Bejelentkezés
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
