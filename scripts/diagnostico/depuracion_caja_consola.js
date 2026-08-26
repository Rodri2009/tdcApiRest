// DEBUG: Persistencia de Caja
// Copiar y pegar esto en la consola del navegador (F12) mientras estás en admin_transacciones.html

const d = window._cajaDebug;  // Alias corto para acceso fácil

console.log('=== ESTADO DE CAJA Y TRANSACCIONES ===');
console.log('cajaAbierta:', d.cajaAbierta);
console.log('_cajaAbiertaId:', d._cajaAbiertaId);
console.log('cajaMovimientos.length:', d.cajaMovimientos?.length ?? 'undefined');
console.log('allTransactions.length:', d.allTransactions?.length ?? 'undefined');
console.log('');

if (d.cajaAbierta) {
    console.log('✅ CAJA ABIERTA DETECTADA');
    console.log('Movimientos en caja:', d.cajaMovimientos?.length ?? 0);
    if (d.cajaMovimientos && d.cajaMovimientos.length > 0) {
        console.log('Primer movimiento:', d.cajaMovimientos[0]);
    }
} else {
    console.log('❌ NO HAY CAJA ABIERTA');
    console.log('Transacciones MP cargadas:', d.allTransactions?.length ?? 0);
    if (d.allTransactions && d.allTransactions.length > 0) {
        console.log('Primera transacción:', d.allTransactions[0]);
    }
}

console.log('');
console.log('=== TOKEN Y USUARIO ===');
console.log('authToken disponible:', !!d.authToken);
console.log('localStorage.authToken disponible:', !!localStorage.getItem('authToken'));

// Decodificar JWT para ver payload
const token = d.authToken || localStorage.getItem('authToken');
if (token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('JWT Payload:', payload);
        console.log('Usuario ID:', payload.id_usuario || payload.id);
    } catch (e) {
        console.error('No se pudo decodificar JWT:', e.message);
    }
}

console.log('');
console.log('=== ELEMENTOS DEL DOM ===');
console.log('btnAbrirCaja visible:', !document.getElementById('btn-abrir-caja')?.classList.contains('hidden'));
console.log('btnCerrarCaja visible:', !document.getElementById('btn-cerrar-caja')?.classList.contains('hidden'));
console.log('Número de filas de transacciones rendereadas:', document.querySelectorAll('table tbody tr')?.length ?? 0);

console.log('');
console.log('=== PASOS SIGUIENTES ===');
console.log('1. Si cajaAbierta = true y cajaMovimientos.length > 0 pero no se ve en página:');
console.log('   → Problema en renderTransactions() o CSS. Revisa console.log anterior a renderTransactions');
console.log('');
console.log('2. Si cajaAbierta = true pero cajaMovimientos.length = 0:');
console.log('   → API /api/cajas/activa no retorna movimientos. Ver Network tab en DevTools');
console.log('');
console.log('3. Si cajaAbierta = false cuando debería ser true:');
console.log('   → verificarCajaAbiertaReal() no detectó caja. Ver Network tab, respuesta de /api/cajas/activa');

console.log('');
console.log('=== ACCESO RÁPIDO ===');
console.log('Accede a las variables así:');
console.log('  window._cajaDebug.cajaAbierta');
console.log('  window._cajaDebug.cajaMovimientos');
console.log('  window._cajaDebug.allTransactions');

