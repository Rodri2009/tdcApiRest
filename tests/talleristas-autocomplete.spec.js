const { test, expect } = require('@playwright/test');

// Use env vars ADMIN_EMAIL and ADMIN_PASSWORD to login/create admin
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ci-admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test('Tallerista: buscar cliente por autocompletar y asociar', async ({ page, request }) => {
  // 1) Ensure admin exists: call create-admin-ci logic via API by logging in; workflow ensures admin exists
  // 2) Login to get token
  const loginResp = await request.post(`${BASE_URL}/api/auth/login`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  expect(loginResp.ok()).toBeTruthy();
  const loginJson = await loginResp.json();
  const token = loginJson.token;

  // 3) Create client via API
  const ts = Date.now();
  const cliPayload = { nombre: `CliE2E-${ts}`, telefono: `115000${ts}`, email: `clie2e-${ts}@example.com` };
  const cliResp = await request.post(`${BASE_URL}/api/admin/clientes`, {
    data: cliPayload,
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(cliResp.ok()).toBeTruthy();
  const cliJson = await cliResp.json();
  const clientId = cliJson.id;

  // 4) Open the page and set auth token in localStorage
  await page.goto(`${BASE_URL}/config_talleres.html`);
  await page.evaluate((tkn) => localStorage.setItem('authToken', tkn), token);
  // reload so front-end picks up token for protected endpoints
  await page.reload();

  // 5) Open modal Nuevo Tallerista
  await page.click('text=Nuevo Tallerista');

  // 6) Type a substring into client search input and wait for suggestion
  const clientNamePart = cliPayload.nombre.slice(0, 6);
  await page.fill('#modal-client-search', clientNamePart);
  await page.waitForSelector('#modal-client-suggestions .suggestion');

  // 7) Click the first suggestion
  await page.click('#modal-client-suggestions .suggestion');

  // 8) Ensure the hidden cliente_id is set to the client id
  const clienteIdVal = await page.$eval('#tallerista-cliente-id', el => el.value);
  expect(String(clienteIdVal)).toBe(String(clientId));

  // 9) Fill tallerista name and save
  const tallerName = `TallerE2E-${ts}`;
  await page.fill('#modal-nombre', tallerName);
  await page.click('#modal-save-btn');

  // Wait for network and reload data
  await page.waitForTimeout(500);

  // 10) Verify via API that a tallerista exists with cliente_id = clientId and name = tallerName
  const tallerList = await request.get(`${BASE_URL}/api/talleres/talleristas/lista`);
  expect(tallerList.ok()).toBeTruthy();
  const talleres = await tallerList.json();
  const found = talleres.find(t => t.nombre === tallerName);
  expect(found).toBeTruthy();
  expect(String(found.cliente_id)).toBe(String(clientId));
});
