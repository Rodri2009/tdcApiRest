const metrics = require('../lib/metrics');
const { validateCurrentUrl } = require('../lib/urlValidator');

/**
 * Extrae todas las transacciones de MP paginando
 * @param {Page} page - Puppeteer page
 * @param {Date} startDate - Fecha desde (ej: fecha_apertura de caja)
 * @param {Date} endDate - Fecha hasta (ej: fecha_cierre o ahora)
 * @returns {Array} Lista de transacciones
 */
async function scrapeAllMPTransactions(page, startDate, endDate) {
    try {
        console.log(`[MPTransactionImport] 🔄 Extrayendo transacciones desde ${startDate.toISOString()} hasta ${endDate.toISOString()}`);

        // Validar que estamos en activities
        const urlValidation = await validateCurrentUrl(page, '/activities');
        if (!urlValidation.valid) {
            throw new Error(`URL validation failed: ${urlValidation.reason}`);
        }

        let allTransactions = [];
        let pageCount = 0;
        let hasNextPage = true;

        while (hasNextPage && pageCount < 20) { // Max 20 páginas (500 transacciones)
            pageCount++;
            console.log(`[MPTransactionImport] 📄 Extrayendo página ${pageCount}...`);

            // Extraer transacciones de la página actual
            const pageTransactions = await page.evaluate(() => {
                const transactions = [];

                // Selector para cada fila de transacción
                const rows = document.querySelectorAll('[data-test-id*="activity-row"], [role="row"]');

                rows.forEach((row, idx) => {
                    try {
                        // Extraer datos del row
                        const text = row.innerText || row.textContent || '';

                        // Intentar extraer campos
                        const titleEl = row.querySelector('[data-test-id*="title"], .title, [class*="title"]');
                        const amountEl = row.querySelector('[data-test-id*="amount"], .amount, [class*="amount"]');
                        const dateEl = row.querySelector('[data-test-id*="date"], .date, [class*="date"]');

                        if (titleEl || text.length > 0) {
                            transactions.push({
                                id: `mp-${Date.now()}-${idx}`,
                                title: titleEl?.textContent?.trim() || text.substring(0, 50),
                                amount: amountEl?.textContent?.trim() || '',
                                date: dateEl?.textContent?.trim() || '',
                                fullText: text,
                                rowIndex: idx
                            });
                        }
                    } catch (e) {
                        console.warn(`[MPTransactionImport] Error extrayendo row ${idx}:`, e.message);
                    }
                });

                return transactions;
            });

            console.log(`[MPTransactionImport] ✅ Página ${pageCount}: ${pageTransactions.length} transacciones`);
            allTransactions = allTransactions.concat(pageTransactions);

            // Verificar si hay página siguiente
            const nextPageBtn = await page.$('#_R_2nll2e_');
            if (nextPageBtn) {
                // Verificar si el botón está habilitado
                const isDisabled = await page.evaluate(() => {
                    const btn = document.querySelector('#_R_2nll2e_');
                    return btn?.disabled || btn?.getAttribute('aria-disabled') === 'true';
                });

                if (!isDisabled) {
                    console.log(`[MPTransactionImport] ➡️ Clickeando página siguiente...`);
                    await nextPageBtn.click();
                    // Esperar a que cargue la siguiente página
                    await page.waitForTimeout(2000);
                } else {
                    hasNextPage = false;
                    console.log(`[MPTransactionImport] ⏹️ Última página alcanzada`);
                }
            } else {
                hasNextPage = false;
                console.log(`[MPTransactionImport] ⏹️ No hay botón siguiente`);
            }
        }

        console.log(`[MPTransactionImport] ✅ Total extraído: ${allTransactions.length} transacciones en ${pageCount} páginas`);
        return allTransactions;

    } catch (err) {
        console.error('[MPTransactionImport] ❌ Error:', err.message);
        throw err;
    }
}

/**
 * Importa transacciones de MP a movimientos_caja
 * @param {Object} db - Conexión a BD
 * @param {number} cajaId - ID de la caja
 * @param {Array} transactions - Transacciones a importar
 * @returns {Object} Resumen de importación
 */
async function importTransactionsToCaja(db, cajaId, transactions) {
    try {
        console.log(`[MPTransactionImport] 💾 Importando ${transactions.length} transacciones a caja ${cajaId}...`);

        let imported = 0;
        let failed = 0;

        for (const trans of transactions) {
            try {
                // Extraer monto
                const montoMatch = trans.amount.match(/[\d.,]+/);
                const monto = montoMatch ? parseFloat(montoMatch[0].replace(',', '')) : 0;

                if (monto <= 0) continue; // Ignorar transacciones sin monto

                // Determinar tipo (ingreso/egreso)
                const tipo = trans.title.toLowerCase().includes('cobr') ||
                    trans.title.toLowerCase().includes('ingr') ? 'ingreso' : 'egreso';

                // Insertar en BD
                const insertQuery = `
                    INSERT INTO movimientos_caja 
                    (id_caja, tipo, categoria, descripcion, monto, metodo_pago, creado_en)
                    VALUES (?, ?, 'mercadopago', ?, ?, 'mercadopago', NOW())
                `;

                await db.query(insertQuery, [
                    cajaId,
                    tipo,
                    trans.title || 'Transacción MP',
                    monto
                ]);

                imported++;
            } catch (err) {
                console.warn(`[MPTransactionImport] ⚠️ Error importando transacción:`, err.message);
                failed++;
            }
        }

        console.log(`[MPTransactionImport] ✅ Importación completada: ${imported} éxito, ${failed} errores`);

        return {
            success: true,
            imported,
            failed,
            total: transactions.length
        };

    } catch (err) {
        console.error('[MPTransactionImport] ❌ Error en importación:', err.message);
        throw err;
    }
}

module.exports = {
    scrapeAllMPTransactions,
    importTransactionsToCaja
};
