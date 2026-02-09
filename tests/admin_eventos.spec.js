const { test, expect } = require('@playwright/test');

test('crear evento por API y verificar en UI, luego eliminar', async ({ page, request }) => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';

  // 1) Login y obtener token por API
  const loginRes = await request.post('/api/auth/login', { data: { email: 'rodrigo@rodrigo', password: 'rodrigo' } });
  expect(loginRes.ok()).toBeTruthy();
  const loginJson = await loginRes.json();
  const token = loginJson.token;
  expect(token).toBeTruthy();

  // 2) Crear evento por API
  const ts = Date.now();
  const name = `E2E-Event-${ts}`;
  const fecha = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  const createRes = await request.post('/api/admin/eventos_confirmados', {
    data: {
      nombre_banda: name,
      fecha,
      hora_inicio: '21:00',
      descripcion: 'E2E test',
      genero_musical: 'E2E-Genre',
      nombre_contacto: 'E2E',
    }, headers: { Authorization: `Bearer ${token}` }
  });
  expect(createRes.ok()).toBeTruthy();
  const createJson = await createRes.json();
  const eventId = createJson.id;
  expect(eventId).toBeGreaterThan(0);

  // 3) Set token in localStorage then navigate to the page
  await page.addInitScript(token => {
    localStorage.setItem('authToken', token);
  }, token);

  await page.goto('/admin_eventos_confirmados.html');

  // 4) Verify row with event name appears
  const rowSelector = `text=${name}`;
  await page.waitForSelector(rowSelector, { timeout: 5000 });
  const row = page.locator(`tr:has-text("${name}")`);
  await expect(row).toBeVisible();

  // 5) Verify Assign link points to asignar_personal with ev_<id>
  const assignLink = row.locator(`a[href*="asignar_personal.html?solicitudId=ev_${eventId}"]`);
  await expect(assignLink).toBeVisible();

  // 6) Click Cancel (and accept dialog), then verify CANCELADO badge appears
  page.on('dialog', async dialog => { await dialog.accept(); });
  const cancelBtn = row.locator('button:has-text("Cancelar")');
  await cancelBtn.click();

  // Wait for the badge
  await expect(row.locator('text=CANCELADO')).toBeVisible();

  // 7) Cleanup - delete by API
  await request.delete(`/api/admin/eventos_confirmados/${eventId}`, { headers: { Authorization: `Bearer ${token}` } });

  // 8) Verify row no longer visible
  await page.reload();
  await expect(page.locator(`tr:has-text("${name}")`)).toHaveCount(0);
});
