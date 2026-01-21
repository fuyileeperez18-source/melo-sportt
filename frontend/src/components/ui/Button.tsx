import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variants = {
  primary:
    'bg-white text-black hover:bg-gray-100 active:bg-gray-200 shadow-lg shadow-white/10',
  secondary:
    'bg-primary-800 text-white hover:bg-primary-700 active:bg-primary-600 border border-primary-700',
  outline:
    'bg-transparent text-white border-2 border-white hover:bg-white hover:text-black',
  ghost: 'bg-transparent text-black hover:bg-gray-100',
  link: 'bg-transparent text-white underline-offset-4 hover:underline',
};

const sizes = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-base',
  lg: 'h-13 px-8 text-lg',
  xl: 'h-16 px-12 text-xl',
  icon: 'h-11 w-11',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 rounded-full font-medium',
          'transition-all duration-300 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black',
          'disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

// Icon button variant
export const IconButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size="icon"
        variant="ghost"
        className={cn('rounded-full', className)}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

// Animated CTA Button with hover effect
interface CTAButtonProps extends ButtonProps {
  text: string;
}

export function CTAButton({ text, className, ...props }: CTAButtonProps) {
  return (
    <motion.button
      whileHover="hover"
      className={cn(
        'relative overflow-hidden rounded-full bg-white px-8 py-4 text-black font-semibold',
        'transition-all duration-300',
        className
      )}
      {...props}
    >
      <motion.span
        className="relative z-10 flex items-center gap-2"
        variants={{
          hover: { x: 5 },
        }}
        transition={{ duration: 0.3 }}
      >
        {text}
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={{
            hover: { x: 5 },
          }}
          transition={{ duration: 0.3 }}
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </motion.svg>
      </motion.span>
      <motion.div
        className="absolute inset-0 bg-gray-100"
        initial={{ x: '-100%' }}
        variants={{
          hover: { x: 0 },
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  );
}

// Underline link button
interface UnderlineLinkProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function UnderlineLink({ children, className, onClick }: UnderlineLinkProps) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'relative text-white font-medium overflow-hidden group',
        className
      )}
      whileHover="hover"
    >
      <span className="relative z-10">{children}</span>
      <motion.span
        className="absolute bottom-0 left-0 h-[2px] bg-white"
        initial={{ width: '0%' }}
        variants={{
          hover: { width: '100%' },
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </motion.button>
  );
}
