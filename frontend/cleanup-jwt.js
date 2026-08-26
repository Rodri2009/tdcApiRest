/**
 * SCRIPT DE LIMPIEZA DE JWT - Ejecutar en consola: F12 → Console
 * 
 * Limpia todo el almacenamiento y fuerza logout + redirect a login
 */

(async function cleanJWTStorage() {
    console.log('%c╔════════════════════════════════════════╗', 'color: #FF6B6B; font-weight: bold; font-size: 12px;');
    console.log('%c║  🔄 LIMPIEZA DE AUTENTICACIÓN INICIADA  ║', 'color: #FF6B6B; font-weight: bold; font-size: 12px;');
    console.log('%c╚════════════════════════════════════════╝', 'color: #FF6B6B; font-weight: bold; font-size: 12px;');
    
    try {
        // 1. localStorage
        console.log('%c1️⃣  Limpiando localStorage...', 'color: #4ECDC4; font-weight: bold;');
        const lsKeys = Object.keys(localStorage);
        console.log(`   Removiendo ${lsKeys.length} items:`, lsKeys);
        localStorage.clear();
        console.log('%c   ✓ localStorage limpiado', 'color: #2ECC71;');
        
        // 2. sessionStorage
        console.log('%c2️⃣  Limpiando sessionStorage...', 'color: #4ECDC4; font-weight: bold;');
        const ssKeys = Object.keys(sessionStorage);
        console.log(`   Removiendo ${ssKeys.length} items:`, ssKeys);
        sessionStorage.clear();
        console.log('%c   ✓ sessionStorage limpiado', 'color: #2ECC71;');
        
        // 3. Cookies
        console.log('%c3️⃣  Eliminando cookies...', 'color: #4ECDC4; font-weight: bold;');
        const deletedCookies = [];
        document.cookie.split(";").forEach((c) => {
            const cookieName = c.split("=")[0].trim();
            if (cookieName) {
                document.cookie = cookieName + `=;expires=${new Date(0).toUTCString()};path=/;SameSite=Lax`;
                deletedCookies.push(cookieName);
            }
        });
        console.log(`   Eliminadas cookies: ${deletedCookies.join(', ') || 'ninguna'}`);
        console.log('%c   ✓ Cookies eliminadas', 'color: #2ECC71;');
        
        // 4. IndexedDB
        console.log('%c4️⃣  Limpiando IndexedDB...', 'color: #4ECDC4; font-weight: bold;');
        try {
            if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
                const dbs = await indexedDB.databases();
                console.log(`   Bases de datos encontradas: ${dbs.length}`);
                dbs.forEach(db => {
                    indexedDB.deleteDatabase(db.name);
                    console.log(`   ✓ Eliminada: ${db.name}`);
                });
            } else {
                console.log('   ℹ️  IndexedDB no disponible en este navegador');
            }
        } catch (e) {
            console.warn('   ⚠️  Error limpiando IndexedDB:', e.message);
        }
        console.log('%c   ✓ IndexedDB limpiado', 'color: #2ECC71;');
        
        // 5. Service Workers (si existen)
        console.log('%c5️⃣  Verificando Service Workers...', 'color: #4ECDC4; font-weight: bold;');
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            console.log(`   Service Workers encontrados: ${registrations.length}`);
            for (const registration of registrations) {
                await registration.unregister();
                console.log(`   ✓ Service Worker desregistrado`);
            }
        }
        console.log('%c   ✓ Service Workers limpiados', 'color: #2ECC71;');
        
        // 6. Cache Storage
        console.log('%c6️⃣  Limpiando Cache Storage...', 'color: #4ECDC4; font-weight: bold;');
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                console.log(`   Caches encontrados: ${cacheNames.length}`);
                for (const name of cacheNames) {
                    await caches.delete(name);
                    console.log(`   ✓ Cache eliminado: ${name}`);
                }
            }
        } catch (e) {
            console.warn('   ⚠️  Error limpiando caches:', e.message);
        }
        console.log('%c   ✓ Cache Storage limpiado', 'color: #2ECC71;');
        
        // Status final
        console.log('%c╔════════════════════════════════════════╗', 'color: #2ECC71; font-weight: bold; font-size: 12px;');
        console.log('%c║  ✅ LIMPIEZA COMPLETADA CORRECTAMENTE  ║', 'color: #2ECC71; font-weight: bold; font-size: 12px;');
        console.log('%c╚════════════════════════════════════════╝', 'color: #2ECC71; font-weight: bold; font-size: 12px;');
        console.log('%c\nRedirigiendo a login en 3 segundos...', 'color: #F39C12; font-size: 14px; font-weight: bold;');
        console.log('%cAhora deberás hacer LOGIN NUEVO para obtener JWT actualizado con id_cliente=4', 'color: #667eea; font-size: 12px; font-style: italic;');
        
        // Redirect
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 3000);
        
    } catch (error) {
        console.error('%c❌ ERROR DURANTE LA LIMPIEZA:', 'color: #FF6B6B; font-weight: bold;', error);
    }
})();
