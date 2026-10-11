import { describe, expect, it } from 'vitest';
import { ApiErrorSchema, apiError } from '@/lib/contracts/api';
import { API_CONTRACT_VERSION } from '@/lib/observability/request-context';
import { BatchSyncScannerSchema } from '@/lib/validations/scanner.schema';
import { CreateInventarioJobSchema } from '@/lib/validations/inventario-jobs.schema';

describe('API contracts', () => {
  it('emits a backwards-compatible versioned error envelope', async () => {
    const response = apiError('VALIDATION_ERROR', 'Datos inválidos.', 'req-test', 400, [
      { field: 'items', message: 'Requerido' },
    ]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('x-request-id')).toBe('req-test');
    expect(response.headers.get('x-contract-version')).toBe(API_CONTRACT_VERSION);
    expect(ApiErrorSchema.parse(body)).toMatchObject({
      ok: false,
      error: 'Datos inválidos.',
      code: 'VALIDATION_ERROR',
      requestId: 'req-test',
      contractVersion: API_CONTRACT_VERSION,
    });
  });

  it('validates the scanner boundary before processing a batch', () => {
    expect(() => BatchSyncScannerSchema.parse({ items: [] })).toThrow();

    expect(
      BatchSyncScannerSchema.parse({
        items: [{ id: 'scan-1', code: 'WR123', workflow: 'slotting' }]
      }).items
    ).toHaveLength(1);
  });

  it('applies defaults to inventory job requests', () => {
    expect(CreateInventarioJobSchema.parse({})).toMatchObject({
      origen_inventario: 'db',
      usar_tib_diario: false,
      sincronizar_db: true
    });
  });
});
