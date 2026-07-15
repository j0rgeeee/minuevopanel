// api/publish.js

export default async function handler(req, res) {
  // Solo permitir peticiones POST desde nuestro frontend
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

    // Extraer parámetros especiales para determinar si es creación o actualización
    const idBloggerReal = postData.idBloggerReal;
    const isDraft = postData.isDraft;

    // Limpiar propiedades personalizadas antes de enviar a Blogger
    delete postData.idBloggerReal;
    delete postData.isDraft;

    let bloggerUrl = `https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts/`;
    let bloggerMethod = 'POST';

    // 2. Determinar la acción (Crear vs Actualizar)
    if (idBloggerReal) {
      // Si ya tiene ID, la URL apunta al post específico y el método es PUT
      bloggerUrl += idBloggerReal;
      bloggerMethod = 'PUT';
    } else {
      // Si es creación, añadimos si debe crearse directamente como borrador (isDraft)
      bloggerUrl += `?isDraft=${isDraft === 'true' || isDraft === true ? 'true' : 'false'}`;
    }

    // 3. Comunicarse con la API de Blogger
    const bloggerResponse = await fetch(bloggerUrl, {
      method: bloggerMethod,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    const bloggerResult = await bloggerResponse.json();

    if (!bloggerResponse.ok) {
      return res.status(bloggerResponse.status).json({ 
        error: `Error al ${bloggerMethod === 'PUT' ? 'actualizar' : 'publicar'} en Blogger`, 
        details: bloggerResult 
      });
    }

    // Devolver el resultado exitoso al frontend
    return res.status(200).json(bloggerResult);

  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
}