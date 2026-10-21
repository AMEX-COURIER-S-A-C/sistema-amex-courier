"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

export default function SentryExamplePage() {
  const [hasError, setHasError] = useState(false);

  const triggerClientError = () => {
    try {
      // @ts-expect-error - Disparador de error intencional para verificar conexión con Sentry
      window.myUndefinedFunction();
    } catch (err) {
      Sentry.captureException(err);
      setHasError(true);
      alert("¡Error de prueba enviado a Sentry exitosamente!");
    }
  };

  const triggerServerError = async () => {
    await fetch("/api/sentry-test");
    alert("¡Evento de servidor enviado a Sentry!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center">
        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ⚡
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Verificación de Sentry</h1>
        <p className="text-slate-600 text-sm mb-6">
          Haz clic en cualquiera de los botones para enviar un evento o excepción de prueba a tu panel de Sentry (<span className="font-semibold text-purple-600">mm-kk</span> / <span className="font-semibold text-purple-600">sistema-amex-courier</span>).
        </p>

        <div className="space-y-3">
          <button
            onClick={triggerClientError}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl shadow-md transition cursor-pointer"
          >
            Disparar Error en Cliente (myUndefinedFunction)
          </button>

          <button
            onClick={triggerServerError}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl shadow-md transition cursor-pointer"
          >
            Disparar Evento en Servidor (/api/sentry-test)
          </button>
        </div>

        {hasError && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 text-xs rounded-lg border border-green-200">
            ✅ Excepción capturada y transmitida a Sentry. Ve a tu panel para ver el issue.
          </div>
        )}
      </div>
    </div>
  );
}
