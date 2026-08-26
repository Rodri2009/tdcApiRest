/**
 * OAuth Manager - Integra Google, Facebook e Instagram Login
 * Extrae: nombre, apellido, teléfono y email
 */

class OAuthManager {
  constructor() {
    this.googleClientId = ''; // Se debe configurar
    this.facebookAppId = ''; // Se debe configurar
    this.baseApiUrl = '/api/auth/oauth';
    this.socialData = {};
  }

  /**
   * Inicializa Google Sign-In
   * Requiere GOOGLE_CLIENT_ID en variables de entorno
   */
  initGoogle() {
    // El GOOGLE_CLIENT_ID debe inyectarse desde el backend o estar en .env del frontend
    if (!window.google) {
      console.warn('Google SDK no cargado aún');
      return;
    }

    const googleBtn = document.getElementById('btn-google');
    if (!googleBtn) return;

    googleBtn.addEventListener('click', () => {
      this.triggerGoogleSignIn();
    });
  }

  /**
   * Inicializa Facebook Login
   * Requiere FACEBOOK_APP_ID en variables de entorno
   */
  initFacebook() {
    const facebookBtn = document.getElementById('btn-facebook');
    if (!facebookBtn) return;

    facebookBtn.addEventListener('click', () => {
      this.triggerFacebookLogin();
    });
  }

  /**
   * Inicializa Instagram (redirige a Facebook)
   */
  initInstagram() {
    const instagramBtn = document.getElementById('btn-instagram');
    if (!instagramBtn) return;

    instagramBtn.addEventListener('click', () => {
      this.triggerInstagramLogin();
    });
  }

  /**
   * Trigger Google Sign-In
   */
  triggerGoogleSignIn() {
    const googleBtn = document.getElementById('btn-google');
    googleBtn.disabled = true;
    googleBtn.classList.add('social-loading');

    // Usar Google Identity Services
    if (!window.google || !window.google.accounts) {
      this.showNotification('Google SDK no disponible', 'error');
      googleBtn.disabled = false;
      googleBtn.classList.remove('social-loading');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: this.googleClientId || '677411051387-4d8plvlfujs3drnb6mcvmvsq5qro3oj6.apps.googleusercontent.com',
      callback: (response) => this.handleGoogleResponse(response)
    });

    // Usar el flow de popup
    window.google.accounts.id.renderButton(
      document.createElement('div'),
      { theme: 'outline', size: 'large' }
    );

    // Trigger programático
    const iframeWrapper = document.querySelector('[data-skbLabel]');
    if (iframeWrapper) {
      iframeWrapper.click();
    } else {
      // Fallback: usar método One Tap
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          // Si One Tap no se muestra, crear popup manual
          this.createGoogleManualPopup();
        }
      });
    }
  }

  /**
   * Crear popup manual de Google (fallback)
   */
  createGoogleManualPopup() {
    const googleBtn = document.getElementById('btn-google');
    
    // Usar el callback de Google Sign-In
    if (window.gapi && window.gapi.auth2) {
      const auth2 = window.gapi.auth2.getAuthInstance();
      auth2.signIn().then(
        (googleUser) => {
          const profile = googleUser.getBasicProfile();
          this.handleGoogleResponse({
            credential: googleUser.getAuthResponse().id_token
          });
        },
        (error) => {
          console.error('Google sign in error:', error);
          this.showNotification('Error al vincular Google', 'error');
          googleBtn.disabled = false;
          googleBtn.classList.remove('social-loading');
        }
      );
    }
  }

  /**
   * Maneja la respuesta de Google
   */
  async handleGoogleResponse(response) {
    const googleBtn = document.getElementById('btn-google');
    
    try {
      if (!response.credential) {
        throw new Error('No se recibió token de Google');
      }

      // Enviar token al backend para validar y extraer datos
      const res = await fetch(`${this.baseApiUrl}/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error en Google OAuth');
      }

      const data = await res.json();
      this.socialData.google = data;
      this.fillFormWithSocialData(data);
      this.showNotification('✓ Datos de Google vinculados correctamente', 'success');
      
    } catch (error) {
      console.error('Google OAuth error:', error);
      this.showNotification(`Error: ${error.message}`, 'error');
    } finally {
      googleBtn.disabled = false;
      googleBtn.classList.remove('social-loading');
    }
  }

  /**
   * Trigger Facebook Login
   */
  triggerFacebookLogin() {
    const facebookBtn = document.getElementById('btn-facebook');
    facebookBtn.disabled = true;
    facebookBtn.classList.add('social-loading');

    if (!window.FB) {
      this.showNotification('Facebook SDK no disponible', 'error');
      facebookBtn.disabled = false;
      facebookBtn.classList.remove('social-loading');
      return;
    }

    window.FB.login((response) => {
      if (response.authResponse) {
        this.handleFacebookResponse(response.authResponse);
      } else {
        this.showNotification('Permiso denegado para Facebook', 'error');
        facebookBtn.disabled = false;
        facebookBtn.classList.remove('social-loading');
      }
    }, { scope: 'public_profile,email,phone_number' });
  }

  /**
   * Maneja la respuesta de Facebook
   */
  async handleFacebookResponse(authResponse) {
    const facebookBtn = document.getElementById('btn-facebook');
    
    try {
      // Enviar token al backend para validar y extraer datos
      const res = await fetch(`${this.baseApiUrl}/facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: authResponse.accessToken })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error en Facebook OAuth');
      }

      const data = await res.json();
      this.socialData.facebook = data;
      this.fillFormWithSocialData(data);
      this.showNotification('✓ Datos de Facebook vinculados correctamente', 'success');
      
    } catch (error) {
      console.error('Facebook OAuth error:', error);
      this.showNotification(`Error: ${error.message}`, 'error');
    } finally {
      facebookBtn.disabled = false;
      facebookBtn.classList.remove('social-loading');
    }
  }

  /**
   * Trigger Instagram Login (via Facebook)
   */
  triggerInstagramLogin() {
    const instagramBtn = document.getElementById('btn-instagram');
    instagramBtn.disabled = true;
    instagramBtn.classList.add('social-loading');

    // Instagram usa el mismo flujo de Facebook
    if (!window.FB) {
      this.showNotification('Facebook SDK no disponible', 'error');
      instagramBtn.disabled = false;
      instagramBtn.classList.remove('social-loading');
      return;
    }

    window.FB.login((response) => {
      if (response.authResponse) {
        this.handleInstagramResponse(response.authResponse);
      } else {
        this.showNotification('Permiso denegado para Instagram', 'error');
        instagramBtn.disabled = false;
        instagramBtn.classList.remove('social-loading');
      }
    }, { scope: 'public_profile,email' });
  }

  /**
   * Maneja la respuesta de Instagram
   */
  async handleInstagramResponse(authResponse) {
    const instagramBtn = document.getElementById('btn-instagram');
    
    try {
      // Instagram también se procesa a través del backend
      const res = await fetch(`${this.baseApiUrl}/instagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: authResponse.accessToken })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error en Instagram OAuth');
      }

      const data = await res.json();
      this.socialData.instagram = data;
      this.fillFormWithSocialData(data);
      this.showNotification('✓ Datos de Instagram vinculados correctamente', 'success');
      
    } catch (error) {
      console.error('Instagram OAuth error:', error);
      this.showNotification(`Error: ${error.message}`, 'error');
    } finally {
      instagramBtn.disabled = false;
      instagramBtn.classList.remove('social-loading');
    }
  }

  /**
   * Pre-llena el formulario con datos obtenidos de OAuth
   * Prioriza Google > Facebook > Instagram
   */
  fillFormWithSocialData(data) {
    const nombreInput = document.getElementById('nombreCompleto');
    const emailInput = document.getElementById('email');
    const telefonoInput = document.getElementById('celular');

    // Nombre y apellido
    if (data.name && nombreInput) {
      nombreInput.value = data.name;
    }

    // Email
    if (data.email && emailInput) {
      emailInput.value = data.email;
    }

    // Teléfono (si está disponible)
    if (data.phone && telefonoInput) {
      telefonoInput.value = data.phone;
    }

    // Marcar datos vinculados
    if (data.name) {
      this.showSocialBadge(data);
    }
  }

  /**
   * Muestra un badge indicando datos vinculados
   */
  showSocialBadge(data) {
    const badge = document.getElementById('client-badge');
    if (!badge) return;

    badge.innerHTML = `
      <i class="fas fa-link"></i> 
      ${data.provider === 'google' ? '<i class="fab fa-google"></i>' : ''}
      ${data.provider === 'facebook' ? '<i class="fab fa-facebook"></i>' : ''}
      ${data.provider === 'instagram' ? '<i class="fab fa-instagram"></i>' : ''}
      ${data.name || 'Usuario vinculado'}
    `;
    badge.style.display = 'inline-flex';
  }

  /**
   * Muestra notificaciones
   */
  showNotification(message, type = 'error', duration = 4000) {
    const notificationBanner = document.getElementById('notification-banner');
    if (!notificationBanner) {
      alert(message);
      return;
    }

    notificationBanner.textContent = message;
    notificationBanner.className = 'show ' + type;
    setTimeout(() => {
      notificationBanner.className = '';
    }, duration);
  }

  /**
   * Inicializa todos los OAuth
   */
  initAll() {
    this.initGoogle();
    this.initFacebook();
    this.initInstagram();
  }
}

// Instanciar globalmente y inicializar cuando el DOM esté listo
const oauthManager = new OAuthManager();
document.addEventListener('DOMContentLoaded', () => {
  oauthManager.initAll();
});
