import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon, Loader2, GripVertical, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { UploadResult } from '@/lib/api';
import toast from 'react-hot-toast';

export interface UploadedImage {
  id: string;
  url: string;
  public_id?: string;
  alt_text?: string;
  position: number;
  is_primary: boolean;
}

interface ImageUploadProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  productId?: string;
  className?: string;
}

export function ImageUpload({
  images,
  onChange,
  maxImages = 10,
  productId,
  className,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetFileInput = useCallback(() => {
    // Permite volver a seleccionar la misma imagen en móvil (iOS/Android)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const remainingSlots = maxImages - images.length;
      if (remainingSlots <= 0) {
        toast.error(`Máximo ${maxImages} imágenes permitidas`);
        resetFileInput();
        return;
      }

      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      const validFiles = filesToUpload.filter((file) => {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} no es una imagen válida`);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} excede el tamaño máximo de 10MB`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) {
        resetFileInput();
        return;
      }

      setIsUploading(true);

      try {
        const isFirstUpload = images.length === 0;
        let uploadedImagesData: UploadedImage[] = [];

        if (productId) {
          // Product-specific uploads
          if (validFiles.length > 1) {
            const endpoint = `/upload/product/${productId}/images`;
            const result = await api.uploadFiles<UploadedImage[]>(endpoint, validFiles, {
              first_is_primary: String(isFirstUpload),
            });
            if (result.success && result.data) {
              uploadedImagesData = result.data;
            }
          } else if (validFiles.length === 1) {
            const endpoint = `/upload/product/${productId}/image`;
            const result = await api.uploadFile<UploadedImage>(endpoint, validFiles[0], {
              is_primary: String(isFirstUpload),
              position: String(images.length),
            });
            if (result.success && result.data) {
              uploadedImagesData = [result.data];
            }
          }
        } else {
          // Generic uploads (no product association)
          if (validFiles.length > 1) {
            const endpoint = '/upload/images';
            const result = await api.uploadFiles<UploadResult[]>(endpoint, validFiles);
            if (result.success && result.data) {
              uploadedImagesData = result.data.map((res, i) => ({
                id: res.public_id,
                url: res.secure_url,
                public_id: res.public_id,
                position: images.length + i,
                is_primary: isFirstUpload && i === 0,
                alt_text: '',
              }));
            }
          } else if (validFiles.length === 1) {
            const endpoint = '/upload/image';
            const result = await api.uploadFile<UploadResult>(endpoint, validFiles[0]);
            if (result.success && result.data) {
              uploadedImagesData = [
                {
                  id: result.data.public_id,
                  url: result.data.secure_url,
                  public_id: result.data.public_id,
                  position: images.length,
                  is_primary: isFirstUpload,
                  alt_text: '',
                },
              ];
            }
          }
        }

        if (uploadedImagesData.length > 0) {
          const allImages = [...images, ...uploadedImagesData].sort(
            (a, b) => a.position - b.position
          );

          onChange(allImages);
          toast.success(
            `${uploadedImagesData.length} imagen${
              uploadedImagesData.length > 1 ? 'es' : ''
            } subida${uploadedImagesData.length > 1 ? 's' : ''} correctamente`
          );
        }
      } catch (error) {
        console.error('Error uploading images:', error);
        toast.error('Error al subir las imágenes');
      } finally {
        setIsUploading(false);
        // Resetear el input después de procesar los archivos para permitir seleccionar el mismo archivo nuevamente
        resetFileInput();
      }
    },
    [images, maxImages, onChange, productId, resetFileInput]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleRemove = useCallback(
    async (index: number) => {
      const imageToRemove = images[index];
      const newImages = images.filter((_, i) => i !== index);

      // Si era la imagen principal, hacer la primera como principal
      if (imageToRemove.is_primary && newImages.length > 0) {
        newImages[0].is_primary = true;
      }

      // Reordenar posiciones
      newImages.forEach((img, i) => {
        img.position = i;
      });

      onChange(newImages);

      // Solo eliminar de Cloudinary si es una imagen nueva que aún no está asociada a un producto
      // Las imágenes con ID de BD se eliminarán cuando se guarde el producto
      // Verificamos si tiene public_id pero no tiene un ID de BD (UUID)
      const isUUID = (id: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      };
      
      if (imageToRemove.public_id && imageToRemove.id && !isUUID(imageToRemove.id)) {
        // Es una imagen nueva (tiene public_id pero el ID no es un UUID de BD)
        try {
          await api.delete(`/upload/image/${encodeURIComponent(imageToRemove.public_id)}`);
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
        }
      }
    },
    [images, onChange]
  );

  const handleSetPrimary = useCallback(
    (index: number) => {
      const newImages = images.map((img, i) => ({
        ...img,
        is_primary: i === index,
      }));
      onChange(newImages);
    },
    [images, onChange]
  );

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === index) return;

      const newImages = [...images];
      const draggedImage = newImages[draggedIndex];
      newImages.splice(draggedIndex, 1);
      newImages.splice(index, 0, draggedImage);

      // Actualizar posiciones
      newImages.forEach((img, i) => {
        img.position = i;
      });

      onChange(newImages);
      setDraggedIndex(index);
    },
    [draggedIndex, images, onChange]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={(e) => {
          // Solo abrir el selector si el click no viene del input
          if (!isUploading && fileInputRef.current && e.target !== fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          dragActive
            ? 'border-white bg-white/10'
            : 'border-primary-700 hover:border-primary-500 hover:bg-primary-800/50',
          isUploading && 'pointer-events-none opacity-60'
        )}
      >
        {/*
          Input de archivos oculto pero funcional
          Se activa tanto por click en el dropzone como por el input directamente
        */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            // Asegurar que el evento se procese correctamente
            const files = e.target.files;
            if (files && files.length > 0) {
              handleFiles(files);
            }
          }}
          onClick={(e) => {
            // Prevenir que el click en el input se propague al dropzone
            e.stopPropagation();
          }}
          disabled={isUploading}
          className="hidden"
        />

        {/* Content */}

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
            <p className="text-gray-300">Subiendo imágenes...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 pointer-events-none">
            <div className="p-4 bg-primary-800 rounded-full">
              <Upload className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <p className="text-white font-medium">
                Arrastra imágenes aquí o haz clic para seleccionar
              </p>
              <p className="text-gray-400 text-sm mt-1">
                PNG, JPG, WEBP hasta 10MB ({images.length}/{maxImages})
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Grid */}
      <AnimatePresence mode="popLayout">
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {images.map((image, index) => (
              <motion.div
                key={image.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'relative aspect-square rounded-xl overflow-hidden bg-primary-800 border-2 group cursor-move',
                  image.is_primary ? 'border-yellow-400' : 'border-primary-700',
                  draggedIndex === index && 'opacity-50'
                )}
              >
                <img
                  src={image.url}
                  alt={image.alt_text || `Imagen ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Overlay con controles */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {/* Drag Handle */}
                  <div className="absolute top-2 left-2 p-1 bg-black/50 rounded">
                    <GripVertical className="h-4 w-4 text-white" />
                  </div>

                  {/* Set as Primary */}
                  {!image.is_primary && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPrimary(index);
                      }}
                      className="p-2 bg-yellow-500 rounded-full hover:bg-yellow-400 transition-colors"
                      title="Establecer como principal"
                    >
                      <Star className="h-4 w-4 text-black" />
                    </button>
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(index);
                    }}
                    className="p-2 bg-red-500 rounded-full hover:bg-red-400 transition-colors"
                    title="Eliminar imagen"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>

                {/* Primary Badge */}
                {image.is_primary && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-400 text-black text-xs font-medium rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Principal
                  </div>
                )}

                {/* Position Number */}
                <div className="absolute bottom-2 left-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">{index + 1}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {images.length === 0 && !isUploading && (
        <div className="text-center py-8">
          <ImageIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No hay imágenes subidas</p>
          <p className="text-gray-500 text-sm">La primera imagen será la principal</p>
        </div>
      )}
    </div>
  );
}
