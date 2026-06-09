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
    const signedUrl = cloudinary.utils.private_download_url(publicId, null, { resource_type: 'raw' });
    console.log('[cloudinary] signedUrl:', signedUrl.replace(/signature=[^&]+/, 'signature=REDACTED').replace(/api_key=[^&]+/, 'api_key=REDACTED'));
    const r = await axios.get(signedUrl, { responseType: 'arraybuffer' });
    return Buffer.from(r.data);
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
