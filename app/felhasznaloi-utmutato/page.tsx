"use client";

import dynamic from "next/dynamic";

const SupportBanner = dynamic(() => import("../components/SupportBanner"), { ssr: false });

export default function FelhasznaloiUtmutatoPage() {
  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8 flex justify-center">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-lg p-6 md:p-10">
        <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            Felhasználói útmutató
          </h1>
          <p className="text-gray-700 mt-3 max-w-3xl mx-auto">
            Ez az oldal a rendszer játékos oldali működését mutatja be, admin funkciók nélkül.
            Az alábbi leírás a jelenlegi működéshez igazodik.
          </p>
        </div>

        <div className="space-y-5 text-gray-800">
          <section className="rounded-xl border border-gray-200 p-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">1. Bejelentkezés és profil</h2>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Bejelentkezés után a felső menüben látod a felhasználónevedet.</li>
              <li>A <span className="font-semibold">Profilom</span> oldalon követheted a pontjaidat és kreditjeidet.</li>
              <li>Ha kijelentkezel vagy lejár a session, a rendszer visszairányít a belépéshez.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-gray-200 p-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">2. Tippelés oldal</h2>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>A <span className="font-semibold">Tippelés</span> oldalon csak olyan eseményeket látsz, amelyekre még nem tippeltél.</li>
              <li>Egy eseményre jelenleg egy tippet tudsz leadni.</li>
              <li>Ha már tippeltél egy eseményre, az ezen az oldalon nem szerkeszthető (nem jelenik meg újra tippelhetőként).</li>
              <li>Lezárt eseményre nem lehet tippelni.</li>
              <li>A tipp leadása eseményenként külön gombbal is működik.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-gray-200 p-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">3. Mai események oldal</h2>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>A napi események listáját látod meccsenként (kezdés, tipp ára, napi pool, állapot, végeredmény).</li>
              <li>Külön blokkban látszik a saját tipped az adott meccsre.</li>
              <li>Mások tippjeit csak akkor látod, ha te már tippeltél arra az eseményre.</li>
              <li>A játékosok mellett ranglista-információk jelennek meg (helyezés, pont, kredit és mozgás jelölése).</li>
              <li>Van <span className="font-semibold">PDF export</span> gomb az oldal tetején.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-gray-200 p-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">4. Tegnapi események oldal</h2>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>A tegnapi eseményeknél látod a saját tippet és az összes látható tippet.</li>
              <li>A játékosnevek mellett mozgásjelölők vannak:
              <span className="font-semibold"> ⬆ </span>,
              <span className="font-semibold"> ⬇ </span>,
              <span className="font-semibold"> ● </span>
              (helyezésváltozás / nincs változás).</li>
              <li>Az eseményhez tartozó nyeremény- és pontinformációk meccsenként jelennek meg.</li>
              <li>Itt is elérhető a <span className="font-semibold">PDF export</span>.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-gray-200 p-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">5. Verseny állása és Minden tipp</h2>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>A versenyoldalon látod a rangsorokat, a pontokat, krediteket és a pool információkat.</li>
              <li>A játékosok rendezése pont, kredit és telitalálat alapján történik.</li>
              <li>Az eseményeknél a leadott tippek listája oldalanként/limitált nézetben jelenik meg.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-gray-200 p-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">6. Chat funkciók</h2>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Üzenetküldés mellett válaszolni is tudsz egy korábbi üzenetre.</li>
              <li>A saját üzenetedet szerkesztheted és törölheted.</li>
              <li>Az üzenetek automatikusan frissülnek (időközönként).</li>
            </ul>
          </section>

          <section className="rounded-xl border border-gray-200 p-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">7. Pontozás röviden</h2>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><span className="font-semibold">6 pont</span>: pontos végeredmény.</li>
              <li><span className="font-semibold">4 pont</span>: helyes győztes + mindkét eredménynél legalább 4 gólos különbség.</li>
              <li><span className="font-semibold">3 pont</span>: helyes győztes és helyes gólkülönbség, vagy helyes döntetlen.</li>
              <li><span className="font-semibold">2 pont</span>: csak a győztes találata helyes.</li>
              <li><span className="font-semibold">0 pont</span>: minden más eset.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-gray-200 p-4 bg-green-50">
            <h2 className="text-xl font-bold text-green-900 mb-2">8. Gyors indulás új játékosoknak</h2>
            <p className="text-sm text-green-900">
              Először nézd át a <span className="font-semibold">Szabályzat</span> oldalt,
              utána a <span className="font-semibold">Tippelés</span> oldalon adj le tippet legalább egy nyitott eseményre.
              Ezután a <span className="font-semibold">Mai események</span> oldalon már a többiek tippjei is láthatóvá válnak azon a meccsen.
            </p>
          </section>
        </div>

        <div className="mt-8">
          <SupportBanner />
        </div>
      </div>
    </div>
  );
}
