'use client';

import React from 'react';
import { InvoiceData } from '../types';
import {
  computePreviewFillerHeightPx,
  formatInvoiceCurrency,
} from '../utils/invoiceLayoutHelpers';

interface InvoiceDocumentPreviewProps {
  data: InvoiceData;
}

export function InvoiceDocumentPreview({ data }: InvoiceDocumentPreviewProps) {
  const formattedAmount = typeof data.invoiceAmount === 'number'
    ? `$${data.invoiceAmount.toFixed(2)}`
    : `$${String(data.invoiceAmount || '0.00').replace('$', '')}`;
  const items = data.items || [];
  const fillerHeightPx = computePreviewFillerHeightPx(items);

  return (
    <div className="invoice-preview-container">
      {/* Barra de estado / encabezado de la hoja */}
      <div className="invoice-preview-toolbar no-print">
        <span className="invoice-preview-badge">
          <i className="fa-solid fa-file-lines text-sky-400"></i> Vista Previa A4 / Letter (Idéntico al Word)
        </span>
        <span className="invoice-preview-info">
          N° {data.invoiceNumber || 'S/N'} • {data.items?.length || 0} ítems • {formattedAmount}
        </span>
      </div>

      {/* Hoja Física Simulada (A4/Letter) */}
      <div className="invoice-paper" id="invoice-printable-area">
        {/* Título Principal */}
        <div className="invoice-title">Invoice</div>

        {/* Encabezado Superior en 2 Columnas */}
        <div className="invoice-top-grid">
          {/* Columna Izquierda: Datos de la Empresa (Fijos) */}
          <div className="invoice-company-box">
            <div className="company-name">{data.companyName}</div>
            <div className="company-address">{data.companyAddress}</div>
            <div className="company-phone">{data.companyCityPhone}</div>
          </div>

          {/* Columna Derecha: Metadatos de la Factura */}
          <div className="invoice-meta-box">
            <div className="meta-row">
              <span className="meta-label">Invoice Number</span>
              <span className="meta-value font-mono">{data.invoiceNumber || '-'}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Invoice Date:</span>
              <span className="meta-value">{data.invoiceDate || '30/07/2026'}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Payment Terms:</span>
              <span className="meta-value">{data.paymentTerms || 'Due On Receipt'}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Invoice Due Date:</span>
              <span className="meta-value">{data.invoiceDueDate || '30/07/2026'}</span>
            </div>
            <div className="meta-row amount-row">
              <span className="meta-label">Invoice Amount:</span>
              <span className="meta-value amount-highlight">{formattedAmount}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Created By:</span>
              <span className="meta-value">{data.createdBy || 'ORDER Ronxana'}</span>
            </div>
          </div>
        </div>

        {/* Sección de Destinatarios: Bill To / Ship To */}
        <div className="invoice-recipients-grid">
          <div className="recipient-col">
            <div className="recipient-header">Bill To</div>
            <div className="recipient-name">{data.billToName || '—'}</div>
          </div>
          <div className="recipient-col">
            <div className="recipient-header">Ship To</div>
            <div className="recipient-name">{data.shipToName || data.billToName || '—'}</div>
          </div>
        </div>

        {/* Tabla de Ítems */}
        <div className="invoice-table-wrapper">
          <table className="invoice-items-table">
            <thead>
              <tr>
                <th className="col-item-number">Item #</th>
                <th className="col-item-name">Item Name</th>
                <th className="col-qty">Quantity</th>
                <th className="col-price">Unit Price</th>
                <th className="col-total">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr className="invoice-item-row invoice-empty-row">
                  <td className="cell-item-number">&nbsp;</td>
                  <td className="cell-item-name">
                    <span className="empty-items-notice">No se han registrado ítems</span>
                  </td>
                  <td className="cell-qty">&nbsp;</td>
                  <td className="cell-price">&nbsp;</td>
                  <td className="cell-total">&nbsp;</td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id || idx} className="invoice-item-row">
                    <td className="cell-item-number">{idx + 1}</td>
                    <td className="cell-item-name">
                      {item.name ? item.name : <span className="opacity-40 italic">Sin descripción</span>}
                    </td>
                    <td className="cell-qty">{item.quantity ?? '1'}</td>
                    <td className="cell-price">{formatInvoiceCurrency(item.unitPrice)}</td>
                    <td className="cell-total">{formatInvoiceCurrency(item.total)}</td>
                  </tr>
                ))
              )}

              {fillerHeightPx > 0 && (
                <tr className="invoice-filler-row" aria-hidden="true">
                  <td style={{ height: `${fillerHeightPx}px` }} />
                  <td style={{ height: `${fillerHeightPx}px` }} />
                  <td style={{ height: `${fillerHeightPx}px` }} />
                  <td style={{ height: `${fillerHeightPx}px` }} />
                  <td style={{ height: `${fillerHeightPx}px` }} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
