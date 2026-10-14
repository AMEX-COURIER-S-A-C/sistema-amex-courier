import { describe, expect, it } from 'vitest';

describe('TIB Package Data Enrichment Logic', () => {
  it('identifies incomplete package fields correctly', () => {
    const pkgIncomplete = {
      id: 'p1',
      numeroReciboBodega: 'WR000477223',
      tracking: '-',
      nombreConsignatario: 'CLIENTE AMEX',
      pesoKg: 0,
      tipoEmpaque: '',
      estadoTib: '',
      tibImagenUrl: null,
    };

    const isMissingImage = !pkgIncomplete.tibImagenUrl;
    const isMissingTracking = !pkgIncomplete.tracking || pkgIncomplete.tracking === '-' || pkgIncomplete.tracking.trim() === '';
    const isMissingPeso = !pkgIncomplete.pesoKg || Number(pkgIncomplete.pesoKg) <= 0;
    const isMissingCliente =
      !pkgIncomplete.nombreConsignatario ||
      pkgIncomplete.nombreConsignatario.trim() === '' ||
      pkgIncomplete.nombreConsignatario.toUpperCase().includes('CLIENTE AMEX');
    const isMissingEmpaque = !pkgIncomplete.tipoEmpaque || pkgIncomplete.tipoEmpaque.trim() === '';
    const isMissingEstadoTib = !pkgIncomplete.estadoTib || pkgIncomplete.estadoTib.trim() === '';

    expect(isMissingImage).toBe(true);
    expect(isMissingTracking).toBe(true);
    expect(isMissingPeso).toBe(true);
    expect(isMissingCliente).toBe(true);
    expect(isMissingEmpaque).toBe(true);
    expect(isMissingEstadoTib).toBe(true);
  });

  it('correctly maps and backfills missing TIB fields without overwriting valid data', () => {
    const currentPkg = {
      id: 'p2',
      numero_recibo_bodega: 'WR000477223',
      tracking: '', // Empty: should be updated
      nombre_consignatario: 'MARIA LOPEZ', // Valid: should NOT be overwritten unless forceRefresh
      peso_kg: 0, // 0: should be updated
      tipo_empaque: '', // Empty: should be updated
      estado_tib: 'EnAlmacen',
      tib_imagen_url: null,
      tib_ticket_pdf_url: null,
    };

    const tibResponseItem = {
      seqwr: '477223',
      wr: '000477223',
      tracking: '1Z999999999999',
      status: 'ENTREGADO',
      img: 'files/packageimg/foto_123.png',
      ticket: 'files/packageimg/ticket_123.pdf',
      nclient: 'AMEX JANIRA AMEX',
      container: 'CAJA',
      weight: '2.45',
    };

    const TIB_BASE_URL = 'https://www.tibcourier.com/global-courier/ajax/';
    const forceRefresh = false;
    const updatePayload: Record<string, any> = {};
    const updatedFields: string[] = [];

    // Image
    if (tibResponseItem.img && (forceRefresh || !currentPkg.tib_imagen_url)) {
      updatePayload.tib_imagen_url = `${TIB_BASE_URL}${tibResponseItem.img}`;
      updatedFields.push('foto');
    }

    // Tracking
    if (tibResponseItem.tracking && (forceRefresh || !currentPkg.tracking || currentPkg.tracking === '-')) {
      updatePayload.tracking = tibResponseItem.tracking.trim();
      updatedFields.push('tracking');
    }

    // Cliente (should NOT be updated because MARIA LOPEZ is valid)
    const isClienteEmpty =
      !currentPkg.nombre_consignatario ||
      currentPkg.nombre_consignatario.trim() === '' ||
      currentPkg.nombre_consignatario.toUpperCase().includes('CLIENTE AMEX');
    if (tibResponseItem.nclient && (forceRefresh || isClienteEmpty)) {
      updatePayload.nombre_consignatario = tibResponseItem.nclient.trim();
      updatedFields.push('cliente');
    }

    // Peso
    const parsedWeight = parseFloat(tibResponseItem.weight);
    if (!isNaN(parsedWeight) && parsedWeight > 0 && (forceRefresh || !currentPkg.peso_kg || currentPkg.peso_kg <= 0)) {
      updatePayload.peso_kg = parsedWeight;
      updatedFields.push('peso');
    }

    // Empaque
    if (tibResponseItem.container && (forceRefresh || !currentPkg.tipo_empaque)) {
      updatePayload.tipo_empaque = tibResponseItem.container.trim().toUpperCase();
      updatedFields.push('empaque');
    }

    expect(updatedFields).toEqual(['foto', 'tracking', 'peso', 'empaque']);
    expect(updatePayload.tracking).toBe('1Z999999999999');
    expect(updatePayload.peso_kg).toBe(2.45);
    expect(updatePayload.tipo_empaque).toBe('CAJA');
    expect(updatePayload.nombre_consignatario).toBeUndefined(); // Kept original 'MARIA LOPEZ'
  });

  it('normalizes WR codes to clean numeric query parameters for TIB API', () => {
    const rawCodes = ['WR000477223', 'wr00001234', 'WR475750', '  WR000005  '];
    const cleaned = rawCodes.map((code) => code.replace(/\D/g, '').replace(/^0+/, ''));

    expect(cleaned).toEqual(['477223', '1234', '475750', '5']);
  });

  it('treats NO_IMAGE as ignored/verified and excludes it from missing photo diagnosis', () => {
    const pkgWithNoImage = {
      id: 'p3',
      numeroReciboBodega: 'WR000471492',
      tracking: 'INK23957',
      nombreConsignatario: 'AMEX INK EVELYN ESPINOZA',
      pesoKg: 3.22,
      tipoEmpaque: 'CAJA',
      estadoTib: 'Entregado',
      tibImagenUrl: 'NO_IMAGE', // Explicitly marked as no photo in TIB
    };

    const isNoImage = pkgWithNoImage.tibImagenUrl === 'NO_IMAGE';
    const isMissingImage = (!pkgWithNoImage.tibImagenUrl || pkgWithNoImage.tibImagenUrl.trim() === '') && !isNoImage;

    expect(isNoImage).toBe(true);
    expect(isMissingImage).toBe(false);
  });

  it('allows forceRefresh to overwrite NO_IMAGE if a photo is later uploaded to TIB', () => {
    const currentPkg = {
      id: 'p4',
      tib_imagen_url: 'NO_IMAGE',
    };

    const tibResponseWithPhoto = {
      img: 'files/packageimg/new_foto.jpg',
    };

    const forceRefresh = true;
    const TIB_BASE_URL = 'https://www.tibcourier.com/global-courier/ajax/';
    let newImageUrl: string | null = null;

    if (tibResponseWithPhoto.img && (forceRefresh || !currentPkg.tib_imagen_url || currentPkg.tib_imagen_url === 'NO_IMAGE')) {
      newImageUrl = `${TIB_BASE_URL}${tibResponseWithPhoto.img}`;
    }

    expect(newImageUrl).toBe('https://www.tibcourier.com/global-courier/ajax/files/packageimg/new_foto.jpg');
  });
});
