export default function SupportBanner() {
  return (
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
          <div className="text-white text-lg md:text-xl font-bold mb-1">Az oldal támogatója a</div>
          <div className="text-white text-2xl md:text-3xl font-extrabold tracking-wide mb-1">társasházkezelő központ</div>
          <div className="text-purple-200 text-base md:text-lg">(thkk.hu)</div>
        </div>
      </a>
    </div>
  );
}
