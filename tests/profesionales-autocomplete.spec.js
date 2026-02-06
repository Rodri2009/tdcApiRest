const { test, expect } = require('@playwright/test');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ci-admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test('Profesional: buscar cliente por autocompletar y asociar', async ({ page, request }) => {
  const loginResp = await request.post(`${BASE_URL}/api/auth/login`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  expect(loginResp.ok()).toBeTruthy();
  const loginJson = await loginResp.json();
  const token = loginJson.token;

  const ts = Date.now();
  const cliPayload = { nombre: `CliProfE2E-${ts}`, telefono: `115000${ts}`, email: `cliprof-${ts}@example.com` };
  const cliResp = await request.post(`${BASE_URL}/api/admin/clientes`, { data: cliPayload, headers: { Authorization: `Bearer ${token}` } });
  expect(cliResp.ok()).toBeTruthy();
  const cliJson = await cliResp.json();
  const clientId = cliJson.id;

  await page.goto(`${BASE_URL}/config_servicios.html`);
  await page.evaluate((tkn) => localStorage.setItem('authToken', tkn), token);
  await page.reload();

  await page.click('text=Profesionales');
  await page.click('text=Nuevo Profesional');

  const clientNamePart = cliPayload.nombre.slice(0, 6);
  await page.fill('#modal-nombre', clientNamePart);
  await page.waitForSelector('#modal-client-suggestions .suggestion');

  // Verify active suggestion
  await page.waitForSelector('#modal-client-suggestions .suggestion.active');
  const activeText = await page.$eval('#modal-client-suggestions .suggestion.active strong', el => el.textContent.trim());
  expect(activeText.toLowerCase()).toContain(clientNamePart.toLowerCase());

  await page.click('#modal-client-suggestions .suggestion');

  const clienteIdVal = await page.$eval('#profesional-cliente-id', el => el.value);
  expect(String(clienteIdVal)).toBe(String(clientId));
  const badgeText = await page.$eval('#modal-client-selected .client-badge .name', el => el.textContent.trim());
  expect(badgeText).toBe(cliPayload.nombre);

  // clear and ensure removed
  await page.click('#modal-client-selected .client-badge .clear-btn');
  await page.waitForTimeout(100);
  const removedVal = await page.$eval('#profesional-cliente-id', el => el.value);
  expect(removedVal).toBe('');

  // create professional without client
  const profName = `ProfE2E-${ts}`;
  await page.fill('#modal-nombre', profName);
  await page.fill('#modal-especialidad', 'Masajes');
  await page.click('#modal-save-btn');

  await page.waitForTimeout(500);

  const listResp = await request.get(`${BASE_URL}/api/servicios/profesionales/lista`);
  expect(listResp.ok()).toBeTruthy();
  const profs = await listResp.json();
  const found = profs.find(p => p.nombre === profName);
  expect(found).toBeTruthy();
});