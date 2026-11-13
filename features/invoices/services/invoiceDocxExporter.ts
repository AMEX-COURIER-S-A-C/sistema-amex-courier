import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  Packer,
  WidthType,
  BorderStyle,
  HeightRule,
  TableLayoutType
} from 'docx';
import saveAs from 'file-saver';
import { InvoiceData } from '../types';
import {
  INVOICE_DOCX_COLUMN_DXA,
  INVOICE_PRINTABLE_DXA,
  computeDocxFillerDxa,
  formatInvoiceCurrency,
} from '../utils/invoiceLayoutHelpers';

/**
 * Construye el documento Word (.docx) de la factura con 5 columnas de ancho fijo,
 * filas sincronizadas por ítem y línea divisoria sutil inferior.
 */
export function buildInvoiceDocxDocument(data: InvoiceData): Document {
  const fontMain = 'Tahoma';
  const colorPrimary = '2E5B97'; // Azul corporativo exacto de zxzxzxzx.docx
  const colorTextDark = '3C3B3B';
  const colorValueDark = '212121';
  const colorMuted = '535353';
  const borderColor = '999999';

  const thinBorder = {
    style: BorderStyle.SINGLE,
    size: 6,
    color: borderColor
  };

  const noBorder = {
    style: BorderStyle.NONE,
    size: 0,
    color: 'FFFFFF'
  };

  // Párrafo de Título Principal: "Invoice"
  const titleParagraph = new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: 'Invoice',
        font: fontMain,
        size: 36, // 18pt
        bold: true,
        color: colorPrimary
      })
    ]
  });

  // Tabla invisible de Encabezado Superior (Izquierda: Empresa | Derecha: Metadatos Factura)
  const headerMetaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
      insideHorizontal: noBorder,
      insideVertical: noBorder
    },
    rows: [
      new TableRow({
        children: [
          // Columna Izquierda: Datos de la Empresa (ACCESSORIES SALES)
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: data.companyName || 'ACCESSORIES SALES',
                    font: 'Arial',
                    size: 19, // ~9.5pt
                    color: colorMuted
                  })
                ]
              }),
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: data.companyAddress || '4771 NW 72nd Ave Miami',
                    font: fontMain,
                    size: 16, // 8pt
                    color: colorMuted
                  })
                ]
              }),
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: data.companyCityPhone || 'FL 33166 Phone:702-5159055',
                    font: fontMain,
                    size: 19,
                    color: colorMuted
                  })
                ]
              })
            ]
          }),

          // Columna Derecha: Metadatos de la Factura (Invoice Number, Dates, Amount, etc.)
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: [
              // Invoice Number
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 30 },
                children: [
                  new TextRun({
                    text: 'Invoice Number: ',
                    font: fontMain,
                    size: 19,
                    bold: true,
                    color: colorTextDark
                  }),
                  new TextRun({
                    text: String(data.invoiceNumber || ''),
                    font: 'Arial',
                    size: 19,
                    color: colorTextDark
                  })
                ]
              }),
              // Invoice Date
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 30 },
                children: [
                  new TextRun({
                    text: 'Invoice Date: ',
                    font: fontMain,
                    size: 19,
                    bold: true,
                    color: colorTextDark
                  }),
                  new TextRun({
                    text: String(data.invoiceDate || '30/07/2026'),
                    font: fontMain,
                    size: 19,
                    color: colorTextDark
                  })
                ]
              }),
              // Payment Terms
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 30 },
                children: [
                  new TextRun({
                    text: 'Payment Terms: ',
                    font: fontMain,
                    size: 19,
                    bold: true,
                    color: colorTextDark
                  }),
                  new TextRun({
                    text: String(data.paymentTerms || 'Due On Receipt'),
                    font: fontMain,
                    size: 19,
                    color: colorTextDark
                  })
                ]
              }),
              // Invoice Due Date
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 30 },
                children: [
                  new TextRun({
                    text: 'Invoice Due Date: ',
                    font: fontMain,
                    size: 19,
                    bold: true,
                    color: colorTextDark
                  }),
                  new TextRun({
                    text: String(data.invoiceDueDate || '30/07/2026'),
                    font: fontMain,
                    size: 19,
                    color: colorTextDark
                  })
                ]
              }),
              // Invoice Amount
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 30 },
                children: [
                  new TextRun({
                    text: 'Invoice Amount:  ',
                    font: fontMain,
                    size: 19,
                    bold: true,
                    color: colorTextDark
                  }),
                  new TextRun({
                    text: `$${typeof data.invoiceAmount === 'number' ? data.invoiceAmount.toFixed(2) : String(data.invoiceAmount || '0.00').replace('$', '')}`,
                    font: fontMain,
                    size: 19,
                    bold: true,
                    color: colorValueDark
                  })
                ]
              }),
              // Created By
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: 'Created By:   ',
                    font: fontMain,
                    size: 19,
                    bold: true,
                    color: colorTextDark
                  }),
                  new TextRun({
                    text: String(data.createdBy || 'ORDER Ronxana'),
                    font: fontMain,
                    size: 19,
                    color: colorTextDark
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  // Espaciador antes de Bill To / Ship To
  const middleSpacer = new Paragraph({ spacing: { after: 120 }, children: [] });

  // Tabla de Destinatarios: Bill To (Izquierda) | Ship To (Derecha) con ancho fijo
  const recipientsTable = new Table({
    width: { size: INVOICE_PRINTABLE_DXA, type: WidthType.DXA },
    columnWidths: [5620, 5620],
    layout: TableLayoutType.FIXED,
    borders: {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
      insideHorizontal: noBorder,
      insideVertical: noBorder
    },
    rows: [
      // Fila 1: Títulos "Bill To" y "Ship To"
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { left: 0, right: 20 },
            children: [
              new Paragraph({
                spacing: { after: 20 },
                children: [
                  new TextRun({
                    text: 'Bill To',
                    font: fontMain,
                    size: 19,
                    bold: true,
                    color: colorTextDark
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { left: 20, right: 0 },
            children: [
              new Paragraph({
                spacing: { after: 20 },
                children: [
                  new TextRun({
                    text: 'Ship To',
                    font: fontMain,
                    size: 19,
                    bold: true,
                    color: colorTextDark
                  })
                ]
              })
            ]
          })
        ]
      }),
      // Fila 2: Nombres de destinatarios
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { left: 0, right: 20 },
            children: [
              new Paragraph({
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: data.billToName || '',
                    font: fontMain,
                    size: 18,
                    bold: true,
                    color: colorValueDark
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { left: 20, right: 0 },
            children: [
              new Paragraph({
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: data.shipToName || data.billToName || '',
                    font: fontMain,
                    size: 18,
                    bold: true,
                    color: colorValueDark
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  const preTableSpacer = new Paragraph({ spacing: { after: 100 }, children: [] });

  const subtleDivider = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: 'E2E8F0'
  };

  // Definición unificada de 5 columnas (7% / 45% / 12% / 18% / 18%) idéntica a Vista Previa y PDF
  const columnDefs = [
    { label: 'Item #', widthDxa: INVOICE_DOCX_COLUMN_DXA[0], align: AlignmentType.CENTER, padX: 60 },
    { label: 'Item Name', widthDxa: INVOICE_DOCX_COLUMN_DXA[1], align: AlignmentType.LEFT, padX: 110 },
    { label: 'Quantity', widthDxa: INVOICE_DOCX_COLUMN_DXA[2], align: AlignmentType.CENTER, padX: 70 },
    { label: 'Unit Price', widthDxa: INVOICE_DOCX_COLUMN_DXA[3], align: AlignmentType.RIGHT, padX: 110 },
    { label: 'Total', widthDxa: INVOICE_DOCX_COLUMN_DXA[4], align: AlignmentType.RIGHT, padX: 110 }
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    height: { value: 650, rule: HeightRule.ATLEAST },
    children: columnDefs.map(
      col =>
        new TableCell({
          width: { size: col.widthDxa, type: WidthType.DXA },
          shading: { fill: colorPrimary },
          margins: { left: col.padX, right: col.padX, top: 110, bottom: 110 },
          borders: {
            top: noBorder,
            bottom: noBorder,
            left: noBorder,
            right: noBorder
          },
          children: [
            new Paragraph({
              alignment: col.align,
              children: [
                new TextRun({
                  text: col.label,
                  font: fontMain,
                  size: 18,
                  bold: true,
                  color: 'FFFFFF'
                })
              ]
            })
          ]
        })
    )
  });

  const items = data.items || [];
  const fillerDxa = computeDocxFillerDxa(items, 4155);
  const hasFillerRow = fillerDxa > 0;

  const createBodyCell = (
    colIndex: number,
    lines: string[],
    bottomBorder: typeof thinBorder | typeof subtleDivider,
    options?: { italic?: boolean; color?: string; verticalPad?: number }
  ) => {
    const col = columnDefs[colIndex];
    const vPad = options?.verticalPad ?? 85;
    return new TableCell({
      width: { size: col.widthDxa, type: WidthType.DXA },
      margins: { left: col.padX, right: col.padX, top: vPad, bottom: vPad },
      borders: {
        top: noBorder,
        bottom: bottomBorder,
        left: thinBorder,
        right: thinBorder
      },
      children: (lines.length > 0 ? lines : ['']).map(
        line =>
          new Paragraph({
            alignment: col.align,
            spacing: { after: 20 },
            children: [
              new TextRun({
                text: line,
                font: fontMain,
                size: 18,
                italics: options?.italic,
                color: options?.color || colorValueDark
              })
            ]
          })
      )
    });
  };

  const itemRows: TableRow[] =
    items.length === 0
      ? [
          new TableRow({
            cantSplit: true,
            children: [
              createBodyCell(0, [''], hasFillerRow ? subtleDivider : thinBorder),
              createBodyCell(1, ['No se han registrado ítems'], hasFillerRow ? subtleDivider : thinBorder, {
                italic: true,
                color: '94A3B8',
                verticalPad: 180
              }),
              createBodyCell(2, [''], hasFillerRow ? subtleDivider : thinBorder),
              createBodyCell(3, [''], hasFillerRow ? subtleDivider : thinBorder),
              createBodyCell(4, [''], hasFillerRow ? subtleDivider : thinBorder)
            ]
          })
        ]
      : items.map((item, idx) => {
          const isLastItem = idx === items.length - 1;
          const bottomBorder = !hasFillerRow && isLastItem ? thinBorder : subtleDivider;
          const itemLines = (item.name || '').replace(/\r\n/g, '\n').split('\n');
          return new TableRow({
            cantSplit: true,
            children: [
              createBodyCell(0, [String(idx + 1)], bottomBorder, { color: '475569' }),
              createBodyCell(1, itemLines, bottomBorder),
              createBodyCell(2, [String(item.quantity ?? '1')], bottomBorder),
              createBodyCell(3, [formatInvoiceCurrency(item.unitPrice)], bottomBorder),
              createBodyCell(4, [formatInvoiceCurrency(item.total)], bottomBorder)
            ]
          });
        });

  if (hasFillerRow) {
    itemRows.push(
      new TableRow({
        height: { value: fillerDxa, rule: HeightRule.ATLEAST },
        children: columnDefs.map(
          col =>
            new TableCell({
              width: { size: col.widthDxa, type: WidthType.DXA },
              margins: { left: col.padX, right: col.padX, top: 0, bottom: 0 },
              borders: {
                top: noBorder,
                bottom: thinBorder,
                left: thinBorder,
                right: thinBorder
              },
              children: [new Paragraph({ children: [] })]
            })
        )
      })
    );
  }

  const invoiceItemsTable = new Table({
    width: { size: INVOICE_PRINTABLE_DXA, type: WidthType.DXA },
    columnWidths: [...INVOICE_DOCX_COLUMN_DXA],
    layout: TableLayoutType.FIXED,
    rows: [headerRow, ...itemRows]
  });

  // Ensamblar Documento DOCX con márgenes y tamaño de página exactos de zxzxzxzx.docx
  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 12240, // 8.5 in
              height: 15840 // 11 in
            },
            margin: {
              top: 1440,
              bottom: 1440,
              left: 450,
              right: 550
            }
          }
        },
        children: [
          titleParagraph,
          headerMetaTable,
          middleSpacer,
          recipientsTable,
          preTableSpacer,
          invoiceItemsTable
        ]
      }
    ]
  });
}

/**
 * Genera y descarga un documento de Word (.docx) editable
 * con el formato y diseño idéntico al documento original zxzxzxzx.docx.
 */
export async function generateInvoiceDocx(data: InvoiceData, filename?: string): Promise<void> {
  const doc = buildInvoiceDocxDocument(data);
  const blob = await Packer.toBlob(doc);
  const cleanBillTo = (data.billToName || 'INVOICE').trim();
  const safeBillTo = cleanBillTo.replace(/[/\\?%*:|"<>]/g, '').trim() || 'INVOICE';
  const finalFilename = filename || `${safeBillTo}.docx`;

  saveAs(blob, finalFilename);
}
