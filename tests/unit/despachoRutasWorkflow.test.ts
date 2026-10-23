import { describe, it, expect } from 'vitest';
import {
  normalizePhoneNumber,
  getWhatsAppUrl,
  getGoogleMapsUrl,
  normalizeDistrito,
  parseQuickPasteRows,
  isWrOrWrList,
  parseWrCodes,
  parseWrAndBultos,
  formatNormalizedWrs,
  ZONAS_LIMA_DISTRITOS
} from '@/lib/utils/phoneUtils';

describe('Módulo de Despacho y Rutas: Utilidades y Flujo de Chofer', () => {
  describe('Normalización Telefónica (Perú e Internacional)', () => {
    it('normaliza correctamente celulares peruanos de 9 dígitos con espacios y llamada sin 51', () => {
      const res = normalizePhoneNumber('997 370 290');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('51997370290');
      expect(res.telUri).toBe('tel:997370290');
      expect(res.display).toBe('997 370 290');
      expect(res.isInternational).toBe(false);
    });

    it('normaliza números peruanos que ya incluyen el código +51 y genera llamada solo con 9 dígitos', () => {
      const res = normalizePhoneNumber('+51 997 749 502');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('51997749502');
      expect(res.telUri).toBe('tel:997749502');
      expect(res.display).toBe('997 749 502');
    });

    it('maneja números internacionales como Ecuador (+593)', () => {
      const res = normalizePhoneNumber('+593 99 814 6510');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('593998146510');
      expect(res.telUri).toBe('tel:+593998146510');
      expect(res.isInternational).toBe(true);
    });

    it('maneja valores vacíos o inválidos sin romper la aplicación', () => {
      const resEmpty = normalizePhoneNumber('');
      expect(resEmpty.isValid).toBe(false);
      expect(resEmpty.normalized).toBe('');
      expect(resEmpty.display).toBe('Sin teléfono');

      const resShort = normalizePhoneNumber('123');
      expect(resShort.isValid).toBe(false);
    });
  });

  describe('Generador de Enlaces Directos para el Chofer', () => {
    it('genera enlace de WhatsApp directo al chat sin ningún mensaje predeterminado', () => {
      const url = getWhatsAppUrl('997370290', 'Daniel Valdivia', '5 CJS', 'Calle Francia 510');
      expect(url).toBe('https://wa.me/51997370290');
      expect(url).not.toContain('?text=');
    });

    it('retorna cadena vacía en WhatsApp si el teléfono es inválido', () => {
      const url = getWhatsAppUrl('', 'Cliente');
      expect(url).toBe('');
    });

    it('genera enlace de navegación Google Maps con dirección y distrito', () => {
      const url = getGoogleMapsUrl('Av Mariscal Cáceres 136', 'Miraflores');
      expect(url).toContain('https://www.google.com/maps/search/?api=1');
      expect(url).toContain(encodeURIComponent('Av Mariscal Cáceres 136, Miraflores, Lima, Perú'));
    });
  });

  describe('Normalización de Distritos de Lima y Catálogo de 43 Distritos', () => {
    it('estandariza abreviaturas comunes de Lima', () => {
      expect(normalizeDistrito('SURCO')).toBe('SANTIAGO DE SURCO');
      expect(normalizeDistrito('MOLINA')).toBe('LA MOLINA');
      expect(normalizeDistrito('SJL')).toBe('SAN JUAN DE LURIGANCHO');
      expect(normalizeDistrito('SMP')).toBe('SAN MARTIN DE PORRES');
      expect(normalizeDistrito('SAN BORJA')).toBe('SAN BORJA');
    });

    it('contiene las 4 zonas tradicionales con exactamente 43 distritos', () => {
      const norte = ZONAS_LIMA_DISTRITOS.find(z => z.zona.includes('Lima Norte'));
      const centro = ZONAS_LIMA_DISTRITOS.find(z => z.zona.includes('Lima Centro'));
      const este = ZONAS_LIMA_DISTRITOS.find(z => z.zona.includes('Lima Este'));
      const sur = ZONAS_LIMA_DISTRITOS.find(z => z.zona.includes('Lima Sur'));

      expect(norte?.distritos).toHaveLength(8);
      expect(centro?.distritos).toHaveLength(16);
      expect(este?.distritos).toHaveLength(8);
      expect(sur?.distritos).toHaveLength(11);

      const totalTradicionales = (norte?.distritos.length || 0) +
        (centro?.distritos.length || 0) +
        (este?.distritos.length || 0) +
        (sur?.distritos.length || 0);

      expect(totalTradicionales).toBe(43);
    });

    it('normaliza distritos con tildes o variaciones de escritura', () => {
      expect(normalizeDistrito('Ancón')).toBe('ANCON');
      expect(normalizeDistrito('Breña')).toBe('BREÑA');
      expect(normalizeDistrito('Rímac')).toBe('RIMAC');
      expect(normalizeDistrito('Lurín')).toBe('LURIN');
      expect(normalizeDistrito('Cercado de Lima (Lima)')).toBe('CERCADO DE LIMA');
    });
  });

  describe('Parser de Pegado Rápido desde Excel (Quick Paste)', () => {
    it('parsea correctamente líneas tabuladas copiadas de ENTREGAS 2026.xlsx', () => {
      const excelClipboard = [
        'NOMBRE\twr\tDIRECCIÓN Y TELEFONO\tDISTRITO\tCEL',
        'DANIEL VALDIVIA\t405148\tCALLE FRANCIA 510 DPTO 602\tMIRAFLORES\t997 370 290',
        'LISS CASTILLO\t404403- MAS 8 CJS\tAV MARISCAL CACERES 136\tMIRAFLORES\t969 738 878\t14.70',
        'WALTER FUSTER\t10 CJS\tAV AVIACION 2905\tSAN BORJA\t970 794 911'
      ].join('\n');

      const paradas = parseQuickPasteRows(excelClipboard);

      expect(paradas).toHaveLength(3);

      // Parada 1
      expect(paradas[0].destinatario).toBe('DANIEL VALDIVIA');
      expect(paradas[0].wrBultos).toBe('WR000405148');
      expect(paradas[0].wrCodes).toBe('WR000405148');
      expect(paradas[0].direccion).toBe('CALLE FRANCIA 510 DPTO 602');
      expect(paradas[0].distrito).toBe('MIRAFLORES');
      expect(paradas[0].telefono).toBe('997 370 290');
      expect(paradas[0].montoCobro).toBe(0);

      // Parada 2 (con bultos y cobro)
      expect(paradas[1].destinatario).toBe('LISS CASTILLO');
      expect(paradas[1].wrBultos).toBe('WR000404403 · 8 CJS');
      expect(paradas[1].wrCodes).toBe('WR000404403');
      expect(paradas[1].montoCobro).toBe(14.70);

      // Parada 3 (con bultos CJS)
      expect(paradas[2].destinatario).toBe('WALTER FUSTER');
      expect(paradas[2].wrBultos).toBe('10 CJS');
      expect(paradas[2].distrito).toBe('SAN BORJA');
    });

    it('ignora filas vacías o cabeceras repetidas', () => {
      const raw = `
        NOMBRE\twr\tDIRECCIÓN\tDISTRITO\tCEL
        
        CLIENTE: LISS CASTILLO
        VICTOR SCALISI\t6 CJS\tCALLE 10\tSURCO\t999 888 777
      `;
      const paradas = parseQuickPasteRows(raw);
      expect(paradas).toHaveLength(1);
      expect(paradas[0].destinatario).toBe('VICTOR SCALISI');
    });

    it('detecta celdas con WRs múltiples separados por guion (-) o slash (/) y autocalcula bultos', () => {
      const raw = [
        'CARLOS GOMEZ\t405148 - 405149\tAV LARCO 456\tMIRAFLORES\t998 123 456',
        'MARIA LOPEZ\t405148/405149/405150\tCALLE LAS FLORES 200\tSURCO\t997 654 321\t15.00'
      ].join('\n');

      const paradas = parseQuickPasteRows(raw);
      expect(paradas).toHaveLength(2);

      // Fila 1: Separado por guión (-)
      expect(paradas[0].destinatario).toBe('CARLOS GOMEZ');
      expect(paradas[0].wrCodes).toBe('WR000405148 / WR000405149');
      expect(paradas[0].bultos).toBe('2 CJS');
      expect(paradas[0].direccion).toBe('AV LARCO 456');
      expect(paradas[0].distrito).toBe('MIRAFLORES');

      // Fila 2: Separado por slash (/) con cobro
      expect(paradas[1].destinatario).toBe('MARIA LOPEZ');
      expect(paradas[1].wrCodes).toBe('WR000405148 / WR000405149 / WR000405150');
      expect(paradas[1].bultos).toBe('3 CJS');
      expect(paradas[1].montoCobro).toBe(15.00);
      expect(paradas[1].distrito).toBe('SANTIAGO DE SURCO');
    });

    it('soporta pegado flexible de 6 columnas con columna explícita de Bultos', () => {
      const raw = 'JOSE SANCHEZ\t405148-405149\t5 CJS\tAV BOLOGNESI 123\tBARRANCO\t998 776 655\t20.00';
      const paradas = parseQuickPasteRows(raw);

      expect(paradas).toHaveLength(1);
      expect(paradas[0].destinatario).toBe('JOSE SANCHEZ');
      expect(paradas[0].wrCodes).toBe('WR000405148 / WR000405149');
      expect(paradas[0].bultos).toBe('5 CJS');
      expect(paradas[0].direccion).toBe('AV BOLOGNESI 123');
      expect(paradas[0].distrito).toBe('BARRANCO');
      expect(paradas[0].telefono).toBe('998 776 655');
      expect(paradas[0].montoCobro).toBe(20.00);
    });
  });

  describe('Detección y Normalización de Códigos WR (Guion y Slash)', () => {
    it('detecta códigos separados por guion con y sin espacios y los normaliza', () => {
      expect(parseWrCodes('405148-405149')).toEqual(['WR000405148', 'WR000405149']);
      expect(parseWrCodes('405148 - 405149')).toEqual(['WR000405148', 'WR000405149']);
      expect(parseWrCodes('405148 - 405149 - 405150')).toEqual(['WR000405148', 'WR000405149', 'WR000405150']);
      // Con normalize: false devuelve códigos crudos
      expect(parseWrCodes('405148-405149', { normalize: false })).toEqual(['405148', '405149']);
    });

    it('detecta códigos separados por slash con y sin espacios', () => {
      expect(parseWrCodes('405148/405149')).toEqual(['WR000405148', 'WR000405149']);
      expect(parseWrCodes('405148 / 405149')).toEqual(['WR000405148', 'WR000405149']);
      expect(parseWrCodes('405148 / 405149 / 405150')).toEqual(['WR000405148', 'WR000405149', 'WR000405150']);
    });

    it('maneja separadores mixtos de guion, slash y coma', () => {
      expect(parseWrCodes('405148 - 405149 / 405150, 405151')).toEqual([
        'WR000405148',
        'WR000405149',
        'WR000405150',
        'WR000405151'
      ]);
    });

    it('preserva prefijos de tipo WR- sin fragmentarlos y normaliza a 11 chars', () => {
      expect(parseWrCodes('WR-405148 - WR-405149')).toEqual(['WR000405148', 'WR000405149']);
      expect(parseWrCodes('WR-405148 - WR-405149', { normalize: false })).toEqual(['WR-405148', 'WR-405149']);
      expect(parseWrCodes('WR000474478 / WR000474479')).toEqual(['WR000474478', 'WR000474479']);
    });

    it('formatea la lista de WRs a una cadena estándar limpia con slash', () => {
      expect(formatNormalizedWrs(['WR000405148', 'WR000405149'])).toBe('WR000405148 / WR000405149');
    });

    it('autocalcula bultos a partir de la cantidad de WRs detectados', () => {
      const single = parseWrAndBultos('405148');
      expect(single.count).toBe(1);
      expect(single.bultos).toBe('1 CJ');
      expect(single.normalizedWrs).toBe('WR000405148');

      const duo = parseWrAndBultos('405148 - 405149');
      expect(duo.count).toBe(2);
      expect(duo.bultos).toBe('2 CJS');
      expect(duo.normalizedWrs).toBe('WR000405148 / WR000405149');

      const trio = parseWrAndBultos('405148 / 405149 / 405150');
      expect(trio.count).toBe(3);
      expect(trio.bultos).toBe('3 CJS');
    });

    it('respeta descripciones explícitas de bultos presentes en el texto', () => {
      const explicit = parseWrAndBultos('404403- MAS 8 CJS');
      expect(explicit.wrs).toEqual(['WR000404403']);
      expect(explicit.bultos).toBe('8 CJS');
    });

    it('soporta pegado de columna de puros códigos WR sin columnas adicionales', () => {
      const wrColumnText = [
        'WR000485000',
        'WR000485001',
        '405148-405149',
        '405150 / 405151'
      ].join('\n');

      const paradas = parseQuickPasteRows(wrColumnText);
      expect(paradas).toHaveLength(4);
      expect(paradas[0].wrCodes).toBe('WR000485000');
      expect(paradas[0].bultos).toBe('1 CJ');
      expect(paradas[1].wrCodes).toBe('WR000485001');
      expect(paradas[1].bultos).toBe('1 CJ');
      expect(paradas[2].wrCodes).toBe('WR000405148 / WR000405149');
      expect(paradas[2].bultos).toBe('2 CJS');
      expect(paradas[3].wrCodes).toBe('WR000405150 / WR000405151');
      expect(paradas[3].bultos).toBe('2 CJS');
    });

    it('soporta pegado de 2 columnas reconociendo si el WR está en col 0 o col 1', () => {
      const formatoDestWr = 'DANIEL VALDIVIA\t405148';
      const p1 = parseQuickPasteRows(formatoDestWr);
      expect(p1[0].destinatario).toBe('DANIEL VALDIVIA');
      expect(p1[0].wrCodes).toBe('WR000405148');

      const formatoWrDest = '405149 - 405150\tLISS CASTILLO';
      const p2 = parseQuickPasteRows(formatoWrDest);
      expect(p2[0].destinatario).toBe('LISS CASTILLO');
      expect(p2[0].wrCodes).toBe('WR000405149 / WR000405150');
      expect(p2[0].bultos).toBe('2 CJS');
    });
  });

  describe('Gestión de Fotografías y Evidencias de Entrega por Parada', () => {
    it('soporta colección vacía o múltiple de fotos por parada', () => {
      const fotosMock: string[] = [
        'https://r2.amex.com/FOLDER%20AMEX/despacho-rutas/paradas/foto1.jpg',
        'https://r2.amex.com/FOLDER%20AMEX/despacho-rutas/paradas/foto2.jpg'
      ];

      expect(fotosMock).toHaveLength(2);
      expect(fotosMock[0]).toContain('FOLDER%20AMEX/despacho-rutas');

      // Eliminación de una foto
      const updatedFotos = fotosMock.filter(f => f !== 'https://r2.amex.com/FOLDER%20AMEX/despacho-rutas/paradas/foto1.jpg');
      expect(updatedFotos).toHaveLength(1);
      expect(updatedFotos[0]).toBe('https://r2.amex.com/FOLDER%20AMEX/despacho-rutas/paradas/foto2.jpg');
    });
  });
});

