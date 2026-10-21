"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-slate-800">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 border border-slate-200 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">¡Algo inesperado ocurrió!</h2>
          <p className="text-sm text-slate-600 mb-4">
            El error ha sido registrado por nuestro sistema de monitoreo en tiempo real.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
