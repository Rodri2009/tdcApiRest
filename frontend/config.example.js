/**
 * TEMPLATE DE CONFIGURACIÓN - Renombra a config.js
 * 
 * PASOS:
 * 1. Copia este archivo: cp config.example.js config.js
 * 2. Reemplaza los valores REEMPLAZA_CON_... con tus credenciales reales
 * 3. NUNCA comitas config.js al repositorio (ya está en .gitignore)
 * 4. En otros ambientes (producción), deploya config.js como artifact separado
 */

const CONFIG = {
    // ============================================
    // GOOGLE OAUTH 2.0
    // ============================================
    // Obtén el Client ID aquí:
    // https://console.cloud.google.com/apis/credentials
    GOOGLE_CLIENT_ID: 'REEMPLAZA_CON_TU_CLIENT_ID_AQUI.apps.googleusercontent.com',
    // Ejemplo real: 123456789-abc123xyz.apps.googleusercontent.com
    
    // ============================================
    // FACEBOOK APP
    // ============================================
    // Obtén el App ID aquí:
    // https://developers.facebook.com/apps
    FACEBOOK_APP_ID: 'REEMPLAZA_CON_APP_ID',
    // Ejemplo real: 123456789012345
    
    // ============================================
    // API BACKEND
    // ============================================
    API_BASE: 'http://localhost:3000',
    API_AUTH: 'http://localhost:3000/api/auth',
    
    // En producción, cambiar a:
    // API_BASE: 'https://sudominio.com'
    // API_AUTH: 'https://sudominio.com/api/auth'
    
    // ============================================
    // RUTAS FRONTEND POST-AUTENTICACIÓN
    // ============================================
    REDIRECT_AFTER_LOGIN: '/index.html',
    REDIRECT_AFTER_OAUTH: '/index.html',
};

// ============================================
// VALIDACIONES (NO MODIFICAR)
// ============================================
const requiredConfig = ['GOOGLE_CLIENT_ID', 'FACEBOOK_APP_ID'];

requiredConfig.forEach(key => {
    if (CONFIG[key].includes('REEMPLAZA')) {
        console.warn(`⚠️ CONFIG.${key} no está configurado en config.js`);
        console.warn(`   Valor actual: ${CONFIG[key]}`);
        console.warn(`   Acción requerida: Actualiza config.js con credenciales reales`);
    }
});

// Log de configuración cargada (solo en desarrollo)
if (document.location.hostname === 'localhost' || document.location.hostname === '127.0.0.1') {
    console.log('✓ Configuración cargada (desarrollo)');
    console.log('  - Google Client ID:', CONFIG.GOOGLE_CLIENT_ID.substring(0, 30) + '...');
    console.log('  - API Base:', CONFIG.API_BASE);
}
