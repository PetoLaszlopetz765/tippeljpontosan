import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-100 px-4 py-10">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center text-gray-700">
            Betöltés...
          </div>
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}
