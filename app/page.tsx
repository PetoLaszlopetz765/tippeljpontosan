import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-4">
            ⚽ Tippelde
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-8">
            A baráti foci tippjáték – valódi pénz nélkül!
          </p>
          <p className="text-lg text-gray-600 mb-8">
            Tippelj a világbajnokság meccseire, gyűjts pontokat, és nézd meg, milyen jók a tippeid!
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Pontjelző Rendszer</h3>
            <p className="text-gray-700 text-sm">
              Tippelj az összes meccsre és nézd meg hogyan teljesítesz.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Rangsor</h3>
            <p className="text-gray-700 text-sm">
              Versenyezz barátaiddal és legyél te az első a legjobb tippelőként.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Biztonságos</h3>
            <p className="text-gray-700 text-sm">
              Meghívókód alapú regisztráció – csak a barátaid csatlakozhatnak.
            </p>
          </div>
        </div>

        {/* How it Works */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Hogyan működik?</h2>
          <ol className="space-y-4">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
              <div>
                <p className="font-semibold text-gray-900">Regisztrálj meghívókóddal</p>
                <p className="text-gray-600 text-sm">Kérj egy meghívókódot a szervezőtől, majd regisztrálj az alkalmazásban.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
              <div>
                <p className="font-semibold text-gray-900">Tippelj az összes meccsre</p>
                <p className="text-gray-600 text-sm">Minden egyes meccsre tippeld meg a végeredményt – hány gól esik az egyik, hány a másik csapatnak.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
              <div>
                <p className="font-semibold text-gray-900">Gyűjts pontokat</p>
                <p className="text-gray-600 text-sm">A jó tippekért pontokat kapsz – telitalálat 6 pont, jó eredmény 3 pont, stb.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">4</span>
              <div>
                <p className="font-semibold text-gray-900">Nézd meg a rangsort</p>
                <p className="text-gray-600 text-sm">Versengj a barátaiddal és nézd meg, kik a legjobbak a tippelésben!</p>
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

        {/* Footer Info */}
        <div className="text-center text-gray-700 pt-8">
          <p className="text-sm text-gray-600">
            made by <span className="font-bold text-gray-900">@petz765</span>
          </p>
        </div>
      </div>

      {/* Támogatói banner */}
      <div className="w-full flex justify-center mt-16">
        <a
          href="https://thkk.hu/"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full max-w-2xl bg-purple-900 rounded-2xl shadow-lg overflow-hidden flex flex-col md:flex-row items-center gap-4 p-4 md:p-0"
        >
          <div className="flex-shrink-0 w-full md:w-1/3 flex justify-center items-center bg-purple-800 p-4 md:p-0">
            <img
              src="https://tarsashazkezelokozpont.hu/wp-content/uploads/2025/09/logo_fent_nev_feher.png"
              alt="Társasházkezelő Központ logó"
              className="h-32 md:h-40 object-contain mx-auto"
              style={{ background: 'rgba(0,0,0,0.05)' }}
            />
          </div>
          <div className="flex-1 text-center md:text-left py-2 md:py-0">
            <div className="text-white text-lg md:text-xl font-bold mb-1">Az oldal támogatója a</div>
            <div className="text-white text-2xl md:text-3xl font-extrabold tracking-wide mb-1">Társasházkezelőközpont.hu</div>
            <div className="text-purple-200 text-base md:text-lg">(thkk.hu)</div>
          </div>
        </a>
      </div>
    </div>
  );
}
