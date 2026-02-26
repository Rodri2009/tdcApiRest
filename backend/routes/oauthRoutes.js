const express = require('express');
const router = express.Router();
const axios = require('axios');
const { logWarning, logSuccess, logError } = require('../lib/debugFlags');

/**
 * Validar y procesar token de Google OAuth
 * POST /api/auth/oauth/google
 */
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token de Google requerido' });
    }

    // Validar el token con Google
    // Usar axios para hacer la solicitud a Google API
    const googleVerifyUrl = 'https://www.googleapis.com/oauth2/v1/tokeninfo';
    
    const response = await axios.get(googleVerifyUrl, {
      params: { access_token: token }
    }).catch(async (err) => {
      // Si falla con access_token, intentar con id_token
      try {
        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');
        const ticket = await client.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        return { data: ticket.getPayload() };
      } catch (verifyErr) {
        throw err;
      }
    });

    const payload = response.data;

    // Extraer datos del usuario
    const userData = {
      provider: 'google',
      id: payload.sub || payload.user_id || payload.id,
      email: payload.email || '',
      name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
      given_name: payload.given_name || '',
      family_name: payload.family_name || '',
      picture: payload.picture || '',
      phone: payload.phone_number || '' // Google puede proporcionar teléfono
    };

    logSuccess('Usuario vinculado con Google', { email: userData.email });
    
    res.json(userData);
  } catch (error) {
    logError('Error en OAuth Google', error.message);
    res.status(401).json({ 
      error: 'Token de Google inválido o expirado',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Validar y procesar token de Facebook OAuth
 * POST /api/auth/oauth/facebook
 */
router.post('/facebook', async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'Token de Facebook requerido' });
    }

    // Obtener datos del usuario con Facebook Graph API
    const facebookUrl = 'https://graph.facebook.com/v18.0/me';
    
    const response = await axios.get(facebookUrl, {
      params: {
        access_token: access_token,
        fields: 'id,name,email,picture,phone' // Campos a solicitar
      }
    });

    const userData = response.data;

    // Intentar dividir el nombre en nombre y apellido
    const nameParts = (userData.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const userProfile = {
      provider: 'facebook',
      id: userData.id || '',
      email: userData.email || '',
      name: userData.name || '',
      given_name: firstName,
      family_name: lastName,
      picture: userData.picture?.data?.url || '',
      phone: userData.phone || ''
    };

    logSuccess('Usuario vinculado con Facebook', { email: userProfile.email });
    
    res.json(userProfile);
  } catch (error) {
    logError('Error en OAuth Facebook', error.message);
    res.status(401).json({ 
      error: 'Token de Facebook inválido o expirado',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Validar y procesar token de Instagram OAuth
 * POST /api/auth/oauth/instagram
 * Nota: Instagram usa Facebook Graph API, así que reutilizamos la validación
 */
router.post('/instagram', async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'Token de Instagram requerido' });
    }

    // Obtener datos del usuario con Facebook Graph API (Instagram está bajo FB)
    const instagramUrl = 'https://graph.instagram.com/v18.0/me';
    
    try {
      const response = await axios.get(instagramUrl, {
        params: {
          access_token: access_token,
          fields: 'id,username,name,biography,profile_picture_url,website'
        }
      });

      const userData = response.data;

      // Intentar obtener email a través de Facebook
      const fbUrl = 'https://graph.facebook.com/v18.0/me';
      const fbResponse = await axios.get(fbUrl, {
        params: {
          access_token: access_token,
          fields: 'email,phone_number'
        }
      }).catch(() => ({ data: {} })); // No fallar si no se obtiene email

      const userProfile = {
        provider: 'instagram',
        id: userData.id || '',
        email: fbResponse.data?.email || '',
        name: userData.name || userData.username || '',
        username: userData.username || '',
        picture: userData.profile_picture_url || '',
        phone: fbResponse.data?.phone_number || ''
      };

      logSuccess('Usuario vinculado con Instagram', { 
        username: userProfile.username 
      });
      
      res.json(userProfile);
    } catch (igError) {
      // Fallback: si falla Instagram API, intentar solo Facebook
      const fbUrl = 'https://graph.facebook.com/v18.0/me';
      const fbResponse = await axios.get(fbUrl, {
        params: {
          access_token: access_token,
          fields: 'id,name,email,picture,phone_number'
        }
      });

      const userData = fbResponse.data;
      const nameParts = (userData.name || '').split(' ');

      const userProfile = {
        provider: 'instagram',
        id: userData.id || '',
        email: userData.email || '',
        name: userData.name || '',
        given_name: nameParts[0] || '',
        family_name: nameParts.slice(1).join(' ') || '',
        picture: userData.picture?.data?.url || '',
        phone: userData.phone_number || ''
      };

      logSuccess('Usuario vinculado con Instagram (via Facebook)', { 
        email: userProfile.email 
      });
      
      res.json(userProfile);
    }
  } catch (error) {
    logError('Error en OAuth Instagram', error.message);
    res.status(401).json({ 
      error: 'Token de Instagram inválido o expirado',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
