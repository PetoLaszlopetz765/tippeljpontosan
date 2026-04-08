import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full mt-12 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-300">
        <div className="flex items-center justify-center mb-2">
          <Image
            src="/weblogo.png"
            alt="Tippeljpontosan logó"
            width={120}
            height={48}
            className="h-10 w-auto"
          />
        </div>
        made by <span className="font-medium text-gray-700 dark:text-gray-100">@petz765</span>
      </div>
    </footer>
  );
}
