import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AnimatedLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'glow' | 'pulse' | 'rotate' | 'float' | 'shine';
  showText?: boolean;
}

const sizeMap = {
  sm: 'h-8 md:h-10',
  md: 'h-10 md:h-12',
  lg: 'h-12 md:h-16',
  xl: 'h-16 md:h-20'
};

export function AnimatedLogo({
  className = '',
  size = 'md',
  variant = 'default',
  showText = true
}: AnimatedLogoProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Logo container variants based on animation style
  const containerVariants = {
    default: {
      initial: { opacity: 0, scale: 0.8 },
      animate: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
      },
      hover: { scale: 1.05 },
      tap: { scale: 0.95 }
    },
    glow: {
      initial: { opacity: 0, scale: 0.8 },
      animate: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5 }
      },
      hover: {
        scale: 1.05,
        filter: [
          'drop-shadow(0 0 8px rgba(255,255,255,0.5))',
          'drop-shadow(0 0 16px rgba(255,255,255,0.7))',
          'drop-shadow(0 0 8px rgba(255,255,255,0.5))'
        ],
        transition: {
          filter: {
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }
      },
      tap: { scale: 0.95 }
    },
    pulse: {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        scale: [1, 1.05, 1],
        transition: {
          scale: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }
      },
      hover: { scale: 1.1 },
      tap: { scale: 0.95 }
    },
    rotate: {
      initial: { opacity: 0, rotate: -180 },
      animate: {
        opacity: 1,
        rotate: 0,
        transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }
      },
      hover: {
        rotate: [0, -5, 5, -5, 0],
        transition: { duration: 0.5 }
      },
      tap: { scale: 0.95 }
    },
    float: {
      initial: { opacity: 0, y: 20 },
      animate: {
        opacity: 1,
        y: [0, -10, 0],
        transition: {
          y: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }
      },
      hover: { y: -15 },
      tap: { scale: 0.95 }
    },
    shine: {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        transition: { duration: 0.5 }
      },
      hover: { scale: 1.05 },
      tap: { scale: 0.95 }
    }
  };

  const currentVariant = containerVariants[variant];

  return (
    <motion.div
      className={`relative flex items-center gap-3 ${className}`}
      variants={currentVariant as any}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Logo Image with advanced effects */}
      <div className="relative">
        <motion.img
          src="https://res.cloudinary.com/dpqtlalhr/image/upload/v1767113974/MELO_SPORTT_logo_1_dxnwcv.svg"
          alt="MELO SPORTT"
          className={`${sizeMap[size]} w-auto relative z-10`}
          style={{
            filter: variant === 'glow' && isHovered
              ? 'drop-shadow(0 0 12px rgba(255,255,255,0.6))'
              : 'none'
          }}
        />

        {/* Shine effect overlay */}
        {variant === 'shine' && (
          <motion.div
            className="absolute inset-0 overflow-hidden rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: isHovered ? '200%' : '-100%' }}
              transition={{
                duration: 0.6,
                ease: "easeInOut",
                repeat: isHovered ? Infinity : 0,
                repeatDelay: 0.5
              }}
              style={{
                width: '50%',
                opacity: 0.3,
                transform: 'skewX(-20deg)'
              }}
            />
          </motion.div>
        )}

        {/* Glow ring for glow variant */}
        {variant === 'glow' && isHovered && (
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ scale: 1, opacity: 0 }}
            animate={{
              scale: [1, 1.5, 2],
              opacity: [0.5, 0.3, 0]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut"
            }}
            style={{
              border: '2px solid rgba(255,255,255,0.5)',
              filter: 'blur(4px)'
            }}
          />
        )}
      </div>

      {/* Text with animations */}
      {showText && (
        <div className="relative">
          <motion.span
            className="text-xl md:text-2xl font-bold text-white tracking-wider hidden sm:block"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            MELO SPORTT
          </motion.span>

          {/* Underline animation */}
          <motion.span
            className="absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-white via-gray-300 to-white"
            initial={{ width: '0%', opacity: 0 }}
            animate={{
              width: isHovered ? '100%' : '0%',
              opacity: isHovered ? 1 : 0
            }}
            transition={{ duration: 0.3 }}
          />

          {/* Glitter particles effect on hover */}
          {isHovered && variant === 'glow' && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full"
                  initial={{
                    x: 0,
                    y: 0,
                    opacity: 0,
                    scale: 0
                  }}
                  animate={{
                    x: Math.random() * 100 - 50,
                    y: Math.random() * 60 - 30,
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0]
                  }}
                  transition={{
                    duration: 1 + Math.random(),
                    delay: i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 2
                  }}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`
                  }}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Rotating ring effect for rotate variant */}
      {variant === 'rotate' && isHovered && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-white/30"
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{
            rotate: { duration: 3, repeat: Infinity, ease: "linear" },
            scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          }}
        />
      )}
    </motion.div>
  );
}
