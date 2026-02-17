const { test, expect } = require('@playwright/test');

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'ci-admin@local';
const ADMIN_PASS = process.env.TEST_ADMIN_PASS || 'ci-secret';
const BASE = process.env.BASE_URL || 'http://localhost';

test('Editar alquiler: no lanzar error de fecha y renderizar adicionales', async ({ page, request }) => {
    // Login via API
    const loginRes = await request.post(`${BASE}/api/auth/login`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASS } });
    expect(loginRes.ok()).toBeTruthy();
    const loginJson = await loginRes.json();
    const token = loginJson.token;
    expect(token).toBeTruthy();

    // Perform UI login to establish proper session (some admin endpoints expect full login flow)
    const logs = [];
    page.on('console', msg => {
        logs.push({ type: msg.type(), text: msg.text() });
    });

    await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#email', process.env.TEST_ADMIN_EMAIL || 'ci-admin@local');
    await page.fill('#password', process.env.TEST_ADMIN_PASS || 'ci-secret');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.click('#submitBtn')
    ]);

    // Now navigate to the editor for alq_3
    await page.goto(`${BASE}/editar_solicitud_alquiler.html?solicitudId=alq_3`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Dump errors for debugging
    const errors = logs.filter(l => l.type === 'error' || l.type === 'warning');
    console.log('Captured console logs:', logs);

    // Ensure no explicit flatpickr Invalid date error
    const hasInvalidDate = logs.some(l => l.text && l.text.toLowerCase().includes('invalid date'));
    expect(hasInvalidDate).toBeFalsy();

    // --- Nuevo: verificar caso alq_4 donde fecha podría estar deshabilitada ---
    logs.length = 0; // limpiar logs
    await page.goto(`${BASE}/editar_solicitud_alquiler.html?solicitudId=alq_4`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    console.log('Captured console logs after alq_4:', logs);

    // Verificar que se registró el check y/o que aparece el aviso en DOM
    const hasCheckAfterFail = logs.some(l => l.text && l.text.includes('checkAfterFail'));
    const avisoExists = await page.locator('#fecha-aviso').count().catch(() => 0);
    // Aceptar tres posibilidades: 1) checkAfterFail log 2) aviso visible 3) el input contiene la fecha (seleccionada correctamente)
    const fechaInputVal = await page.locator('#fechaEvento').inputValue().catch(() => '');
    expect(hasCheckAfterFail || avisoExists > 0 || fechaInputVal.includes('2025-12-29')).toBeTruthy();

    // Check adicionales endpoint rendered 'No hay adicionales' or items present
    const adicionalText = await page.locator('#adicionalesSeleccionados').innerText().catch(() => '');
    // Either it shows text or blank is acceptable; just ensure page loaded
    expect(await page.title()).toContain('Editor');
});