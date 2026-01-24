export default function SupportBanner() {
  return (
    <>
      <div className="w-full flex justify-center mt-16">
        <a
          href="https://thkk.hu/"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full max-w-2xl bg-purple-900 rounded-2xl shadow-lg overflow-hidden flex flex-col md:flex-row items-center gap-4 p-4 md:p-0"
        >
          <div className="flex-shrink-0 w-full md:w-1/3 flex justify-center items-center bg-purple-800 p-4 md:p-0">
            <img
              src="https://tarsashazkezelokozpont.hu/wp-content/uploads/2025/09/logo_fent_nev_lila.png"
              alt="Társasházkezelő Központ logó"
              className="h-32 md:h-40 object-contain mx-auto"
              style={{ background: 'rgba(0,0,0,0.05)' }}
            />
          </div>
          <div className="flex-1 text-center md:text-left py-2 md:py-0">
            <div className="text-white text-lg md:text-xl font-bold mb-1">Az oldal fő támogatója a</div>
            <div className="text-white text-2xl md:text-3xl font-extrabold tracking-wide mb-1">társasházkezelő központ</div>
            <div className="text-purple-200 text-base md:text-lg">(thkk.hu)</div>
          </div>
        </a>
      </div>
      <div className="w-full flex justify-center mt-6">
        <a
          href="https://tanacsado.alfa.hu/967670?fbclid=IwY2xjawPgWQdleHRuA2FlbQIxMABicmlkETBQVlVpSUg3TDdPU0hYWGxVc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHh8BMEDHxOlEQvWVai1AZiUXb1MxZsbII-IkCysffze8J1WUuoviMZBX2wsn_aem_mJI-9ulVftCt6oORQtjCug"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden flex flex-col md:flex-row items-center gap-4 p-4 md:p-0"
        >
          <div className="flex-shrink-0 w-full md:w-1/3 flex justify-center items-center bg-gray-100 p-4 md:p-0">
            <img
              src="https://www.alfa.hu/wp-content/themes/alfa_2022/assets/img/logo.svg"
              alt="Alfa Biztosító logó"
              className="h-20 md:h-28 object-contain mx-auto"
              style={{ background: 'rgba(0,0,0,0.01)' }}
            />
          </div>
          <div className="flex-1 text-center md:text-left py-2 md:py-0">
            <div className="text-gray-900 text-lg md:text-xl font-bold mb-1">Kiemelt partnerünk</div>
            <div className="text-gray-900 text-2xl md:text-3xl font-extrabold tracking-wide mb-1">Alfa Biztosító tanácsadó</div>
            <div className="text-gray-500 text-base md:text-lg">Kattints a részletekért!</div>
          </div>
        </a>
      </div>
    </>
  );
}
