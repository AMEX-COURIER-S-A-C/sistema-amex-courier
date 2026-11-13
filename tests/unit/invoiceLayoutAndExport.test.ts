import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';
import { Packer } from 'docx';
import { InvoiceData, INITIAL_INVOICE_DATA } from '@/features/invoices/types';
import { InvoiceDocumentPreview } from '@/features/invoices/components/InvoiceDocumentPreview';
import { InvoiceControlPanel } from '@/features/invoices/components/InvoiceControlPanel';
import { buildInvoicePdfDocument } from '@/features/invoices/services/invoicePdfExporter';
import { buildInvoiceDocxDocument } from '@/features/invoices/services/invoiceDocxExporter';
import {
  INVOICE_COLUMN_WIDTHS,
  INVOICE_DOCX_COLUMN_DXA,
  INVOICE_PRINTABLE_DXA,
  computeDocxFillerDxa,
  computePreviewFillerHeightPx,
  estimateItemLineCount,
  filterHistorialEntries,
  formatHistorialSavedAt,
  formatInvoiceCurrency,
  normalizeInvoiceText,
  wrapTextLinesToWidth,
} from '@/features/invoices/utils/invoiceLayoutHelpers';

function buildSampleInvoice(overrides: Partial<InvoiceData> = {}): InvoiceData {
  return {
    ...INITIAL_INVOICE_DATA,
    invoiceNumber: 'I543232107',
    invoiceDate: '12/11/2026',
    invoiceDueDate: '12/11/2026',
    billToName: 'MARIA PAZ XIMENA VERA MARQUEZ',
    shipToName: 'MARIA PAZ XIMENA VERA MARQUEZ',
    invoiceAmount: '80.00',
    items: [
      {
        id: '1',
        name: 'COOKIES FOR SANTA FAMILY MATCHING PET BANDANA',
        quantity: 2,
        unitPrice: '20.00',
        total: '40.00',
      },
      {
        id: '2',
        name: 'COOKIES FOR SANTA FAMILY MATCHING ORGANIC COTTON SLEEP & PLAY',
        quantity: 2,
        unitPrice: '20.00',
        total: '40.00',
      },
    ],
    ...overrides,
  };
}

describe('Módulo 11: Ajuste automático de renglones, Preview/Print, PDF y Word', () => {
  describe('invoiceLayoutHelpers', () => {
    it('mantiene suma exacta de porcentajes (100%) y anchos DXA de las 5 columnas', () => {
      const totalPct =
        INVOICE_COLUMN_WIDTHS.itemNumber +
        INVOICE_COLUMN_WIDTHS.itemName +
        INVOICE_COLUMN_WIDTHS.quantity +
        INVOICE_COLUMN_WIDTHS.unitPrice +
        INVOICE_COLUMN_WIDTHS.total;
      expect(totalPct).toBe(100);

      const totalDxa = INVOICE_DOCX_COLUMN_DXA.reduce((acc, w) => acc + w, 0);
      expect(totalDxa).toBe(INVOICE_PRINTABLE_DXA);
    });

    it('envuelve nombres largos por palabra y corta tokens sin espacios sin rebasar maxWidth', () => {
      const longTitle = 'COOKIES FOR SANTA FAMILY MATCHING ORGANIC COTTON SLEEP & PLAY';
      const maxChars = 32;
      const lines = wrapTextLinesToWidth(longTitle, maxChars, s => s.length);

      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines.join(' ')).toBe(longTitle);
      lines.forEach(line => expect(line.length).toBeLessThanOrEqual(maxChars));

      // Token continuo sin espacios (ej. tracking/código largo) debe dividirse sin exceder límite
      const unbroken = 'AMEX99887766554433221100AABBCCDDEEFFGGHHIIJJKKLLMM';
      const brokenLines = wrapTextLinesToWidth(unbroken, 18, s => s.length);
      expect(brokenLines.length).toBeGreaterThanOrEqual(3);
      brokenLines.forEach(line => expect(line.length).toBeLessThanOrEqual(18));
      expect(brokenLines.join('')).toBe(unbroken);
    });

    it('conserva saltos de línea explícitos y formatea moneda sin NaN', () => {
      const normalized = normalizeInvoiceText('LÍNEA 1\r\nLÍNEA 2\tEXTRA — “TEST”');
      expect(normalized).toContain('\n');
      expect(normalized).toContain('- "TEST"');

      expect(formatInvoiceCurrency('24.47')).toBe('$24.47');
      expect(formatInvoiceCurrency('$195.82')).toBe('$195.82');
      expect(formatInvoiceCurrency('')).toBe('');
      expect(formatInvoiceCurrency(0)).toBe('');
      expect(formatInvoiceCurrency('texto-invalido')).toBe('texto-invalido');
    });

    it('calcula relleno elástico para facturas cortas y lo reduce a 0 en facturas largas', () => {
      const shortItems = buildSampleInvoice().items;
      expect(computePreviewFillerHeightPx(shortItems)).toBeGreaterThan(200);
      expect(computeDocxFillerDxa(shortItems)).toBeGreaterThan(2000);

      const manyItems = Array.from({ length: 24 }, (_, idx) => ({
        id: String(idx + 1),
        name: 'COOKIES FOR SANTA FAMILY MATCHING ORGANIC COTTON SLEEP & PLAY EXTRA LONG EDITION',
        quantity: 1,
        unitPrice: '10.00',
        total: '10.00',
      }));
      expect(estimateItemLineCount(manyItems[0].name, 38)).toBeGreaterThanOrEqual(2);
      expect(computePreviewFillerHeightPx(manyItems)).toBe(0);
      expect(computeDocxFillerDxa(manyItems)).toBe(0);
    });
  });

  describe('Vista Previa HTML / Imprimir A4 (InvoiceDocumentPreview)', () => {
    it('renderiza una fila <tr> sincronizada por cada ítem con celdas separadas en vez de columnas sueltas', () => {
      const data = buildSampleInvoice();
      const html = renderToStaticMarkup(React.createElement(InvoiceDocumentPreview, { data }));

      const rowMatches = html.match(/class="invoice-item-row"/g) || [];
      expect(rowMatches).toHaveLength(2);
      expect(html).toContain('class="cell-item-number"');
      expect(html).toContain('class="cell-item-name"');
      expect(html).toContain('class="cell-qty"');
      expect(html).toContain('class="cell-price"');
      expect(html).toContain('class="cell-total"');
      expect(html).toContain('COOKIES FOR SANTA FAMILY MATCHING ORGANIC COTTON SLEEP &amp; PLAY');
      expect(html).toContain('class="invoice-filler-row"');
    });

    it('omite la fila de relleno vacía cuando la tabla ya supera la altura base (listado multipágina)', () => {
      const manyItems = Array.from({ length: 25 }, (_, i) => ({
        id: String(i + 1),
        name: `PRODUCTO EXTENSO NUMERO ${i + 1} CON DESCRIPCION LARGA PARA BAJAR DE RENGLON`,
        quantity: 1,
        unitPrice: '15.00',
        total: '15.00',
      }));
      const html = renderToStaticMarkup(
        React.createElement(InvoiceDocumentPreview, { data: buildSampleInvoice({ items: manyItems }) })
      );

      const rowMatches = html.match(/class="invoice-item-row"/g) || [];
      expect(rowMatches).toHaveLength(25);
      expect(html).not.toContain('class="invoice-filler-row"');
    });
  });

  describe('Exportación PDF (buildInvoicePdfDocument)', () => {
    it('divide Item Name largo en múltiples líneas dentro del límite sin invadir Quantity y dibuja divisor sutil', () => {
      const data = buildSampleInvoice();
      const doc = buildInvoicePdfDocument(data);

      expect(doc.getNumberOfPages()).toBe(1);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);

      // Ancho de columna Item Name = 45% de (215.9 - 28) - 6mm padding = ~78.55mm
      const maxAllowedWidth = (215.9 - 28) * 0.45 - 6;
      const wrapped = wrapTextLinesToWidth(
        data.items[1].name,
        maxAllowedWidth,
        segment => doc.getTextWidth(segment)
      );
      expect(wrapped.length).toBeGreaterThanOrEqual(2);
      wrapped.forEach(line => {
        expect(doc.getTextWidth(line)).toBeLessThanOrEqual(maxAllowedWidth);
      });

      const internalPages = (doc.internal as unknown as { pages: string[][] }).pages;
      const pageOps = internalPages[1].join('\n');
      // Verificar líneas divididas en el stream PDF (no la frase completa en una sola instrucción)
      expect(pageOps).toContain('(COOKIES FOR SANTA FAMILY MATCHING ORGANIC)');
      expect(pageOps).toContain('(COTTON SLEEP & PLAY)');
      expect(pageOps).not.toContain('(COOKIES FOR SANTA FAMILY MATCHING ORGANIC COTTON SLEEP & PLAY)');
      // Verificar línea divisoria horizontal sutil (#E2E8F0)
      expect(pageOps).toMatch(/0\.89 0\.91 0\.94 RG/);
    });

    it('pagina automáticamente a una segunda hoja cuando hay muchos ítems de varios renglones', () => {
      const longItems = Array.from({ length: 28 }, (_, i) => ({
        id: String(i + 1),
        name: `ITEM #${i + 1} - COOKIES FOR SANTA FAMILY MATCHING ORGANIC COTTON SLEEP & PLAY EXTRA LARGE MODEL`,
        quantity: 2,
        unitPrice: '10.00',
        total: '20.00',
      }));
      const doc = buildInvoicePdfDocument(buildSampleInvoice({ items: longItems }));

      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
      const internalPages = (doc.internal as unknown as { pages: string[][] }).pages;
      const page2Ops = internalPages[2].join('\n');
      // La página 2 repite el encabezado azul de la tabla (#2E5B97)
      expect(page2Ops).toContain('Item #');
      expect(page2Ops).toContain('Item Name');
      expect(page2Ops).toContain('Quantity');
    });
  });

  describe('Exportación Word (.docx) (buildInvoiceDocxDocument)', () => {
    it('unifica a 5 columnas con ancho fijo (tblLayout fixed), filas sincronizadas y borde sutil #E2E8F0', async () => {
      const doc = buildInvoiceDocxDocument(buildSampleInvoice());
      const buffer = await Packer.toBuffer(doc);
      const zip = await JSZip.loadAsync(buffer);
      const documentXml = await zip.file('word/document.xml')?.async('string');

      expect(documentXml).toBeTruthy();
      expect(documentXml).toContain('w:tblLayout w:type="fixed"');
      expect(documentXml).toContain('Item #');
      expect(documentXml).toContain('Item Name');
      expect(documentXml).toContain('Quantity');
      expect(documentXml).toContain('Unit Price');
      expect(documentXml).toContain('Total');
      expect(documentXml).toContain('w:cantSplit');
      expect(documentXml).toContain('w:tblHeader');
      expect(documentXml).toContain('E2E8F0');
      expect(documentXml).toContain('COOKIES FOR SANTA FAMILY MATCHING ORGANIC COTTON SLEEP &amp; PLAY');
    });
  });

  describe('Botón y Modal de Historial (UX & Portal Safety)', () => {
    it('formatea timestamps ISO de la nube a fecha local DD/MM/YYYY HH:mm y preserva texto existente', () => {
      const formattedIso = formatHistorialSavedAt('2026-11-13T19:33:52.029627+00:00');
      expect(formattedIso).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
      expect(formatHistorialSavedAt('13/11/2026, 3:08 p. m.')).toBe('13/11/2026, 3:08 p. m.');
      expect(formatHistorialSavedAt('')).toBe('Reciente');
    });

    it('filtra entradas por N° Invoice o cliente conservando originalIndex exacto para eliminar', () => {
      const list = [
        buildSampleInvoice({ invoiceNumber: 'I100', billToName: 'ROBERTO QUEIROLO' }),
        buildSampleInvoice({ invoiceNumber: 'I200', billToName: 'EMILIANA GAMBOA' }),
        buildSampleInvoice({ invoiceNumber: 'I300', billToName: 'KATY HIDALGO' }),
      ];

      const matches = filterHistorialEntries(list, 'emiliana');
      expect(matches).toHaveLength(1);
      expect(matches[0].originalIndex).toBe(1);
      expect(matches[0].item.invoiceNumber).toBe('I200');
    });

    it('renderiza el botón Historial con contador sin envolver líneas ni fallar en SSR aunque esté abierto', () => {
      const noop = () => {};
      const html = renderToStaticMarkup(
        React.createElement(InvoiceControlPanel, {
          data: buildSampleInvoice(),
          isExporting: false,
          historial: [buildSampleInvoice()],
          isHistorialOpen: true,
          setIsHistorialOpen: noop,
          isPasteModalOpen: false,
          setIsPasteModalOpen: noop,
          pasteRawText: '',
          setPasteRawText: noop,
          onUpdateInvoiceNumber: noop,
          onGenerateRandomNumber: noop,
          onUpdateInvoiceDate: noop,
          onUpdateInvoiceDueDate: noop,
          onSetTodayDates: noop,
          onUpdateBillTo: noop,
          onUpdateShipTo: noop,
          onCopyBillToToShipTo: noop,
          onSelectCliente: noop,
          onAddItem: noop,
          onRemoveItem: noop,
          onUpdateItem: noop,
          onUpdateInvoiceAmount: noop,
          onProcessPasteText: noop,
          onDirectPasteFromClipboard: noop,
          onClearItems: noop,
          onClearRecipients: noop,
          onResetToDefault: noop,
          onSaveToHistorial: noop,
          onRestoreFromHistorial: noop,
          onDeleteHistorialItem: noop,
          onExportDocx: noop,
          onExportPdf: noop,
          onPrint: noop,
        })
      );

      expect(html).toContain('aria-expanded="true"');
      expect(html).toContain('Historial');
      expect(html).not.toContain('role="dialog"'); // Portal solo se monta en document.body del navegador
    });
  });
});
