/**
 * navbar.js - Componente de navegación dinámico y reutilizable
 * Inyecta un navbar en las páginas según el estado de autenticación del usuario
 * Soporta sistema de roles y permisos
 */

class NavbarManager {
    constructor() {
        this.isAuthenticated = false;
        this.userEmail = null;
        this.userRole = null;
        this.userRoles = [];
        this.userPermisos = [];
        this.userNivel = 0;
        this.jwtToken = localStorage.getItem('authToken');

        if (this.jwtToken) {
            this.isAuthenticated = true;
            // Decodificar el JWT para obtener datos del usuario
            this.decodeJWT();
            // Guardar datos en localStorage para acceso rápido
            localStorage.setItem('userPermisos', JSON.stringify(this.userPermisos));
            localStorage.setItem('userRoles', JSON.stringify(this.userRoles));
            localStorage.setItem('userRole', this.userRole);
            localStorage.setItem('userEmail', this.userEmail);
            localStorage.setItem('userNivel', this.userNivel);
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
            this.userRoles = payload.roles || [];
            this.userPermisos = payload.permisos || [];
            this.userNivel = payload.nivel || 0;
        } catch (error) {
            console.error('Error decodificando JWT:', error);
            this.clearAuth();
        }
    }

    /**
     * Verifica si el usuario tiene un permiso específico
     */
    tienePermiso(permiso) {
        // SUPER_ADMIN o admin tienen todos los permisos
        if (this.userRoles.includes('SUPER_ADMIN') || this.userRoles.includes('admin')) return true;
        return this.userPermisos.includes(permiso);
    }

    /**
     * Verifica si el usuario tiene alguno de los permisos
     */
    tieneAlgunPermiso(permisos) {
        if (this.userRoles.includes('SUPER_ADMIN') || this.userRoles.includes('admin')) return true;
        return permisos.some(p => this.userPermisos.includes(p));
    }

    /**
     * Verifica si el usuario tiene un rol específico
     */
    tieneRol(rol) {
        return this.userRoles.includes(rol);
    }

    /**
     * Verifica si el usuario tiene nivel mínimo
     */
    tieneNivel(nivelMinimo) {
        return this.userNivel >= nivelMinimo;
    }

    /**
     * Limpia los datos de autenticación
     */
    clearAuth() {
        this.isAuthenticated = false;
        this.userEmail = null;
        this.userRole = null;
        this.userRoles = [];
        this.userPermisos = [];
        this.userNivel = 0;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userPermisos');
        localStorage.removeItem('userRoles');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userNivel');
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
            // Generar menú dinámico según permisos
            const menuItems = this.generateMenuItems();

            // Determinar color del botón según nivel
            let btnColor = 'bg-gray-500 hover:bg-gray-400';
            if (this.userNivel >= 100) btnColor = 'bg-purple-600 hover:bg-purple-500';
            else if (this.userNivel >= 75) btnColor = 'bg-emerald-500 hover:bg-emerald-400';
            else if (this.userNivel >= 50) btnColor = 'bg-cyan-500 hover:bg-cyan-400';
            else if (this.userNivel >= 25) btnColor = 'bg-gray-500 hover:bg-gray-400';

            // Obtener rol principal para mostrar
            const rolPrincipal = this.userRoles[0] || 'Usuario';
            const rolEmoji = this.getRolEmoji(rolPrincipal);

            authButtonsHTML = `
                <div class="relative" id="admin-dropdown-container">
                    <!-- Botón Admin -->
                    <button id="admin-dropdown-btn" class="px-4 py-2 rounded-full font-semibold ${btnColor} text-gray-900 transition duration-150 flex items-center gap-2">
                        <span>${rolEmoji} ${this.formatRolName(rolPrincipal)}</span>
                        <svg id="admin-dropdown-arrow" class="w-4 h-4 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="transform: rotate(0deg);">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                        </svg>
                    </button>

                    <!-- Dropdown Menu -->
                    <div id="admin-dropdown-menu" class="absolute right-0 mt-0 w-56 bg-stone-800 rounded-lg shadow-xl border border-emerald-500 transition-all duration-200 z-50" style="display: none; opacity: 0; visibility: hidden;">
                        <div class="p-4 border-b border-stone-700">
                            <p class="text-xs text-stone-400">Sesión activa como:</p>
                            <p class="text-sm font-semibold text-white truncate">${this.userEmail}</p>
                            <p class="text-xs text-stone-500 mt-1">${this.userRoles.join(', ') || 'Sin rol'}</p>
                        </div>

                        <nav class="py-2">
                            ${menuItems}
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
     * Genera los items del menú según permisos del usuario
     */
    generateMenuItems() {
        const items = [];

        // Panel Principal - todos los autenticados
        items.push(this.menuItem('/admin.html', '📋', 'Panel Principal'));

        // Solicitudes
        if (this.tienePermiso('solicitudes.ver')) {
            items.push(this.menuItem('/admin_solicitudes.html', '📝', 'Solicitudes'));
            // Eventos confirmados (vista unificada)
            items.push(this.menuItem('/admin_eventos_confirmados.html', '📆', 'Eventos Confirmados'));
        }

        // Personal
        if (this.tieneAlgunPermiso(['personal.ver', 'personal.gestionar'])) {
            items.push(this.menuItem('/admin_personal.html', '👥', 'Personal'));
        }

        // Configuración (submenú)
        const configItems = [];
        if (this.tienePermiso('config.alquiler')) {
            configItems.push(this.menuItem('/config_alquiler.html', '🏠', 'Alquiler de Salón', true));
        }
        if (this.tienePermiso('config.talleres')) {
            configItems.push(this.menuItem('/config_talleres.html', '🎨', 'Talleres', true));
        }
        if (this.tienePermiso('config.servicios')) {
            configItems.push(this.menuItem('/config_servicios.html', '✨', 'Servicios', true));
        }
        if (this.tienePermiso('config.bandas')) {
            configItems.push(this.menuItem('/config_bandas.html', '🎸', 'Bandas', true));
        }

        if (configItems.length > 0) {
            items.push(`
                <div class="px-4 py-1 text-xs text-stone-500 uppercase tracking-wider">Configuración</div>
                ${configItems.join('')}
            `);
        }

        // Usuarios - solo SUPER_ADMIN o con permiso usuarios.ver
        if (this.tienePermiso('usuarios.ver')) {
            items.push(`<div class="border-t border-stone-700 my-1"></div>`);
            items.push(this.menuItem('/admin_usuarios.html', '🔑', 'Usuarios'));
        }

        return items.join('');
    }

    /**
     * Genera HTML de un item de menú
     */
    menuItem(href, emoji, text, isSubitem = false) {
        const padding = isSubitem ? 'pl-8' : 'px-4';
        return `
            <a href="${href}" 
               class="block ${padding} py-2 text-sm text-stone-300 hover:bg-stone-700 hover:text-neon transition rounded">
                ${emoji} ${text}
            </a>
        `;
    }

    /**
     * Obtiene emoji para un rol
     */
    getRolEmoji(rol) {
        const emojis = {
            'SUPER_ADMIN': '🔑',
            'ADMIN': '⚙️',
            'OPERADOR': '📋',
            'VIEWER': '👁️'
        };
        return emojis[rol] || '👤';
    }

    /**
     * Formatea nombre del rol
     */
    formatRolName(rol) {
        const nombres = {
            'SUPER_ADMIN': 'Super Admin',
            'ADMIN': 'Admin',
            'OPERADOR': 'Operador',
            'VIEWER': 'Viewer'
        };
        return nombres[rol] || rol;
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

        // Configurar dropdown menu si está autenticado
        if (this.isAuthenticated) {
            this.setupDropdownMenu();
        }
    }

    /**
     * Configura el dropdown menu del admin con event listeners
     */
    setupDropdownMenu() {
        const dropdownBtn = document.getElementById('admin-dropdown-btn');
        const dropdownMenu = document.getElementById('admin-dropdown-menu');
        const dropdownArrow = document.getElementById('admin-dropdown-arrow');

        if (!dropdownBtn || !dropdownMenu) {
            console.warn('Elementos del dropdown no encontrados');
            return;
        }

        // Toggle del dropdown al hacer click
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = dropdownMenu.style.display !== 'none';
            if (isVisible) {
                this.closeDropdown(dropdownMenu, dropdownArrow);
            } else {
                this.openDropdown(dropdownMenu, dropdownArrow);
            }
        });

        // Cerrar dropdown al hacer click fuera
        document.addEventListener('click', (e) => {
            const container = document.getElementById('admin-dropdown-container');
            if (container && !container.contains(e.target)) {
                this.closeDropdown(dropdownMenu, dropdownArrow);
            }
        });

        // Cerrar dropdown al hacer click en algún item del menú
        const menuItems = dropdownMenu.querySelectorAll('a');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                this.closeDropdown(dropdownMenu, dropdownArrow);
            });
        });
    }

    /**
     * Abre el dropdown menu
     */
    openDropdown(dropdownMenu, dropdownArrow) {
        dropdownMenu.style.display = 'block';
        setTimeout(() => {
            dropdownMenu.style.opacity = '1';
            dropdownMenu.style.visibility = 'visible';
            if (dropdownArrow) {
                dropdownArrow.style.transform = 'rotate(180deg)';
            }
        }, 10);
    }

    /**
     * Cierra el dropdown menu
     */
    closeDropdown(dropdownMenu, dropdownArrow) {
        dropdownMenu.style.opacity = '0';
        dropdownMenu.style.visibility = 'hidden';
        if (dropdownArrow) {
            dropdownArrow.style.transform = 'rotate(0deg)';
        }
        setTimeout(() => {
            dropdownMenu.style.display = 'none';
        }, 200);
    }

    /**
     * Verifica si el token JWT ha expirado
     */
    isTokenExpired() {
        if (!this.jwtToken) return true;

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

            // Verificar si tiene campo exp y si ha expirado
            if (payload.exp) {
                const now = Math.floor(Date.now() / 1000);
                return payload.exp < now;
            }
            return false; // Si no tiene exp, asumimos que no expira
        } catch (error) {
            console.error('Error verificando expiración del token:', error);
            return true; // En caso de error, consideramos expirado
        }
    }

    /**
     * Protege una página admin: redirige a login si no está autenticado o token expirado
     */
    protectAdminPage() {
        // Verificar si hay token y si no ha expirado
        if (!this.isAuthenticated || this.isTokenExpired()) {
            console.warn('Acceso denegado: usuario no autenticado o sesión expirada');
            this.clearAuth(); // Limpiar datos de autenticación
            window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        return true;
    }

    /**
     * Protege una página que requiere un permiso específico
     */
    protectWithPermiso(permiso) {
        if (!this.protectAdminPage()) return false;

        if (!this.tienePermiso(permiso)) {
            console.warn(`Acceso denegado: usuario no tiene permiso '${permiso}'`);
            alert('No tienes permisos para acceder a esta página.');
            window.location.href = '/admin.html';
            return false;
        }
        return true;
    }

    /**
     * Verifica si el usuario es admin (legacy - usar tieneRol o tienePermiso)
     */
    isAdmin() {
        return this.isAuthenticated && (this.userRole === 'admin' || this.userRoles.includes('SUPER_ADMIN') || this.userRoles.includes('ADMIN'));
    }
}

// Variable global para que el botón de logout funcione
let navbarManager = null;

/**
 * IMPORTANTE: Este archivo NO se auto-inicializa.
 * Cada página debe instanciar NavbarManager explícitamente.
 * 
 * Uso en páginas admin:
 *   <script src="/navbar.js"></script>
 *   <script>
 *     document.addEventListener('DOMContentLoaded', () => {
 *       navbarManager = new NavbarManager();
 *       navbarManager.protectAdminPage();
 *       navbarManager.injectNavbar('body');
 *     });
 *   </script>
 * 
 * Para proteger con permiso específico:
 *   navbarManager.protectWithPermiso('usuarios.ver');
 * 
 * Para verificar permisos en código:
 *   if (navbarManager.tienePermiso('solicitudes.editar')) { ... }
 */

// ============================================================
// FUNCIONES HELPER GLOBALES PARA PERMISOS
// ============================================================

/**
 * Verifica si el usuario tiene un permiso específico
 * @param {string} permiso - El permiso a verificar (ej: 'config.alquiler')
 * @returns {boolean}
 */
function tienePermiso(permiso) {
    return navbarManager && navbarManager.tienePermiso(permiso);
}

/**
 * Verifica si el usuario tiene alguno de los permisos
 * @param {string[]} permisos - Array de permisos
 * @returns {boolean}
 */
function tieneAlgunPermiso(permisos) {
    return navbarManager && navbarManager.tieneAlgunPermiso(permisos);
}

/**
 * Verifica si el usuario puede editar (tiene permisos de escritura)
 * @param {string} modulo - El módulo (config, solicitudes, personal, etc)
 * @returns {boolean}
 */
function puedeEditar(modulo) {
    if (!navbarManager) return false;
    // SUPER_ADMIN, ADMIN, admin pueden editar todo
    if (navbarManager.tieneRol('SUPER_ADMIN') || navbarManager.tieneRol('ADMIN') || navbarManager.tieneRol('admin')) return true;
    // Para otros roles, verificar permiso específico
    const permisosEscritura = {
        'config': ['config.alquiler', 'config.talleres', 'config.servicios', 'config.bandas', 'configuracion.editar'],
        'alquiler': ['config.alquiler', 'configuracion.editar'],
        'talleres': ['config.talleres', 'configuracion.editar'],
        'servicios': ['config.servicios', 'configuracion.editar'],
        'bandas': ['config.bandas', 'configuracion.editar'],
        'solicitudes': ['solicitudes.crear', 'solicitudes.editar'],
        'personal': ['personal.gestionar'],
        'usuarios': ['usuarios.crear', 'usuarios.editar']
    };
    const permisos = permisosEscritura[modulo] || [];
    return permisos.some(p => navbarManager.tienePermiso(p));
}

/**
 * Oculta elementos que requieren permisos de escritura
 * Busca elementos con data-requiere-permiso y los oculta si no tiene el permiso
 */
function aplicarPermisosUI() {
    if (!navbarManager) return;

    // Ocultar elementos con data-requiere-permiso
    document.querySelectorAll('[data-requiere-permiso]').forEach(el => {
        const permiso = el.dataset.requierePermiso;
        if (!navbarManager.tienePermiso(permiso)) {
            el.style.display = 'none';
        }
    });

    // Ocultar elementos con data-requiere-edicion
    document.querySelectorAll('[data-requiere-edicion]').forEach(el => {
        const modulo = el.dataset.requiereEdicion;
        if (!puedeEditar(modulo)) {
            el.style.display = 'none';
        }
    });
}
