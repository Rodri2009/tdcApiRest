/**
 * navbar.js - Componente de navegación dinámico y reutilizable
 * Inyecta un navbar en las páginas según el estado de autenticación del usuario
 */

class NavbarManager {
    constructor() {
        this.isAuthenticated = false;
        this.userEmail = null;
        this.userRole = null;
        this.jwtToken = localStorage.getItem('authToken');
        
        if (this.jwtToken) {
            this.isAuthenticated = true;
            // Decodificar el JWT para obtener datos del usuario
            this.decodeJWT();
        }
    }

    /**
     * Decodifica el JWT sin verificar la firma (solo para leer datos en frontend)
     */
    decodeJWT() {
        try {
            const base64Url = this.jwtToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            const payload = JSON.parse(jsonPayload);
            this.userEmail = payload.email || payload.id || 'Usuario';
            this.userRole = payload.role || 'user';
        } catch (error) {
            console.error('Error decodificando JWT:', error);
            this.clearAuth();
        }
    }

    /**
     * Limpia los datos de autenticación
     */
    clearAuth() {
        this.isAuthenticated = false;
        this.userEmail = null;
        this.userRole = null;
        localStorage.removeItem('authToken');
    }

    /**
     * Cierra sesión del usuario
     */
    logout() {
        this.clearAuth();
        // Redirigir a login
        window.location.href = '/login.html';
    }

    /**
     * Genera el HTML de la barra de navegación
     */
    generateNavbarHTML() {
        // Inyectar estilos CSS si no existen
        if (!document.getElementById('navbar-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'navbar-styles';
            styleElement.textContent = `
                :root {
                    --color-primary: #581c87;
                    --color-secondary: #f0abfc;
                    --color-rustic: #44403c;
                }
                
                .text-neon {
                    color: var(--color-secondary);
                    text-shadow: 0 0 5px var(--color-secondary), 0 0 10px var(--color-secondary);
                }
                
                .bg-rustic {
                    background-color: var(--color-rustic);
                }
            `;
            document.head.appendChild(styleElement);
        }

        const logoHTML = `
            <a href="/index.html" class="flex items-center space-x-3">
                <img src="./img/logo_transparente.png" alt="El Templo de Claypole" class="h-10 w-auto">
                <span class="text-base font-semibold text-neon tracking-wide hidden sm:block">
                    El Templo de Claypole
                </span>
            </a>
        `;

        let authButtonsHTML;

        if (!this.isAuthenticated) {
            // Botón Login para usuarios no autenticados
            authButtonsHTML = `
                <a href="/login.html" 
                   class="px-4 py-2 rounded-full font-semibold bg-fuchsia-500 text-gray-900 hover:bg-fuchsia-400 transition duration-150">
                    Login
                </a>
            `;
        } else {
            // Dropdown de admin para usuarios autenticados
            authButtonsHTML = `
                <div class="relative group">
                    <!-- Botón Admin -->
                    <button class="px-4 py-2 rounded-full font-semibold bg-emerald-500 text-gray-900 hover:bg-emerald-400 transition duration-150 flex items-center gap-2">
                        <span>🔐 Admin</span>
                        <span class="text-xs hidden md:inline">${this.userEmail}</span>
                        <svg class="w-4 h-4 transition group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                        </svg>
                    </button>

                    <!-- Dropdown Menu -->
                    <div class="absolute right-0 mt-0 w-48 bg-stone-800 rounded-lg shadow-xl border border-emerald-500 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div class="p-4 border-b border-stone-700">
                            <p class="text-xs text-stone-400">Sesión activa como:</p>
                            <p class="text-sm font-semibold text-white truncate">${this.userEmail}</p>
                        </div>

                        <nav class="py-2">
                            <a href="/admin.html" 
                               class="block px-4 py-2 text-sm text-stone-300 hover:bg-emerald-600 hover:text-white transition">
                                📋 Panel Principal
                            </a>
                            <a href="/admin_solicitudes.html" 
                               class="block px-4 py-2 text-sm text-stone-300 hover:bg-emerald-600 hover:text-white transition">
                                📝 Solicitudes
                            </a>
                            <a href="/admin_personal.html" 
                               class="block px-4 py-2 text-sm text-stone-300 hover:bg-emerald-600 hover:text-white transition">
                                👥 Personal
                            </a>
                            <a href="/admin_usuarios.html" 
                               class="block px-4 py-2 text-sm text-stone-300 hover:bg-emerald-600 hover:text-white transition">
                                 Usuarios
                            </a>
                        </nav>

                        <div class="border-t border-stone-700 p-2">
                            <button onclick="navbarManager.logout()" 
                                    class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900 hover:text-white transition rounded">
                                🚪 Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <header class="bg-rustic sticky top-0 z-50 shadow-lg">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        ${logoHTML}
                        ${authButtonsHTML}
                    </div>
                </div>
            </header>
        `;
    }

    /**
     * Inyecta el navbar en la página
     * @param {string} selector - Selector CSS donde inyectar el navbar (ej: 'body')
     */
    injectNavbar(selector = 'body') {
        const container = document.querySelector(selector);
        if (!container) {
            console.error(`No se encontró elemento con selector: ${selector}`);
            return;
        }

        const navbarHTML = this.generateNavbarHTML();
        container.insertAdjacentHTML('afterbegin', navbarHTML);
        
    }

    /**
     * Protege una página admin: redirige a login si no está autenticado
     */
    protectAdminPage() {
        if (!this.isAuthenticated) {
            console.warn('Acceso denegado: usuario no autenticado');
            window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        return true;
    }

    /**
     * Verifica si el usuario es admin
     */
    isAdmin() {
        return this.isAuthenticated && this.userRole === 'admin';
    }
}

/**
 * IMPORTANTE: Este archivo NO se auto-inicializa.
 * Cada página debe instanciar NavbarManager explícitamente.
 * 
 * Uso en páginas admin:
 *   <script src="/navbar.js"></script>
 *   <script>
 *     document.addEventListener('DOMContentLoaded', () => {
 *       const navbar = new NavbarManager();
 *       navbar.protectAdminPage();
 *       navbar.injectNavbar('body');
 *     });
 *   </script>
 */
