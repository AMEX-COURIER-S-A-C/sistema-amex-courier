import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  try {
    // Simulación intencional de función no definida para verificación de onboarding en Sentry
    throw new ReferenceError("myUndefinedFunction is not defined (Test de verificación Sentry - Sistema AMEX Courier)");
  } catch (error) {
    const eventId = Sentry.captureException(error);
    await Sentry.flush(2000);

    return NextResponse.json({
      ok: true,
      message: "Excepción de prueba enviada a Sentry",
      eventId,
      project: "sistema-amex-courier",
      org: "mm-kk",
    });
  }
}
