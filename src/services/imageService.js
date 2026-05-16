import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imageBaseUrl = (process.env.IMAGE_BASE_URL || '').replace(/\/+$/, '');
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';
const SUPABASE_STORAGE_PATH_PREFIX = (process.env.SUPABASE_STORAGE_PATH_PREFIX || 'products').replace(/^\/+|\/+$/g, '');
const SHOULD_FORCE_SUPABASE_STORAGE = process.env.USE_SUPABASE_STORAGE === 'true';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

class ImageService {
  static supabaseClient = null;

  static hasSupabaseConfig() {
    return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && SUPABASE_STORAGE_BUCKET);
  }

  static shouldUseSupabaseStorage() {
    if (SHOULD_FORCE_SUPABASE_STORAGE || IS_PRODUCTION) {
      if (!this.hasSupabaseConfig()) {
        throw new Error(
          'Falta configuración de Supabase Storage. Definir SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y SUPABASE_STORAGE_BUCKET.'
        );
      }
      return true;
    }
    return false;
  }

  static getSupabaseClient() {
    if (!this.supabaseClient) {
      this.supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
    return this.supabaseClient;
  }

  static extractBase64Data(base64String) {
    const match = base64String.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return {
        contentType: match[1],
        cleanBase64: match[2],
      };
    }
    return {
      contentType: 'image/png',
      cleanBase64: base64String,
    };
  }

  static getExtensionFromContentType(contentType) {
    const extensionByContentType = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
      'image/avif': '.avif',
    };

    return extensionByContentType[contentType?.toLowerCase()] || '.png';
  }

  static ensureFilename(filename, contentType) {
    let finalFilename = filename;
    if (!finalFilename) {
      finalFilename = `product_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }

    if (!path.extname(finalFilename)) {
      finalFilename += this.getExtensionFromContentType(contentType);
    }

    return finalFilename;
  }

  static getSupabaseObjectPath(storeId, filename) {
    return `${SUPABASE_STORAGE_PATH_PREFIX}/store_${storeId}/${filename}`;
  }

  static extractSupabaseObjectPath(imageUrl) {
    if (!imageUrl) return null;
    if (!this.hasSupabaseConfig()) return null;

    const publicPrefix = `/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/`;
    const signPrefix = `/storage/v1/object/sign/${SUPABASE_STORAGE_BUCKET}/`;
    const bucketPathPrefix = `/${SUPABASE_STORAGE_BUCKET}/`;
    const protocolPrefix = `supabase://${SUPABASE_STORAGE_BUCKET}/`;

    if (imageUrl.startsWith(protocolPrefix)) {
      return imageUrl.slice(protocolPrefix.length);
    }

    if (!imageUrl.includes('://') && !imageUrl.startsWith('/images/')) {
      return imageUrl.replace(/^\/+/, '');
    }

    try {
      const url = new URL(imageUrl);
      const pathname = decodeURIComponent(url.pathname);

      if (pathname.startsWith(publicPrefix)) {
        return pathname.slice(publicPrefix.length);
      }

      if (pathname.startsWith(signPrefix)) {
        return pathname.slice(signPrefix.length);
      }

      if (pathname.startsWith(bucketPathPrefix)) {
        return pathname.slice(bucketPathPrefix.length);
      }

      return null;
    } catch (_err) {
      return null;
    }
  }

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
  static async saveImage(base64String, storeId, filename = null) {
    try {
      const { cleanBase64, contentType } = this.extractBase64Data(base64String);
      const finalFilename = this.ensureFilename(filename, contentType);

      // Decodificar base64 a buffer
      const buffer = Buffer.from(cleanBase64, 'base64');

      if (this.shouldUseSupabaseStorage()) {
        const objectPath = this.getSupabaseObjectPath(storeId, finalFilename);
        const supabase = this.getSupabaseClient();

        const { error: uploadError } = await supabase.storage
          .from(SUPABASE_STORAGE_BUCKET)
          .upload(objectPath, buffer, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from(SUPABASE_STORAGE_BUCKET)
          .getPublicUrl(objectPath);

        return {
          url: data?.publicUrl || objectPath,
          filename: finalFilename,
          path: objectPath,
        };
      }

      // Modo local (desarrollo)
      const storeDir = this.getStoreImageDirectory(storeId);
      const filepath = path.join(storeDir, finalFilename);
      fs.writeFileSync(filepath, buffer);

      const relativePath = `/images/products/store_${storeId}/${finalFilename}`;
      const relativeUrl = imageBaseUrl ? `${imageBaseUrl}${relativePath}` : relativePath;

      return {
        url: relativeUrl,
        filename: finalFilename,
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
  static async deleteImage(imageUrl) {
    try {
      if (!imageUrl) return false;

      if (this.shouldUseSupabaseStorage()) {
        const objectPath = this.extractSupabaseObjectPath(imageUrl);
        if (!objectPath) return false;

        const supabase = this.getSupabaseClient();
        const { error } = await supabase.storage
          .from(SUPABASE_STORAGE_BUCKET)
          .remove([objectPath]);

        if (error) {
          throw error;
        }
        return true;
      }

      // Modo local (desarrollo)
      let localImagePath = imageUrl;
      if (imageBaseUrl && localImagePath.startsWith(imageBaseUrl)) {
        localImagePath = localImagePath.slice(imageBaseUrl.length);
      } else if (localImagePath.includes('://')) {
        try {
          localImagePath = new URL(localImagePath).pathname;
        } catch (_err) {
          return false;
        }
      }

      const normalizedPath = localImagePath.replace(/^\/+/, '');
      const filepath = path.join(__dirname, '../../public', normalizedPath);

      if (!fs.existsSync(filepath)) return false;

      fs.unlinkSync(filepath);
      return true;
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
