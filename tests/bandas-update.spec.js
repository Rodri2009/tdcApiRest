const { test, expect } = require('@playwright/test');

test('editar banda (UI) — agregar instrumento y verificar refresco inmediato', async ({ page, request }) => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';

  // 1) Login por API y obtener token
  const loginRes = await request.post('/api/auth/login', { data: { email: 'rodrigo@rodrigo', password: 'rodrigo' } });
  expect(loginRes.ok()).toBeTruthy();
  const { token } = await loginRes.json();
  expect(token).toBeTruthy();

  // 2) Crear una banda de prueba por API (limpia y determinista)
  const createRes = await request.post('/api/bandas', {
    data: {
      nombre: `E2E-Banda-${Date.now()}`,
      genero_musical: 'E2E-Genre',
      contacto_nombre: 'E2E Test',
      contacto_email: `e2e+${Date.now()}@example.test`
    },
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(createRes.ok()).toBeTruthy();
  const { id: bandaId } = await createRes.json();
  expect(bandaId).toBeTruthy();

  // 3) Insertar un instrumento disponible (asegurar catálogo existe)
  const instRes = await request.get('/api/bandas/instrumentos');
  expect(instRes.ok()).toBeTruthy();
  const insts = await instRes.json();
  expect(Array.isArray(insts)).toBeTruthy();
  const instrumentoNombre = insts.length > 0 ? insts[0].nombre : 'Guitarra eléctrica';

  // 4) Preconfigurar token en localStorage y abrir la página con ?id=<bandaId>
  await page.addInitScript(token => { localStorage.setItem('authToken', token); }, token);
  await page.goto(`/solicitud_banda.html?id=${encodeURIComponent(bandaId)}`);

  // 5) Esperar que el nombre de la banda aparezca en el input
  await page.waitForSelector('#nombre_banda');
  await expect(page.locator('#nombre_banda')).toHaveValue(/E2E-Banda-/);

  // 6) Esperar que el select de instrumentos esté poblado y seleccionar el instrumento
  await page.waitForSelector('#instrumento-select option:not([value=""])');
  await page.selectOption('#instrumento-select', { label: instrumentoNombre });
  await page.fill('#instrumento-cantidad', '1');
  await page.click('#add-instrumento');

  // 7) Verificar que el elemento se añadió a la lista de formación en la UI
  await expect(page.locator('#formacion-list')).toContainText(instrumentoNombre);

  // 8) Click en actualizar (submitBtn) y esperar notificación de éxito
  await page.click('#submitBtn');
  // Esperar que el botón muestre texto de actualización y luego la notificación
  await page.waitForTimeout(500); // pequeño delay para que el request se dispare
  await expect(page.locator('#notification-banner')).toHaveText(/Banda actualizada exitosamente|Banda registrada exitosamente/i, { timeout: 5000 });

  // 9) Verificar via API que la banda tiene la formación nueva
  const getRes = await request.get(`/api/bandas/${bandaId}`);
  expect(getRes.ok()).toBeTruthy();
  const banda = await getRes.json();
  expect(Array.isArray(banda.formacion) || Array.isArray(banda.integrantes)).toBeTruthy();
  const found = (banda.formacion || banda.integrantes || []).some(f => (f.instrumento || '').toLowerCase().includes(instrumentoNombre.toLowerCase()));
  expect(found).toBeTruthy();

  // Cleanup: eliminar banda creada
  await request.delete(`/api/bandas/${bandaId}`, { headers: { Authorization: `Bearer ${token}` } });
});
