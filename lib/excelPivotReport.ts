import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Paquete } from '@/types';

export interface EnAlmacenRow {
  cliente: string;
  wr: string;
  tracking: string;
  pesoKg: number;
  tipo: string;
}

export interface ClientSummaryItem {
  cliente: string;
  paquetes: number;
  pesoKg: number;
}

/**
 * Escapa caracteres reservados para XML 1.0 y elimina caracteres de control no permitidos.
 */
export function escapeXml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  const s = String(str).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Filtra paquetes cuyo estado AMEX sea 'en_almacen' o 'recibido'
 * (los que constituyen la carga actualmente en almacén).
 */
export function selectEnAlmacen(paquetes: Paquete[]): EnAlmacenRow[] {
  if (!Array.isArray(paquetes)) return [];

  return paquetes
    .filter(p => {
      const norm = (p.estadoAmex || '').trim().toLowerCase();
      return norm === 'en_almacen' || norm === 'recibido';
    })
    .map(p => {
      const rawCliente = (p.nombreConsignatario || '').trim();
      const rawWr = (p.numeroReciboBodega || '').trim();
      const rawTracking = (p.tracking || '').trim();
      const rawTipo = (p.tipoEmpaque || '').trim();

      const numPeso = p.pesoKg && Number(p.pesoKg) > 0 ? Number(p.pesoKg) : 0;
      const pesoKg = Math.round(numPeso * 100) / 100;

      return {
        cliente: rawCliente || 'SIN CLIENTE',
        wr: rawWr || 'SIN WR',
        tracking: rawTracking || '',
        pesoKg,
        tipo: rawTipo || 'SIN TIPO'
      };
    });
}

/**
 * Agrupa los paquetes en almacén por cliente, calculando el total de paquetes
 * y la suma de peso en kg, ordenado descendentemente por paquetes y peso.
 */
export function buildClientSummary(rows: EnAlmacenRow[]): ClientSummaryItem[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const map = new Map<string, { paquetes: number; pesoKg: number }>();

  for (const r of rows) {
    const cli = r.cliente || 'SIN CLIENTE';
    const current = map.get(cli) || { paquetes: 0, pesoKg: 0 };
    current.paquetes += 1;
    current.pesoKg += r.pesoKg > 0 ? r.pesoKg : 0;
    map.set(cli, current);
  }

  const result: ClientSummaryItem[] = [];
  for (const [cliente, data] of map.entries()) {
    result.push({
      cliente,
      paquetes: data.paquetes,
      pesoKg: Math.round(data.pesoKg * 100) / 100
    });
  }

  // Orden descendente por paquetes, luego por peso, luego por nombre
  return result.sort((a, b) => {
    if (b.paquetes !== a.paquetes) {
      return b.paquetes - a.paquetes;
    }
    if (b.pesoKg !== a.pesoKg) {
      return b.pesoKg - a.pesoKg;
    }
    return a.cliente.localeCompare(b.cliente, 'es');
  });
}

// ---------------------------------------------------------------------------
// OpenXML Builders (Generación de hojas y estructuras OOXML puras)
// ---------------------------------------------------------------------------

function buildContentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>
  <Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>
  <Override PartName="/xl/pivotCache/pivotCacheDefinition1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheDefinition+xml"/>
  <Override PartName="/xl/pivotCache/pivotCacheRecords1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheRecords+xml"/>
  <Override PartName="/xl/pivotTables/pivotTable1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotTable+xml"/>
</Types>`;
}

function buildPackageRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function buildWorkbookXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews>
    <workbookView activeTab="0"/>
  </bookViews>
  <sheets>
    <sheet name="Dashboard" sheetId="1" r:id="rId1"/>
    <sheet name="Resumen Clientes" sheetId="2" r:id="rId2"/>
    <sheet name="Tabla Dinámica" sheetId="3" r:id="rId3"/>
    <sheet name="Datos" sheetId="4" r:id="rId4"/>
  </sheets>
  <pivotCaches>
    <pivotCache cacheId="1" r:id="rId6"/>
  </pivotCaches>
</workbook>`;
}

function buildWorkbookRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheDefinition" Target="pivotCache/pivotCacheDefinition1.xml"/>
</Relationships>`;
}

function buildStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="8">
    <!-- 0: Regular -->
    <font><sz val="10"/><name val="Segoe UI"/><color rgb="FF0F172A"/></font>
    <!-- 1: Header White Bold -->
    <font><b/><sz val="10"/><name val="Segoe UI"/><color rgb="FFFFFFFF"/></font>
    <!-- 2: Dark Bold -->
    <font><b/><sz val="10"/><name val="Segoe UI"/><color rgb="FF0F172A"/></font>
    <!-- 3: KPI Big Value -->
    <font><b/><sz val="18"/><name val="Segoe UI"/><color rgb="FF059669"/></font>
    <!-- 4: KPI Label -->
    <font><b/><sz val="9"/><name val="Segoe UI"/><color rgb="FF475569"/></font>
    <!-- 5: Title Large -->
    <font><b/><sz val="14"/><name val="Segoe UI"/><color rgb="FF0F172A"/></font>
    <!-- 6: Subtitle Italic -->
    <font><i/><sz val="10"/><name val="Segoe UI"/><color rgb="FF64748B"/></font>
    <!-- 7: Header Emerald White Bold -->
    <font><b/><sz val="10"/><name val="Segoe UI"/><color rgb="FFFFFFFF"/></font>
  </fonts>
  <fills count="7">
    <!-- 0 & 1: Required defaults -->
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <!-- 2: Dark Slate Header -->
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/></patternFill></fill>
    <!-- 3: Emerald Header -->
    <fill><patternFill patternType="solid"><fgColor rgb="FF047857"/></patternFill></fill>
    <!-- 4: Light Row Alternate -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
    <!-- 5: KPI Card Light Emerald -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFF0FDF4"/></patternFill></fill>
    <!-- 6: Soft Border Accent -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/></patternFill></fill>
  </fills>
  <borders count="4">
    <!-- 0: None -->
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <!-- 1: Thin Slate -->
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
    <!-- 2: Header Medium Bottom -->
    <border>
      <left style="thin"><color rgb="FF334155"/></left>
      <right style="thin"><color rgb="FF334155"/></right>
      <top style="thin"><color rgb="FF334155"/></top>
      <bottom style="medium"><color rgb="FF0F172A"/></bottom>
      <diagonal/>
    </border>
    <!-- 3: Total Row Double Bottom -->
    <border>
      <left/><right/>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="double"><color rgb="FF0F172A"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="14">
    <!-- 0: Default -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <!-- 1: Data Text Left -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
    <!-- 2: Data Decimal (0.00) -->
    <xf numFmtId="2" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1">
      <alignment horizontal="right"/>
    </xf>
    <!-- 3: Data Integer (#,##0) -->
    <xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1">
      <alignment horizontal="right"/>
    </xf>
    <!-- 4: Table Header Dark -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- 5: Table Header Emerald -->
    <xf numFmtId="0" fontId="7" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 6: KPI Card Big Value -->
    <xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 7: KPI Card Label -->
    <xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 8: Title -->
    <xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <!-- 9: Subtitle -->
    <xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <!-- 10: Total Row Bold Text -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="3" xfId="0" applyFont="1" applyBorder="1"/>
    <!-- 11: Total Row Bold Decimal -->
    <xf numFmtId="2" fontId="2" fillId="0" borderId="3" xfId="0" applyFont="1" applyNumberFormat="1" applyBorder="1">
      <alignment horizontal="right"/>
    </xf>
    <!-- 12: Total Row Bold Integer -->
    <xf numFmtId="3" fontId="2" fillId="0" borderId="3" xfId="0" applyFont="1" applyNumberFormat="1" applyBorder="1">
      <alignment horizontal="right"/>
    </xf>
    <!-- 13: Data Text Center -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center"/>
    </xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
}

// ---------------------------------------------------------------------------
// Sheet 1: Dashboard con KPIs y Drawing
// ---------------------------------------------------------------------------

function buildSheet1Xml(rows: EnAlmacenRow[], summary: ClientSummaryItem[]): string {
  const totalPaquetes = rows.length;
  const clientesUnicos = summary.length;
  const pesoTotal = rows.reduce((acc, r) => acc + r.pesoKg, 0);
  const promedioPeso = totalPaquetes > 0 ? pesoTotal / totalPaquetes : 0;
  const dataCount = rows.length;
  const summaryCount = summary.length;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews>
    <sheetView showGridLines="1" tabSelected="1" workbookViewId="0"/>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="16"/>
  <cols>
    <col min="1" max="1" width="4" customWidth="1"/>
    <col min="2" max="2" width="18" customWidth="1"/>
    <col min="3" max="3" width="18" customWidth="1"/>
    <col min="4" max="4" width="18" customWidth="1"/>
    <col min="5" max="5" width="18" customWidth="1"/>
    <col min="6" max="6" width="18" customWidth="1"/>
    <col min="7" max="7" width="18" customWidth="1"/>
    <col min="8" max="8" width="18" customWidth="1"/>
    <col min="9" max="9" width="18" customWidth="1"/>
    <col min="10" max="11" width="16" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="1" spans="1:10" ht="26" customHeight="1">
      <c r="B1" s="8" t="inlineStr"><is><t>SISTEMA AMEX COURIER - DASHBOARD EN ALMACÉN</t></is></c>
    </row>
    <row r="2" spans="1:10" ht="18" customHeight="1">
      <c r="B2" s="9" t="inlineStr"><is><t>Reporte dinámico analítico con fórmulas en tiempo real y Top 10 Clientes</t></is></c>
    </row>
    <row r="4" spans="1:10" ht="18" customHeight="1">
      <c r="B4" s="7" t="inlineStr"><is><t>TOTAL PAQUETES</t></is></c>
      <c r="D4" s="7" t="inlineStr"><is><t>CLIENTES ÚNICOS</t></is></c>
      <c r="F4" s="7" t="inlineStr"><is><t>PESO TOTAL (KG)</t></is></c>
      <c r="H4" s="7" t="inlineStr"><is><t>PROMEDIO (KG/PQTE)</t></is></c>
    </row>
    <row r="5" spans="1:10" ht="30" customHeight="1">
      <c r="B5" s="6"><f>COUNTA(Datos!B2:B${dataCount + 1})</f><v>${totalPaquetes}</v></c>
      <c r="D5" s="6"><f>COUNTA(&apos;Resumen Clientes&apos;!A2:A${summaryCount + 1})</f><v>${clientesUnicos}</v></c>
      <c r="F5" s="6"><f>SUM(Datos!D2:D${dataCount + 1})</f><v>${pesoTotal.toFixed(2)}</v></c>
      <c r="H5" s="6"><f>IFERROR(SUM(Datos!D2:D${dataCount + 1})/COUNTA(Datos!B2:B${dataCount + 1}), 0)</f><v>${promedioPeso.toFixed(2)}</v></c>
    </row>
    <row r="7" spans="1:10" ht="20" customHeight="1">
      <c r="B7" s="5" t="inlineStr"><is><t>GRÁFICO TOP 10 CLIENTES CON MÁS CARGA EN ALMACÉN</t></is></c>
    </row>
  </sheetData>
  <drawing r:id="rId1"/>
</worksheet>`;
}

function buildSheet1RelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`;
}

// ---------------------------------------------------------------------------
// Sheet 2: Resumen Clientes (con fórmulas COUNTIF y SUMIF vivas sobre Datos)
// ---------------------------------------------------------------------------

function buildSheet2Xml(rows: EnAlmacenRow[], summary: ClientSummaryItem[]): string {
  const dataCount = rows.length;
  const totalPaquetes = rows.length;
  const totalPeso = rows.reduce((acc, r) => acc + r.pesoKg, 0);

  const rowsXml = summary.map((item, idx) => {
    const rowNum = idx + 2;
    return `    <row r="${rowNum}" spans="1:3" ht="18" customHeight="1">
      <c r="A${rowNum}" s="1" t="inlineStr"><is><t>${escapeXml(item.cliente)}</t></is></c>
      <c r="B${rowNum}" s="3"><f>COUNTIF(Datos!$A$2:$A$${dataCount + 1}, A${rowNum})</f><v>${item.paquetes}</v></c>
      <c r="C${rowNum}" s="2"><f>SUMIF(Datos!$A$2:$A$${dataCount + 1}, A${rowNum}, Datos!$D$2:$D$${dataCount + 1})</f><v>${item.pesoKg.toFixed(2)}</v></c>
    </row>`;
  }).join('\n');

  const totalRowNum = summary.length + 2;
  const totalRowXml = `    <row r="${totalRowNum}" spans="1:3" ht="20" customHeight="1">
      <c r="A${totalRowNum}" s="10" t="inlineStr"><is><t>TOTAL GENERAL</t></is></c>
      <c r="B${totalRowNum}" s="12"><f>SUM(B2:B${totalRowNum - 1})</f><v>${totalPaquetes}</v></c>
      <c r="C${totalRowNum}" s="11"><f>SUM(C2:C${totalRowNum - 1})</f><v>${totalPeso.toFixed(2)}</v></c>
    </row>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView showGridLines="1" tabSelected="0" workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="16"/>
  <cols>
    <col min="1" max="1" width="36" customWidth="1"/>
    <col min="2" max="2" width="22" customWidth="1"/>
    <col min="3" max="3" width="20" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="1" spans="1:3" ht="22" customHeight="1">
      <c r="A1" s="4" t="inlineStr"><is><t>Cliente</t></is></c>
      <c r="B1" s="4" t="inlineStr"><is><t>Paquetes en Almacén</t></is></c>
      <c r="C1" s="4" t="inlineStr"><is><t>Peso Total (kg)</t></is></c>
    </row>
${rowsXml}
${totalRowXml}
  </sheetData>
</worksheet>`;
}

// ---------------------------------------------------------------------------
// Sheet 3: Tabla Dinámica (PivotTable nativa)
// ---------------------------------------------------------------------------

function buildSheet3Xml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews>
    <sheetView showGridLines="1" tabSelected="0" workbookViewId="0"/>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="16"/>
  <cols>
    <col min="1" max="1" width="32" customWidth="1"/>
    <col min="2" max="14" width="16" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="1" spans="1:10" ht="22" customHeight="1">
      <c r="A1" s="8" t="inlineStr"><is><t>TABLA DINÁMICA - DISTRIBUCIÓN POR CLIENTE Y TIPO DE EMPAQUE</t></is></c>
    </row>
    <row r="2" spans="1:10" ht="18" customHeight="1">
      <c r="A2" s="9" t="inlineStr"><is><t>Datos en vivo vinculados a la hoja &quot;Datos&quot;. Arrastra o actualiza campos libremente.</t></is></c>
    </row>
  </sheetData>
  <pivotTables>
    <pivotTable r:id="rId1"/>
  </pivotTables>
</worksheet>`;
}

function buildSheet3RelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotTable" Target="../pivotTables/pivotTable1.xml"/>
</Relationships>`;
}

// ---------------------------------------------------------------------------
// Sheet 4: Datos (detalle completo con autofiltro y cabecera fija)
// ---------------------------------------------------------------------------

function buildSheet4Xml(rows: EnAlmacenRow[]): string {
  const dataCount = rows.length;

  const rowsXml = rows.map((r, idx) => {
    const rowNum = idx + 2;
    const pesoCell = r.pesoKg > 0
      ? `<c r="D${rowNum}" s="2"><v>${r.pesoKg.toFixed(2)}</v></c>`
      : `<c r="D${rowNum}" s="2"/>`;

    return `    <row r="${rowNum}" spans="1:5" ht="18" customHeight="1">
      <c r="A${rowNum}" s="1" t="inlineStr"><is><t>${escapeXml(r.cliente)}</t></is></c>
      <c r="B${rowNum}" s="13" t="inlineStr"><is><t>${escapeXml(r.wr)}</t></is></c>
      <c r="C${rowNum}" s="13" t="inlineStr"><is><t>${escapeXml(r.tracking)}</t></is></c>
      ${pesoCell}
      <c r="E${rowNum}" s="1" t="inlineStr"><is><t>${escapeXml(r.tipo)}</t></is></c>
    </row>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView showGridLines="1" tabSelected="0" workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="16"/>
  <cols>
    <col min="1" max="1" width="32" customWidth="1"/>
    <col min="2" max="2" width="18" customWidth="1"/>
    <col min="3" max="3" width="26" customWidth="1"/>
    <col min="4" max="4" width="16" customWidth="1"/>
    <col min="5" max="5" width="22" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="1" spans="1:5" ht="22" customHeight="1">
      <c r="A1" s="4" t="inlineStr"><is><t>Cliente</t></is></c>
      <c r="B1" s="4" t="inlineStr"><is><t>WR</t></is></c>
      <c r="C1" s="4" t="inlineStr"><is><t>Tracking</t></is></c>
      <c r="D1" s="4" t="inlineStr"><is><t>Peso (kg)</t></is></c>
      <c r="E1" s="4" t="inlineStr"><is><t>Tipo de paquete</t></is></c>
    </row>
${rowsXml}
  </sheetData>
  <autoFilter ref="A1:E${Math.max(2, dataCount + 1)}"/>
</worksheet>`;
}

// ---------------------------------------------------------------------------
// Drawing & Chart: Gráfico nativo de barras Top 10 Clientes
// ---------------------------------------------------------------------------

function buildDrawing1Xml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <xdr:twoCellAnchor>
    <xdr:from>
      <xdr:col>1</xdr:col>
      <xdr:colOff>0</xdr:colOff>
      <xdr:row>7</xdr:row>
      <xdr:rowOff>0</xdr:rowOff>
    </xdr:from>
    <xdr:to>
      <xdr:col>9</xdr:col>
      <xdr:colOff>0</xdr:colOff>
      <xdr:row>25</xdr:row>
      <xdr:rowOff>0</xdr:rowOff>
    </xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr>
        <xdr:cNvPr id="2" name="Gráfico Top 10 Clientes"/>
        <xdr:cNvGraphicFramePr/>
      </xdr:nvGraphicFramePr>
      <xdr:xfrm>
        <a:off x="0" y="0"/>
        <a:ext cx="0" cy="0"/>
      </xdr:xfrm>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
          <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId1"/>
        </a:graphicData>
      </a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`;
}

function buildDrawing1RelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
</Relationships>`;
}

function buildChart1Xml(summary: ClientSummaryItem[]): string {
  const top10 = summary.slice(0, 10);
  const count = top10.length;
  const lastRow = count + 1; // 1 header + count

  const catPoints = top10.map((item, idx) => `              <c:pt idx="${idx}"><c:v>${escapeXml(item.cliente)}</c:v></c:pt>`).join('\n');
  const valPoints = top10.map((item, idx) => `              <c:pt idx="${idx}"><c:v>${item.paquetes}</c:v></c:pt>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:lang val="es-PE"/>
  <c:chart>
    <c:title>
      <c:tx>
        <c:rich>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:pPr>
              <a:defRPr b="1" sz="1300"/>
            </a:pPr>
            <a:r>
              <a:rPr b="1" sz="1300"/>
              <a:t>Top 10 Clientes - Paquetes en Almacén</a:t>
            </a:r>
          </a:p>
        </c:rich>
      </c:tx>
      <c:layout/>
      <c:overlay val="0"/>
    </c:title>
    <c:plotArea>
      <c:layout/>
      <c:barChart>
        <c:barDir val="col"/>
        <c:grouping val="standard"/>
        <c:varyColors val="0"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          <c:tx>
            <c:strRef>
              <c:f>&apos;Resumen Clientes&apos;!$B$1</c:f>
              <c:strCache>
                <c:ptCount val="1"/>
                <c:pt idx="0"><c:v>Paquetes</c:v></c:pt>
              </c:strCache>
            </c:strRef>
          </c:tx>
          <c:spPr>
            <a:solidFill>
              <a:srgbClr val="059669"/>
            </a:solidFill>
            <a:ln w="9525">
              <a:solidFill><a:srgbClr val="047857"/></a:solidFill>
            </a:ln>
          </c:spPr>
          <c:dLbls>
            <c:showVal val="1"/>
            <c:showCatName val="0"/>
            <c:showSerName val="0"/>
            <c:showPercent val="0"/>
          </c:dLbls>
          <c:cat>
            <c:strRef>
              <c:f>&apos;Resumen Clientes&apos;!$A$2:$A$${lastRow}</c:f>
              <c:strCache>
                <c:ptCount val="${count}"/>
${catPoints}
              </c:strCache>
            </c:strRef>
          </c:cat>
          <c:val>
            <c:numRef>
              <c:f>&apos;Resumen Clientes&apos;!$B$2:$B$${lastRow}</c:f>
              <c:numCache>
                <c:formatCode>#,##0</c:formatCode>
                <c:ptCount val="${count}"/>
${valPoints}
              </c:numCache>
            </c:numRef>
          </c:val>
        </c:ser>
        <c:axId val="100001"/>
        <c:axId val="100002"/>
      </c:barChart>
      <c:catAx>
        <c:axId val="100001"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="b"/>
        <c:tickLblPos val="nextTo"/>
        <c:crossAx val="100002"/>
        <c:crosses val="autoZero"/>
        <c:auto val="1"/>
        <c:lblAlgn val="ctr"/>
        <c:lblOffset val="100"/>
      </c:catAx>
      <c:valAx>
        <c:axId val="100002"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="l"/>
        <c:majorGridlines/>
        <c:numFmt formatCode="General" sourceLinked="1"/>
        <c:tickLblPos val="nextTo"/>
        <c:crossAx val="100001"/>
        <c:crosses val="autoZero"/>
        <c:crossBetween val="between"/>
      </c:valAx>
    </c:plotArea>
    <c:legend>
      <c:legendPos val="r"/>
      <c:layout/>
      <c:overlay val="0"/>
    </c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`;
}

// ---------------------------------------------------------------------------
// Pivot Cache & Pivot Table (Estructura Nativa OpenXML)
// ---------------------------------------------------------------------------

function buildPivotCacheDefinitionXml(rows: EnAlmacenRow[]): string {
  const count = rows.length;
  const uniqueClients = Array.from(new Set(rows.map(r => r.cliente)));
  const uniqueWrs = Array.from(new Set(rows.map(r => r.wr)));
  const uniqueTrackings = Array.from(new Set(rows.map(r => r.tracking)));
  const uniqueTipos = Array.from(new Set(rows.map(r => r.tipo)));

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<pivotCacheDefinition xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1" refreshOnLoad="1" recordCount="${count}">
  <cacheSource type="worksheet">
    <worksheetSource ref="A1:E${count + 1}" sheet="Datos"/>
  </cacheSource>
  <cacheFields count="5">
    <cacheField name="Cliente" numFmtId="0">
      <sharedItems count="${uniqueClients.length}">
        ${uniqueClients.map(c => `<s v="${escapeXml(c)}"/>`).join('')}
      </sharedItems>
    </cacheField>
    <cacheField name="WR" numFmtId="0">
      <sharedItems count="${uniqueWrs.length}">
        ${uniqueWrs.map(w => `<s v="${escapeXml(w)}"/>`).join('')}
      </sharedItems>
    </cacheField>
    <cacheField name="Tracking" numFmtId="0">
      <sharedItems count="${uniqueTrackings.length}">
        ${uniqueTrackings.map(t => `<s v="${escapeXml(t)}"/>`).join('')}
      </sharedItems>
    </cacheField>
    <cacheField name="Peso (kg)" numFmtId="0">
      <sharedItems containsNumber="1" containsSemiMixedTypes="0"/>
    </cacheField>
    <cacheField name="Tipo de paquete" numFmtId="0">
      <sharedItems count="${uniqueTipos.length}">
        ${uniqueTipos.map(t => `<s v="${escapeXml(t)}"/>`).join('')}
      </sharedItems>
    </cacheField>
  </cacheFields>
</pivotCacheDefinition>`;
}

function buildPivotCacheDefinitionRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheRecords" Target="pivotCacheRecords1.xml"/>
</Relationships>`;
}

function buildPivotCacheRecordsXml(rows: EnAlmacenRow[]): string {
  const count = rows.length;
  const records = rows.map(r => {
    const pesoXml = r.pesoKg > 0 ? `<n v="${r.pesoKg.toFixed(2)}"/>` : `<m/>`;
    return `  <r>
    <s v="${escapeXml(r.cliente)}"/>
    <s v="${escapeXml(r.wr)}"/>
    <s v="${escapeXml(r.tracking)}"/>
    ${pesoXml}
    <s v="${escapeXml(r.tipo)}"/>
  </r>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<pivotCacheRecords xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${count}">
${records}
</pivotCacheRecords>`;
}

function buildPivotTable1Xml(rows: EnAlmacenRow[]): string {
  const uniqueClients = Array.from(new Set(rows.map(r => r.cliente)));
  const endRow = Math.max(12, uniqueClients.length + 6);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<pivotTableDefinition xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
                      name="TablaDinamicaEnAlmacen"
                      cacheId="1"
                      applyNumberFormats="0"
                      applyBorderFormats="0"
                      applyFontFormats="0"
                      applyPatternFormats="0"
                      applyAlignmentFormats="0"
                      applyWidthHeightFormats="1"
                      dataCaption="Valores">
  <location ref="A4:F${endRow}" firstHeaderRow="1" firstDataRow="3" firstDataCol="1"/>
  <pivotFields count="5">
    <!-- 0: Cliente (Fila) -->
    <pivotField axis="axisRow" showAll="0"/>
    <!-- 1: WR (Métrica) -->
    <pivotField dataField="1" showAll="0"/>
    <!-- 2: Tracking (Sin asignar) -->
    <pivotField showAll="0"/>
    <!-- 3: Peso (kg) (Métrica) -->
    <pivotField dataField="1" showAll="0"/>
    <!-- 4: Tipo de paquete (Columna) -->
    <pivotField axis="axisColumn" showAll="0"/>
  </pivotFields>
  <rowFields count="1">
    <field x="0"/>
  </rowFields>
  <colFields count="2">
    <field x="4"/>
    <field x="-2"/>
  </colFields>
  <dataFields count="2">
    <dataField name="Cuenta de WR" fld="1" subtotal="count"/>
    <dataField name="Suma de Peso (kg)" fld="3" subtotal="sum"/>
  </dataFields>
  <pivotTableStyleInfo name="PivotStyleLight16" showRowHeaders="1" showColHeaders="1" showRowStripes="1" showColStripes="0" showLastColumn="1"/>
</pivotTableDefinition>`;
}

function buildPivotTable1RelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheDefinition" Target="../pivotCache/pivotCacheDefinition1.xml"/>
</Relationships>`;
}

// ---------------------------------------------------------------------------
// Exportación principal
// ---------------------------------------------------------------------------

/**
 * Genera el archivo .xlsx con JSZip conteniendo las 4 hojas, gráfico nativo
 * y tabla dinámica con refreshOnLoad="1".
 */
export async function buildEnAlmacenReport(paquetes: Paquete[]): Promise<Blob> {
  const rows = selectEnAlmacen(paquetes);
  if (rows.length === 0) {
    throw new Error('No hay paquetes con Estado AMEX = "En Almacén" o "Recibido" para exportar.');
  }

  const summary = buildClientSummary(rows);
  const zip = new JSZip();

  // 1. [Content_Types].xml
  zip.file('[Content_Types].xml', buildContentTypesXml());

  // 2. _rels/.rels
  zip.file('_rels/.rels', buildPackageRelsXml());

  // 3. xl/workbook.xml y sus rels
  zip.file('xl/workbook.xml', buildWorkbookXml());
  zip.file('xl/_rels/workbook.xml.rels', buildWorkbookRelsXml());

  // 4. xl/styles.xml
  zip.file('xl/styles.xml', buildStylesXml());

  // 5. Worksheets
  zip.file('xl/worksheets/sheet1.xml', buildSheet1Xml(rows, summary));
  zip.file('xl/worksheets/_rels/sheet1.xml.rels', buildSheet1RelsXml());

  zip.file('xl/worksheets/sheet2.xml', buildSheet2Xml(rows, summary));

  zip.file('xl/worksheets/sheet3.xml', buildSheet3Xml());
  zip.file('xl/worksheets/_rels/sheet3.xml.rels', buildSheet3RelsXml());

  zip.file('xl/worksheets/sheet4.xml', buildSheet4Xml(rows));

  // 6. Drawings y Chart
  zip.file('xl/drawings/drawing1.xml', buildDrawing1Xml());
  zip.file('xl/drawings/_rels/drawing1.xml.rels', buildDrawing1RelsXml());
  zip.file('xl/charts/chart1.xml', buildChart1Xml(summary));

  // 7. Pivot Cache y Pivot Table
  zip.file('xl/pivotCache/pivotCacheDefinition1.xml', buildPivotCacheDefinitionXml(rows));
  zip.file('xl/pivotCache/_rels/pivotCacheDefinition1.xml.rels', buildPivotCacheDefinitionRelsXml());
  zip.file('xl/pivotCache/pivotCacheRecords1.xml', buildPivotCacheRecordsXml(rows));

  zip.file('xl/pivotTables/pivotTable1.xml', buildPivotTable1Xml(rows));
  zip.file('xl/pivotTables/_rels/pivotTable1.xml.rels', buildPivotTable1RelsXml());

  // Generar el paquete ZIP binario
  const zipBytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return new Blob([zipBytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/**
 * Función disparada desde la interfaz que construye el reporte dinámico
 * y ejecuta la descarga a disco a través de FileSaver.
 */
export async function exportEnAlmacenPivotReport(paquetes: Paquete[]): Promise<void> {
  const blob = await buildEnAlmacenReport(paquetes);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `Reporte_Dinamico_En_Almacen_AMEX_${dateStr}.xlsx`;
  saveAs(blob, filename);
}
