const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Descarga un archivo raw de Cloudinary usando la API autenticada
 * (api.cloudinary.com/v1_1/...) en lugar del CDN (res.cloudinary.com).
 * Esto bypasea la restricción "Customer is marked as untrusted" que bloquea
 * la entrega CDN de archivos raw en cuentas free no verificadas.
 */
async function descargarBuffer(publicId, fallbackUrl) {
  const axios = require('axios');
  const isConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
                       process.env.CLOUDINARY_API_KEY &&
                       process.env.CLOUDINARY_API_SECRET;

  if (isConfigured && publicId) {
    // Verificar existencia via Admin API antes de intentar download
    try {
      const meta = await cloudinary.api.resource(publicId, { resource_type: 'raw' });
      console.log('[cloudinary] api.resource OK:', meta.public_id, meta.bytes, 'bytes type:', meta.type);
    } catch (apiErr) {
      console.error('[cloudinary] api.resource FAILED:', apiErr.http_code, JSON.stringify(apiErr.error || apiErr.message));
    }

    const signedUrl = cloudinary.utils.private_download_url(publicId, null, { resource_type: 'raw', type: 'upload' });
    console.log('[cloudinary] signedUrl:', signedUrl.replace(/signature=[^&]+/, 'signature=REDACTED').replace(/api_key=[^&]+/, 'api_key=REDACTED'));
    try {
      const r = await axios.get(signedUrl, { responseType: 'arraybuffer' });
      return Buffer.from(r.data);
    } catch (dlErr) {
      if (dlErr.response) {
        const body = Buffer.from(dlErr.response.data).toString('utf8');
        console.error('[cloudinary] download HTTP', dlErr.response.status, ':', body.slice(0, 400));
      }
      throw dlErr;
    }
  }

  // Fallback: URL directa (funciona en local sin Cloudinary)
  if (fallbackUrl?.startsWith('http')) {
    const r = await axios.get(fallbackUrl, { responseType: 'arraybuffer' });
    return Buffer.from(r.data);
  }

  return require('fs').promises.readFile(fallbackUrl);
}

module.exports = cloudinary;
module.exports.descargarBuffer = descargarBuffer;
