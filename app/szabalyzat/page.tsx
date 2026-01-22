
"use client";
import dynamic from "next/dynamic";
const SupportBanner = dynamic(() => import("../components/SupportBanner"), { ssr: false });

export default function SzabalyzatPage() {
  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8 flex justify-center">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-6 md:p-10">
        <div className="text-center mb-10 pb-6 border-b-2 border-gray-200">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
            ⚽ Tippelde
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
            Játékszabályzat
          </h2>
          <p className="text-sm text-gray-600 mt-3 max-w-2xl mx-auto">
            Részletes szabályok és pontozás a játékhoz – biztosan érted az összes szabályt?
          </p>
        </div>

        <div className="space-y-6 text-gray-800 text-sm leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold mb-2">NEVEZÉS</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>A Tippeldében kizárólag meghívásos alapon lehet részt venni.</li>
              <li>A játék szervezője: <strong>Aracsi Szilárd</strong>.</li>
              <li>A nevezés e-mailben történik a szervező részére.</li>
              <li>Nevezési díj: <strong>3.000 kredit / fő</strong>.</li>
              <li>A nevezési díj egyenlegként kerül jóváírásra.</li>
              <li>A játék elindulását követően új jelentkezés nem lehetséges.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">A JÁTÉK JELLEGE</h2>
            <p>
              A Tippelde <strong>nem pénzbeli szerencsejáték</strong>.
              A kreditek kizárólag virtuális elszámolási egységek,
              amelyeknek nincs pénzbeli értéke.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">JÁTÉKSZABÁLYOK</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Csak a szervező által kiválasztott mérkőzésekre lehet tippelni.</li>
              <li>Minden mérkőzésre a <strong>pontos végeredményt</strong> kell megtippelni.</li>
              <li>Egy mérkőzésre játékosonként csak egy tipp adható le.</li>
              <li>A hivatalos végeredmény számít (hosszabbítás beleszámít).</li>
              <li>11-es párbaj eredménye nem számít bele.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">FOGADÁSI HATÁRIDŐK</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Hétköznapi mérkőzések: legkésőbb az előző napig.</li>
              <li>Hétvégi mérkőzések: pénteken 13:00 óráig.</li>
              <li>Késve leadott tippek érvénytelenek.</li>
              <li>A szervező ettől eltérő határidőt is megadhat.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">PONTOZÁS</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>6 pont</strong> – pontos végeredmény (telitalálat)</li>
              <li><strong>4 pont</strong> – győztes + nagy gólkülönbség (≥4 gól)</li>
              <li><strong>3 pont</strong> – győztes + gólkülönbség, vagy döntetlen</li>
              <li><strong>2 pont</strong> – csak a győztes</li>
              <li><strong>0 pont</strong> – hibás tipp</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">DÍJAZÁS</h2>
            <p>
              A bajnoki pontverseny első három helyezettje részesül díjazásban
              a játék során felhalmozott nyereményalapból.
            </p>
          </section>

          <section className="border-t pt-6 text-center text-gray-600">
            <p>
              A Tippelde játékban való részvétellel a játékos
              elfogadja a fenti szabályokat.
            </p>
            <p className="mt-2 font-semibold">
              Sok sikert és jó szórakozást! ⚽
            </p>
          </section>

        </div>
      </div>
      <div className="mt-10">
        <SupportBanner />
      </div>
    </div>
  );
}
