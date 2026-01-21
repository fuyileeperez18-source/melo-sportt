import cloudinary from '../config/cloudinary.js';
import { AppError } from '../middleware/errorHandler.js';

interface UploadResult {
  public_id: string;
  url: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export const uploadService = {
  /**
   * Sube una imagen a Cloudinary
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'melo-sportt/products'
  ): Promise<UploadResult> {
    try {
      // Convertir el buffer a base64
      const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

      const result = await cloudinary.uploader.upload(base64Image, {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      });

      return {
        public_id: result.public_id,
        url: result.url,
        secure_url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw new AppError('Error al subir la imagen', 500);
    }
  },

  /**
   * Sube múltiples imágenes a Cloudinary
   */
  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'melo-sportt/products'
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  },

  /**
   * Elimina una imagen de Cloudinary
   */
  async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
      throw new AppError('Error al eliminar la imagen', 500);
    }
  },

  /**
   * Elimina múltiples imágenes de Cloudinary
   */
  async deleteMultipleImages(publicIds: string[]): Promise<void> {
    try {
      await cloudinary.api.delete_resources(publicIds);
    } catch (error) {
      console.error('Error deleting multiple images from Cloudinary:', error);
      throw new AppError('Error al eliminar las imágenes', 500);
    }
  },

  /**
   * Genera una URL optimizada de Cloudinary
   */
  getOptimizedUrl(publicId: string, options?: { width?: number; height?: number }): string {
    return cloudinary.url(publicId, {
      secure: true,
      transformation: [
        {
          width: options?.width || 800,
          height: options?.height || 800,
          crop: 'limit',
        },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });
  },

  /**
   * Genera URL para thumbnail
   */
  getThumbnailUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      secure: true,
      transformation: [
        { width: 300, height: 300, crop: 'fill' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });
  },
};
