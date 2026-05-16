import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imageBaseUrl = (process.env.IMAGE_BASE_URL || '').replace(/\/+$/, '');

class ImageService {
  /**
   * Crea el directorio de imágenes para una tienda si no existe
   * @param {number} storeId - ID de la tienda
   * @returns {string} Ruta del directorio
   */
  static getStoreImageDirectory(storeId) {
    const imagesDir = path.join(__dirname, '../../public/images/products', `store_${storeId}`);
    
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    return imagesDir;
  }

  /**
   * Guarda una imagen desde base64
   * @param {string} base64String - String de imagen en base64 (sin el prefijo data:image/...)
   * @param {number} storeId - ID de la tienda
   * @param {string} filename - Nombre del archivo (sin extensión, se agregará .png por defecto)
   * @returns {object} Objeto con url relativa y filename
   */
  static saveImage(base64String, storeId, filename = null) {
    try {
      // Generar nombre de archivo si no se proporciona
      if (!filename) {
        filename = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Asegurar que el archivo tenga extensión
      if (!filename.includes('.')) {
        filename += '.png';
      }

      // Limpiar el string base64 (remover prefijo si existe)
      let cleanBase64 = base64String;
      if (base64String.includes(',')) {
        cleanBase64 = base64String.split(',')[1];
      }

      // Decodificar base64 a buffer
      const buffer = Buffer.from(cleanBase64, 'base64');

      // Obtener directorio de la tienda
      const storeDir = this.getStoreImageDirectory(storeId);
      const filepath = path.join(storeDir, filename);

      // Guardar el archivo
      fs.writeFileSync(filepath, buffer);

      const relativePath = `/images/products/store_${storeId}/${filename}`;
      const relativeUrl = imageBaseUrl ? `${imageBaseUrl}${relativePath}` : relativePath;

      return {
        url: relativeUrl,
        filename: filename,
        path: filepath,
      };
    } catch (err) {
      throw new Error(`Error guardando imagen: ${err.message}`);
    }
  }

  /**
   * Elimina una imagen guardada
   * @param {string} imageUrl - URL relativa de la imagen (/images/products/store_1/image_123.png)
   * @returns {boolean} True si se eliminó correctamente
   */
  static deleteImage(imageUrl) {
    try {
      if (!imageUrl) return false;

      const filepath = path.join(__dirname, '../../public', imageUrl);
      
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        return true;
      }

      return false;
    } catch (err) {
      console.error(`Error eliminando imagen: ${err.message}`);
      return false;
    }
  }

  /**
   * Valida que el string sea base64 válido
   * @param {string} str - String a validar
   * @returns {boolean} True si es válido
   */
  static isValidBase64(str) {
    try {
      let cleanStr = str;
      if (str.includes(',')) {
        cleanStr = str.split(',')[1];
      }
      return Buffer.from(cleanStr, 'base64').toString('base64') === cleanStr;
    } catch (err) {
      return false;
    }
  }
}

export default ImageService;
