import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mediaBaseUrl = (process.env.IMAGE_BASE_URL || process.env.MEDIA_BASE_URL || '').replace(/\/+$/, '');
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';
const SUPABASE_MEDIA_PATH_PREFIX = (process.env.SUPABASE_MEDIA_PATH_PREFIX || 'messages').replace(/^\/+|\/+$/g, '');
const SHOULD_FORCE_SUPABASE_STORAGE = process.env.USE_SUPABASE_STORAGE === 'true';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

class MediaStorageService {
  static supabaseClient = null;

  static hasSupabaseConfig() {
    return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && SUPABASE_STORAGE_BUCKET);
  }

  static shouldUseSupabaseStorage() {
    if (SHOULD_FORCE_SUPABASE_STORAGE || IS_PRODUCTION) {
      if (!this.hasSupabaseConfig()) {
        throw new Error('Falta configuración de Supabase Storage para adjuntos de mensajes.');
      }
      return true;
    }
    return false;
  }

  static getSupabaseClient() {
    if (!this.supabaseClient) {
      this.supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return this.supabaseClient;
  }

  static extractBase64Data(value, fallbackMime = 'application/octet-stream') {
    const match = String(value || '').match(/^data:([^;]+);base64,(.+)$/);
    if (match) return { contentType: match[1], cleanBase64: match[2] };
    return { contentType: fallbackMime, cleanBase64: String(value || '') };
  }

  static getExtensionFromContentType(contentType) {
    const extensionByType = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/ogg': '.ogg',
      'audio/webm': '.webm',
      'audio/wav': '.wav',
      'application/pdf': '.pdf',
    };
    return extensionByType[String(contentType || '').toLowerCase()] || '.bin';
  }

  static sanitizeFilename(filename) {
    return String(filename || '')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-')
      .slice(0, 120);
  }

  static ensureFilename(filename, contentType) {
    const safeName = this.sanitizeFilename(filename);
    const baseName = safeName || `message_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    return path.extname(baseName) ? baseName : `${baseName}${this.getExtensionFromContentType(contentType)}`;
  }

  static getSupabaseObjectPath(storeId, filename) {
    return `${SUPABASE_MEDIA_PATH_PREFIX}/store_${storeId}/${filename}`;
  }

  static getLocalDirectory(storeId) {
    const dir = path.join(__dirname, '../../public/media/messages', `store_${storeId}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  static async saveBase64(base64String, {
    storeId,
    filename = null,
    contentType = 'application/octet-stream',
  }) {
    const extracted = this.extractBase64Data(base64String, contentType);
    const finalContentType = extracted.contentType || contentType;
    const finalFilename = this.ensureFilename(filename, finalContentType);
    const buffer = Buffer.from(extracted.cleanBase64, 'base64');

    if (this.shouldUseSupabaseStorage()) {
      const objectPath = this.getSupabaseObjectPath(storeId, finalFilename);
      const supabase = this.getSupabaseClient();
      const { error } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .upload(objectPath, buffer, {
          contentType: finalContentType,
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(objectPath);

      return {
        url: data?.publicUrl || objectPath,
        filename: finalFilename,
        path: objectPath,
        contentType: finalContentType,
        size: buffer.length,
      };
    }

    const storeDir = this.getLocalDirectory(storeId);
    const filepath = path.join(storeDir, finalFilename);
    fs.writeFileSync(filepath, buffer);

    const relativePath = `/media/messages/store_${storeId}/${finalFilename}`;
    return {
      url: mediaBaseUrl ? `${mediaBaseUrl}${relativePath}` : relativePath,
      filename: finalFilename,
      path: filepath,
      contentType: finalContentType,
      size: buffer.length,
    };
  }
}

export default MediaStorageService;
