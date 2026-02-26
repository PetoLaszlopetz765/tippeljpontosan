
import Link from "next/link";
import SupportBanner from "./components/SupportBanner";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-slate-100 mb-4">
            ⚽ Tippelde
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-slate-200 mb-8">
            A baráti foci tippjáték – valódi pénz nélkül!
          </p>
          <p className="text-lg text-gray-600 dark:text-slate-300 mb-8">
            Tippelj a meghatározott meccsekre, gyűjts pontokat, és nézd meg, milyen jók a tippeid!
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-slate-700">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">Pontjelző Rendszer</h3>
            <p className="text-gray-700 dark:text-slate-300 text-sm">
              Tippelj az összes meccsre és nézd meg hogyan teljesítesz.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-slate-700">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">Rangsor</h3>
            <p className="text-gray-700 dark:text-slate-300 text-sm">
              Versenyezz barátaiddal és legyél te az első a legjobb tippelőként.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-slate-700">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">Biztonságos</h3>
            <p className="text-gray-700 dark:text-slate-300 text-sm">
              Meghívókód alapú regisztráció – csak a barátaid csatlakozhatnak.
            </p>
          </div>
        </div>

        {/* How it Works */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-slate-700 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6 text-center">Hogyan működik a játék?</h2>
          <ol className="space-y-4">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-slate-100">Regisztrálj meghívókóddal</p>
                <p className="text-gray-600 dark:text-slate-300 text-sm">Kérj egy meghívókódot a szervezőtől, majd regisztrálj az alkalmazásban.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-slate-100">Tippelj az összes meccsre</p>
                <p className="text-gray-600 dark:text-slate-300 text-sm">Minden egyes meccsre tippeld meg a végeredményt – hány gól esik az egyik, hány a másik csapatnak.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-slate-100">Gyűjts pontokat</p>
                <p className="text-gray-600 dark:text-slate-300 text-sm">A jó tippekért pontokat kapsz – telitalálat 6 pont, jó eredmény 3 pont, stb.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">4</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-slate-100">Nézd meg a rangsort</p>
                <p className="text-gray-600 dark:text-slate-300 text-sm">Versengj a barátaiddal és nézd meg, kik a legjobbak a tippelésben!</p>
              </div>
            </li>
          </ol>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col md:flex-row gap-4 justify-center mb-12">
          <Link
            href="/login"
            className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition text-center"
          >
            Bejelentkezés
          </Link>
          <Link
            href="/register"
            className="px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-lg hover:bg-black transition text-center"
          >
            Regisztráció
          </Link>
          <Link
            href="/szabalyzat"
            className="px-8 py-4 bg-purple-600 text-white font-bold rounded-2xl shadow-lg hover:bg-purple-700 transition text-center"
          >
            Szabályzat
          </Link>
        </div>

        {/* Footer Info removed, handled by layout Footer */}
      </div>

      {/* Támogatói banner */}
      <div className="mt-16">
        <SupportBanner />
      </div>
    </div>
  );
}
