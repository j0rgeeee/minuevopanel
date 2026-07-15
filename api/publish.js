// api/publish.js

export default async function handler(req, res) {
  // Solo permitir peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, BLOG_ID } = process.env;

  // Validar que las variables de entorno estén configuradas
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !BLOG_ID) {
    return res.status(500).json({ 
      error: 'Error de configuración en el servidor. Faltan variables de entorno.' 
    });
  }

  try {
    // 1. Solicitar un nuevo access token a Google usando el refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.json();
      return res.status(tokenResponse.status).json({ 
        error: 'Error al obtener el access token de Google', 
        details: tokenError 
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Obtener el cuerpo del post enviado desde el frontend
    const postData = req.body;

    // 2. Publicar el artículo en Blogger
    const bloggerResponse = await fetch(
      `https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      }
    );

    const bloggerResult = await bloggerResponse.json();

    if (!bloggerResponse.ok) {
      return res.status(bloggerResponse.status).json({ 
        error: 'Error al publicar en Blogger', 
        details: bloggerResult 
      });
    }

    // Devolver el resultado de la publicación exitosa al frontend
    return res.status(200).json(bloggerResult);

  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
}