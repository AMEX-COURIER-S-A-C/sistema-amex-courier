import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const baseUrl = process.env.PLAYWRIGHT_BASE_URL;

test('valida autenticación y contratos críticos en entorno remoto sin mutar datos', async ({ page }) => {
  test.skip(
    !baseUrl || !email || !password,
    'Define PLAYWRIGHT_BASE_URL, E2E_EMAIL y E2E_PASSWORD para ejecutar la validación remota.'
  );

  await page.goto('/login');
  await page.getByPlaceholder('sistemaamexcourier@gmail.com').fill(email!);
  await page.getByPlaceholder('••••••••').fill(password!);
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await page.waitForURL(/\/dashboard(?:\/|$)/, { timeout: 30_000 });

  const meResponse = await page.request.get('/api/auth/me');
  expect(meResponse.status()).toBe(200);
  expect(meResponse.headers()['x-request-id']).toBeTruthy();
  expect(meResponse.headers()['x-correlation-id']).toBeTruthy();
  expect(meResponse.headers()['x-contract-version']).toBe('v1');

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
