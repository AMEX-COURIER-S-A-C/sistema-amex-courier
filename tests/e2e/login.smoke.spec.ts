import { expect, test } from '@playwright/test';

test('muestra el acceso seguro del sistema', async ({ page }) => {
  await page.goto('/login');

  await expect(
    page.getByRole('heading', { name: 'SISTEMA AMEX COURIER' })
  ).toBeVisible();
  await expect(page.getByPlaceholder('sistemaamexcourier@gmail.com')).toBeVisible();
  await expect(page.getByPlaceholder('••••••••')).toBeVisible();
});
