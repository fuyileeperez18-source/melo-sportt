import { Fragment, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] h-[95vh]',
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut' as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: 0.2,
    },
  },
};

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className,
}: ModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Fragment>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={overlayVariants}
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* Modal container */}
          <div className="fixed inset-0 z-[51] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              className={cn(
                'relative w-full bg-primary-900 rounded-2xl shadow-2xl',
                'border border-primary-800',
                sizes[size],
                className
              )}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={modalVariants}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between p-6 border-b border-primary-800">
                  <div>
                    {title && (
                      <h2 className="text-xl font-semibold text-white">{title}</h2>
                    )}
                    {description && (
                      <p className="mt-1 text-sm text-gray-400">{description}</p>
                    )}
                  </div>
                  {showCloseButton && (
                    <IconButton
                      onClick={onClose}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </IconButton>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-6">{children}</div>
            </motion.div>
          </div>
        </Fragment>
      )}
    </AnimatePresence>
  );
}

// Confirmation dialog
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-amber-500 hover:bg-amber-600',
    info: 'bg-blue-500 hover:bg-blue-600',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title={title}>
      <p className="text-gray-400 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          disabled={isLoading}
          className="px-6 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {cancelText}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onConfirm}
          disabled={isLoading}
          className={cn(
            'px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50',
            variantStyles[variant]
          )}
        >
          {isLoading ? 'Loading...' : confirmText}
        </motion.button>
      </div>
    </Modal>
  );
}

// Drawer (side panel)
interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  side?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

const drawerSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Drawer({
  isOpen,
  onClose,
  children,
  title,
  side = 'right',
  size = 'md',
}: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const slideVariants = {
    hidden: {
      x: side === 'right' ? '100%' : '-100%',
    },
    visible: {
      x: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut' as const,
      },
    },
    exit: {
      x: side === 'right' ? '100%' : '-100%',
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Fragment>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className={cn(
              'fixed top-0 bottom-0 z-[51] w-full bg-primary-900 shadow-2xl',
              'border-l border-primary-800 overflow-y-auto',
              side === 'right' ? 'right-0' : 'left-0',
              drawerSizes[size]
            )}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={slideVariants}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-primary-900 border-b border-primary-800">
              {title && (
                <h2 className="text-xl font-semibold text-white">{title}</h2>
              )}
              <IconButton
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </IconButton>
            </div>

            {/* Content */}
            <div className="p-6">{children}</div>
          </motion.div>
        </Fragment>
      )}
    </AnimatePresence>
  );
}

// Bottom sheet (mobile)
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
}: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Fragment>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[51] bg-primary-900 rounded-t-3xl max-h-[90vh] overflow-hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) {
                onClose();
              }
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-12 h-1.5 bg-primary-700 rounded-full" />
            </div>

            {/* Header */}
            {title && (
              <div className="px-6 pb-4 border-b border-primary-800">
                <h2 className="text-xl font-semibold text-white text-center">
                  {title}
                </h2>
              </div>
            )}

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {children}
            </div>
          </motion.div>
        </Fragment>
      )}
    </AnimatePresence>
  );
}
