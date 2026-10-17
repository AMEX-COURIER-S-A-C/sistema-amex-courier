import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/lib/auth/guards';

const TIB_API_URL = 'https://www.tibcourier.com/global-courier/ajax/readListaWarehouse.php';
const TIB_BASE_URL = 'https://www.tibcourier.com/global-courier/ajax/';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeUser();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const clientFilter = (searchParams.get('client') || 'AMEX').trim().toUpperCase();
    
    // Obtener fecha solicitada o calcular "Ayer"
    let requestedDate = searchParams.get('date')?.trim() || '';
    if (!requestedDate) {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      requestedDate = yesterday.toISOString().split('T')[0];
    }

    // 1. Consultar servidor TIB en vivo
    const tibResponse = await fetch(TIB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(12000),
    });

    if (!tibResponse.ok) {
      return NextResponse.json(
        { error: `Error del servidor TIB (HTTP ${tibResponse.status})` },
        { status: 502 }
      );
    }

    const rawData = await tibResponse.json();
    if (!Array.isArray(rawData)) {
      return NextResponse.json({
        success: false,
        error: 'El servidor de TIB no devolvió una lista válida de paquetes.',
      }, { status: 502 });
    }

    // 2. Extraer fechas disponibles en el feed en vivo para los botones de selección
    const dateCountsMap = new Map<string, { amexCount: number; totalCount: number }>();
    rawData.forEach((item: any) => {
      const d = (item.fecRegister || '').split(' ')[0];
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const client = String(item.nclient || '').toUpperCase();
        const isAmex = client.includes(clientFilter);
        
        const curr = dateCountsMap.get(d) || { amexCount: 0, totalCount: 0 };
        curr.totalCount++;
        if (isAmex) curr.amexCount++;
        dateCountsMap.set(d, curr);
      }
    });

    const fechasDisponibles = Array.from(dateCountsMap.entries())
      .map(([date, counts]) => ({
        date,
        amexCount: counts.amexCount,
        totalCount: counts.totalCount,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // 3. Filtrar paquetes para la fecha y cliente seleccionados
    const filteredRaw = rawData.filter((item: any) => {
      const regDate = (item.fecRegister || '').split(' ')[0];
      if (regDate !== requestedDate) return false;

      const client = String(item.nclient || '').toUpperCase();
      return client.includes(clientFilter);
    });

    // 4. Ordenar cronológicamente por hora de registro (de más temprano a más tarde)
    filteredRaw.sort((a: any, b: any) => {
      return String(a.fecRegister || '').localeCompare(String(b.fecRegister || ''));
    });

    // 5. Mapear y normalizar campos
    let totalPeso = 0;
    const operatorsSet = new Set<string>();

    const paquetes = filteredRaw.map((item: any, idx: number) => {
      const rawWr = String(item.wr || item.seqwr || '').trim();
      const digits = rawWr.replace(/\D/g, '');
      const canonicalWr = `WR${digits.padStart(9, '0')}`;
      const timePart = (item.fecRegister || '').split(' ')[1] || '';
      const pesoVal = Number(item.weight || 0);
      if (!isNaN(pesoVal)) totalPeso += pesoVal;

      const op = item.seqUser || item.Usuario || '';
      if (op) operatorsSet.add(String(op).trim());

      const fotoUrl = item.img ? `${TIB_BASE_URL}${item.img}` : null;
      const ticketUrl = item.ticket ? `${TIB_BASE_URL}${item.ticket}` : null;

      return {
        index: idx + 1,
        id: item.seqwr || String(idx),
        wr: canonicalWr,
        rawWr,
        cliente: item.nclient || 'AMEX COURIER',
        tracking: item.tracking || '—',
        peso: pesoVal,
        tipoEmpaque: item.container || 'CAJA',
        rackMiami: item.rack || 'S/U',
        postal: item.postal || 'COURIER',
        fechaRegistro: (item.fecRegister || '').split(' ')[0] || requestedDate,
        horaRegistro: timePart,
        timestampCompleto: item.fecRegister || '',
        operador: op,
        fotoUrl,
        ticketUrl,
        estado: item.status || 'RECIBIDO',
      };
    });

    const primeraHora = paquetes.length > 0 ? paquetes[0].horaRegistro : null;
    const ultimaHora = paquetes.length > 0 ? paquetes[paquetes.length - 1].horaRegistro : null;

    return NextResponse.json({
      success: true,
      fechaConsultada: requestedDate,
      filtroCliente: clientFilter,
      metricas: {
        totalPaquetes: paquetes.length,
        totalPeso: Number(totalPeso.toFixed(2)),
        primeraHora,
        ultimaHora, // Hora de corte del almacén
        operadores: Array.from(operatorsSet),
      },
      fechasDisponibles,
      paquetes,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno al consultar TIB';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
