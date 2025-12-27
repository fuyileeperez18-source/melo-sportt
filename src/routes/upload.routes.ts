import { Router, Response } from 'express';
import multer from 'multer';
import { uploadService } from '../services/upload.service.js';
import { productService } from '../services/product.service.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

// Configurar multer para almacenamiento en memoria
const storage = multer.memoryStorage();

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Aceptar solo imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 10, // Máximo 10 archivos
  },
});

/**
 * POST /api/upload/image
 * Sube una imagen a Cloudinary
 */
router.post(
  '/image',
  authenticate,
  requireAdmin,
  upload.single('image'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No se proporcionó ninguna imagen',
        });
        return;
      }

      const folder = (req.body.folder as string) || 'melo-sportt/products';
      const result = await uploadService.uploadImage(req.file, folder);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({
        success: false,
        error: 'Error al subir la imagen',
      });
    }
  }
);

/**
 * POST /api/upload/images
 * Sube múltiples imágenes a Cloudinary
 */
router.post(
  '/images',
  authenticate,
  requireAdmin,
  upload.array('images', 10),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No se proporcionaron imágenes',
        });
        return;
      }

      const folder = (req.body.folder as string) || 'melo-sportt/products';
      const results = await uploadService.uploadMultipleImages(files, folder);

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      res.status(500).json({
        success: false,
        error: 'Error al subir las imágenes',
      });
    }
  }
);

/**
 * DELETE /api/upload/image/:publicId
 * Elimina una imagen de Cloudinary
 */
router.delete(
  '/image/:publicId(*)',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { publicId } = req.params;
      await uploadService.deleteImage(publicId);

      res.json({
        success: true,
        message: 'Imagen eliminada correctamente',
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      res.status(500).json({
        success: false,
        error: 'Error al eliminar la imagen',
      });
    }
  }
);

/**
 * POST /api/upload/product/:productId/image
 * Sube una imagen y la asocia a un producto
 */
router.post(
  '/product/:productId/image',
  authenticate,
  requireAdmin,
  upload.single('image'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No se proporcionó ninguna imagen',
        });
        return;
      }

      // Subir imagen a Cloudinary
      const uploadResult = await uploadService.uploadImage(
        req.file,
        `melo-sportt/products/${productId}`
      );

      // Agregar imagen al producto en la base de datos
      const isPrimary = req.body.is_primary === 'true';
      const position = parseInt(req.body.position || '0', 10);
      const altText = req.body.alt_text || '';

      const productImage = await productService.addImage(productId, {
        url: uploadResult.secure_url,
        alt_text: altText,
        position,
        is_primary: isPrimary,
      });

      res.json({
        success: true,
        data: {
          ...(productImage as object),
          public_id: uploadResult.public_id,
        },
      });
    } catch (error) {
      console.error('Error uploading product image:', error);
      res.status(500).json({
        success: false,
        error: 'Error al subir la imagen del producto',
      });
    }
  }
);

/**
 * POST /api/upload/product/:productId/images
 * Sube múltiples imágenes y las asocia a un producto
 */
router.post(
  '/product/:productId/images',
  authenticate,
  requireAdmin,
  upload.array('images', 10),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No se proporcionaron imágenes',
        });
        return;
      }

      // Subir todas las imágenes a Cloudinary
      const uploadResults = await uploadService.uploadMultipleImages(
        files,
        `melo-sportt/products/${productId}`
      );

      // Agregar imágenes al producto en la base de datos
      const productImages = await Promise.all(
        uploadResults.map(async (result, index) => {
          const isPrimary =
            index === 0 && (req.body.first_is_primary === 'true' || files.length === 1);
          const productImage = await productService.addImage(productId, {
            url: result.secure_url,
            alt_text: '',
            position: index,
            is_primary: isPrimary,
          });
          return { ...(productImage as object), public_id: result.public_id };
        })
      );

      res.json({
        success: true,
        data: productImages,
      });
    } catch (error) {
      console.error('Error uploading product images:', error);
      res.status(500).json({
        success: false,
        error: 'Error al subir las imágenes del producto',
      });
    }
  }
);

export default router;
