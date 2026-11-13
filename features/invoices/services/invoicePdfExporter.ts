import jsPDF from 'jspdf';
import { InvoiceData } from '../types';
import {
  INVOICE_COLUMN_WIDTHS,
  formatInvoiceCurrency,
  normalizeInvoiceText,
  wrapTextLinesToWidth,
} from '../utils/invoiceLayoutHelpers';

interface PdfTableGeometry {
  marginX: number;
  marginTop: number;
  maxY: number;
  contentWidth: number;
  wItemNumber: number;
  wItem: number;
  wQty: number;
  wPrice: number;
  wTotal: number;
  xItemNumber: number;
  xItem: number;
  xQty: number;
  xPrice: number;
  xTotal: number;
  xRight: number;
}

const PDF_LINE_HEIGHT_MM = 4.0;
const PDF_ROW_VERTICAL_PADDING_MM = 2.4;
const PDF_FIRST_BASELINE_OFFSET_MM = 4.3;

function drawPdfTableHeader(doc: jsPDF, geom: PdfTableGeometry, startY: number): number {
  const headerHeight = 7.5;
  doc.setFillColor(46, 91, 151); // #2E5B97
  doc.rect(geom.marginX, startY, geom.contentWidth, headerHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Item #', geom.xItemNumber + geom.wItemNumber / 2, startY + 5.2, { align: 'center' });
  doc.text('Item Name', geom.xItem + 3, startY + 5.2);
  doc.text('Quantity', geom.xQty + geom.wQty / 2, startY + 5.2, { align: 'center' });
  doc.text('Unit Price', geom.xPrice + geom.wPrice - 3, startY + 5.2, { align: 'right' });
  doc.text('Total', geom.xTotal + geom.wTotal - 3, startY + 5.2, { align: 'right' });

  return startY + headerHeight;
}

function drawPdfTableGridBorders(doc: jsPDF, geom: PdfTableGeometry, startY: number, endY: number): void {
  doc.setDrawColor(153, 153, 153);
  doc.setLineWidth(0.2);

  // Bordes exteriores e inferiores
  doc.line(geom.marginX, startY, geom.marginX, endY);
  doc.line(geom.xRight, startY, geom.xRight, endY);
  doc.line(geom.marginX, endY, geom.xRight, endY);

  // Divisiones verticales internas de las 5 columnas
  doc.line(geom.xItem, startY, geom.xItem, endY);
  doc.line(geom.xQty, startY, geom.xQty, endY);
  doc.line(geom.xPrice, startY, geom.xPrice, endY);
  doc.line(geom.xTotal, startY, geom.xTotal, endY);
}

function drawPdfSubtleRowDivider(doc: jsPDF, geom: PdfTableGeometry, y: number): void {
  doc.setDrawColor(226, 232, 240); // #E2E8F0 línea horizontal sutil entre ítems
  doc.setLineWidth(0.15);
  doc.line(geom.marginX, y, geom.xRight, y);
}

function setPdfBodyTextStyle(doc: jsPDF): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(33, 33, 33);
}

/**
 * Construye el documento jsPDF de la factura respetando estrictamente los límites
 * horizontales de cada columna, bajando a nuevos renglones y paginando automáticamente.
 */
export function buildInvoicePdfDocument(data: InvoiceData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter', // 215.9 x 279.4 mm
  });

  const marginX = 14;
  const marginTop = 18;
  const pageWidth = 215.9;
  const pageHeight = 279.4;
  const marginBottom = 16;
  const maxY = pageHeight - marginBottom;
  const contentWidth = pageWidth - marginX * 2;
  let currentY = marginTop;

  const measureTextWidth = (segment: string) => doc.getTextWidth(segment);

  // 1. Título "Invoice"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(46, 91, 151);
  doc.text('Invoice', marginX, currentY);
  currentY += 10;

  // 2. Encabezado en dos columnas (Izquierda: Empresa | Derecha: Metadatos)
  const leftX = marginX;
  const rightLabelX = 140;
  const rightValueX = pageWidth - marginX;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(83, 83, 83);
  doc.text(normalizeInvoiceText(data.companyName || 'ACCESSORIES SALES'), leftX, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(60, 59, 59);
  doc.text('Invoice Number:', rightLabelX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeInvoiceText(String(data.invoiceNumber || '')), rightValueX, currentY, { align: 'right' });

  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(83, 83, 83);
  doc.text(normalizeInvoiceText(data.companyAddress || '4771 NW 72nd Ave Miami'), leftX, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(60, 59, 59);
  doc.text('Invoice Date:', rightLabelX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeInvoiceText(data.invoiceDate || '30/07/2026'), rightValueX, currentY, { align: 'right' });

  currentY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(60, 59, 59);
  doc.text('Payment Terms:', rightLabelX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeInvoiceText(data.paymentTerms || 'Due On Receipt'), rightValueX, currentY, { align: 'right' });

  currentY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(83, 83, 83);
  doc.text(normalizeInvoiceText(data.companyCityPhone || 'FL 33166 Phone:702-5159055'), leftX, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(60, 59, 59);
  doc.text('Invoice Due Date:', rightLabelX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeInvoiceText(data.invoiceDueDate || '30/07/2026'), rightValueX, currentY, { align: 'right' });

  currentY += 6;

  const formattedAmount =
    formatInvoiceCurrency(data.invoiceAmount) ||
    `$${String(data.invoiceAmount || '0.00').replace('$', '')}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(60, 59, 59);
  doc.text('Invoice Amount:', rightLabelX, currentY);
  doc.setTextColor(33, 33, 33);
  doc.text(formattedAmount, rightValueX, currentY, { align: 'right' });

  currentY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(60, 59, 59);
  doc.text('Created By:', rightLabelX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeInvoiceText(data.createdBy || 'ORDER Ronxana'), rightValueX, currentY, { align: 'right' });

  currentY += 12;

  // 3. Destinatarios: Bill To y Ship To con ajuste automático por columna
  const colHalfWidth = contentWidth / 2;
  const billToX = marginX;
  const shipToX = marginX + colHalfWidth;
  const recipientMaxWidth = colHalfWidth - 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(60, 59, 59);
  doc.text('Bill To', billToX, currentY);
  doc.text('Ship To', shipToX, currentY);

  currentY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(33, 33, 33);
  const billToLines = wrapTextLinesToWidth(normalizeInvoiceText(data.billToName || ''), recipientMaxWidth, measureTextWidth);
  const shipToLines = wrapTextLinesToWidth(
    normalizeInvoiceText(data.shipToName || data.billToName || ''),
    recipientMaxWidth,
    measureTextWidth
  );
  const recipientLineCount = Math.max(billToLines.length, shipToLines.length);

  for (let i = 0; i < recipientLineCount; i++) {
    const lineY = currentY + i * 4.2;
    if (billToLines[i]) doc.text(billToLines[i], billToX, lineY);
    if (shipToLines[i]) doc.text(shipToLines[i], shipToX, lineY);
  }

  currentY += recipientLineCount * 4.2 + 4;

  // 4. Geometría de Tabla de Ítems (7% / 45% / 12% / 18% / 18%)
  const wItemNumber = contentWidth * (INVOICE_COLUMN_WIDTHS.itemNumber / 100);
  const wItem = contentWidth * (INVOICE_COLUMN_WIDTHS.itemName / 100);
  const wQty = contentWidth * (INVOICE_COLUMN_WIDTHS.quantity / 100);
  const wPrice = contentWidth * (INVOICE_COLUMN_WIDTHS.unitPrice / 100);
  const wTotal = contentWidth * (INVOICE_COLUMN_WIDTHS.total / 100);

  const xItemNumber = marginX;
  const xItem = xItemNumber + wItemNumber;
  const xQty = xItem + wItem;
  const xPrice = xQty + wQty;
  const xTotal = xPrice + wPrice;

  const geom: PdfTableGeometry = {
    marginX,
    marginTop,
    maxY,
    contentWidth,
    wItemNumber,
    wItem,
    wQty,
    wPrice,
    wTotal,
    xItemNumber,
    xItem,
    xQty,
    xPrice,
    xTotal,
    xRight: marginX + contentWidth,
  };

  let pageTableStartY = drawPdfTableHeader(doc, geom, currentY);
  let cursorY = pageTableStartY;
  setPdfBodyTextStyle(doc);

  const items = data.items || [];
  const itemMaxTextWidth = geom.wItem - 6;
  const qtyMaxTextWidth = geom.wQty - 2.5;
  const priceMaxTextWidth = geom.wPrice - 5;
  const totalMaxTextWidth = geom.wTotal - 5;

  const advanceToNewPage = () => {
    drawPdfTableGridBorders(doc, geom, pageTableStartY, cursorY);
    doc.addPage();
    pageTableStartY = drawPdfTableHeader(doc, geom, geom.marginTop);
    cursorY = pageTableStartY;
    setPdfBodyTextStyle(doc);
  };

  items.forEach((item, index) => {
    const cleanName = normalizeInvoiceText(item.name || '');
    const nameLines = wrapTextLinesToWidth(cleanName, itemMaxTextWidth, measureTextWidth);
    const qtyLines = wrapTextLinesToWidth(
      normalizeInvoiceText(String(item.quantity ?? '1')),
      qtyMaxTextWidth,
      measureTextWidth
    );
    const priceLines = wrapTextLinesToWidth(formatInvoiceCurrency(item.unitPrice), priceMaxTextWidth, measureTextWidth);
    const totalLines = wrapTextLinesToWidth(formatInvoiceCurrency(item.total), totalMaxTextWidth, measureTextWidth);

    const totalLinesInRow = Math.max(nameLines.length, qtyLines.length, priceLines.length, totalLines.length);
    let lineOffset = 0;

    while (lineOffset < totalLinesInRow) {
      const remainingLines = totalLinesInRow - lineOffset;
      const neededHeightForRemaining = PDF_ROW_VERTICAL_PADDING_MM + remainingLines * PDF_LINE_HEIGHT_MM;

      // Si el ítem completo no entra en el resto de la página actual y no estamos al inicio de hoja, saltar antes de dibujar
      if (cursorY > pageTableStartY && cursorY + neededHeightForRemaining > geom.maxY) {
        const capacityOnFreshPage = Math.floor((geom.maxY - (geom.marginTop + 7.5) - PDF_ROW_VERTICAL_PADDING_MM) / PDF_LINE_HEIGHT_MM);
        const fitsWholeOnNextPage = remainingLines <= capacityOnFreshPage;
        const availableHere = Math.floor((geom.maxY - cursorY - PDF_ROW_VERTICAL_PADDING_MM) / PDF_LINE_HEIGHT_MM);
        if (fitsWholeOnNextPage || availableHere < 1) {
          advanceToNewPage();
          continue;
        }
      }

      const maxLinesOnThisPage = Math.max(
        1,
        Math.floor((geom.maxY - cursorY - PDF_ROW_VERTICAL_PADDING_MM) / PDF_LINE_HEIGHT_MM)
      );
      const chunkCount = Math.min(remainingLines, maxLinesOnThisPage);
      const rowChunkHeight = PDF_ROW_VERTICAL_PADDING_MM + chunkCount * PDF_LINE_HEIGHT_MM;

      for (let i = 0; i < chunkCount; i++) {
        const lineIdx = lineOffset + i;
        const baselineY = cursorY + PDF_FIRST_BASELINE_OFFSET_MM + i * PDF_LINE_HEIGHT_MM;

        if (lineIdx === 0) {
          doc.text(String(index + 1), geom.xItemNumber + geom.wItemNumber / 2, baselineY, { align: 'center' });
        }
        if (nameLines[lineIdx]) {
          doc.text(nameLines[lineIdx], geom.xItem + 3, baselineY);
        }
        if (qtyLines[lineIdx]) {
          doc.text(qtyLines[lineIdx], geom.xQty + geom.wQty / 2, baselineY, { align: 'center' });
        }
        if (priceLines[lineIdx]) {
          doc.text(priceLines[lineIdx], geom.xPrice + geom.wPrice - 3, baselineY, { align: 'right' });
        }
        if (totalLines[lineIdx]) {
          doc.text(totalLines[lineIdx], geom.xTotal + geom.wTotal - 3, baselineY, { align: 'right' });
        }
      }

      cursorY += rowChunkHeight;
      lineOffset += chunkCount;

      if (lineOffset < totalLinesInRow) {
        advanceToNewPage();
      }
    }

    drawPdfSubtleRowDivider(doc, geom, cursorY);
  });

  // Cerrar caja de la página final: en factura de 1 hoja conservar alto mínimo clásico (110mm)
  const totalPages = doc.getNumberOfPages();
  const bodyMinHeight = totalPages === 1 ? 110 : 12;
  const finalBoxEndY = Math.min(geom.maxY, Math.max(pageTableStartY + bodyMinHeight, cursorY + 2));
  drawPdfTableGridBorders(doc, geom, pageTableStartY, finalBoxEndY);

  return doc;
}

/**
 * Genera y descarga un PDF de la factura con el formato de zxzxzxzx.docx
 */
export async function generateInvoicePdf(data: InvoiceData, filename?: string): Promise<void> {
  const doc = buildInvoicePdfDocument(data);

  // Guardar archivo solo con el nombre de Bill To
  const cleanBillTo = (data.billToName || 'INVOICE').trim();
  const safeBillTo = cleanBillTo.replace(/[/\\?%*:|"<>]/g, '').trim() || 'INVOICE';
  const finalFilename = filename || `${safeBillTo}.pdf`;

  doc.save(finalFilename);
}
