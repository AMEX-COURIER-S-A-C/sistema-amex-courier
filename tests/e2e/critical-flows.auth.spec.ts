import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test('mantiene el contrato de scanner e inventario después de autenticarse', async ({ page }) => {
  test.skip(
    !email || !password,
    'Define E2E_EMAIL y E2E_PASSWORD para ejecutar el flujo contra un entorno de prueba.'
  );

  await page.goto('/login');
  await page.getByPlaceholder('sistemaamexcourier@gmail.com').fill(email!);
  await page.getByPlaceholder('••••••••').fill(password!);
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await page.waitForURL(/\/dashboard(?:\/|$)/, { timeout: 30_000 });

  const inventoryResponse = await page.request.get('/api/inventario-jobs');
  expect(inventoryResponse.status()).toBe(200);
  expect(inventoryResponse.headers()['x-request-id']).toBeTruthy();
  expect(inventoryResponse.headers()['x-correlation-id']).toBeTruthy();
  expect(inventoryResponse.headers()['x-contract-version']).toBe('v1');

  const scannerResponse = await page.request.get('/api/scanner/batch-sync');
  expect(scannerResponse.status()).not.toBe(401);
  expect(scannerResponse.headers()['x-request-id']).toBeTruthy();
  expect(scannerResponse.headers()['x-contract-version']).toBe('v1');
});
