import { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Search, X, AlertCircle, Check } from 'lucide-react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      success,
      hint,
      leftIcon,
      rightIcon,
      onClear,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const inputType = type === 'password' && showPassword ? 'text' : type;

    return (
      <div className="w-full">
        {label && (
          <motion.label
            className="block text-sm font-medium text-gray-300 mb-2"
            animate={{
              color: error ? '#ef4444' : success ? '#22c55e' : '#d1d5db',
            }}
          >
            {label}
          </motion.label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={inputType}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'w-full h-12 px-4 bg-primary-900 border border-primary-700 rounded-lg',
              'text-white placeholder-gray-400',
              'transition-all duration-300',
              'focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon && 'pl-12',
              (rightIcon || type === 'password' || onClear) && 'pr-12',
              error && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
              success && 'border-green-500 focus:ring-green-500/20 focus:border-green-500',
              isFocused && 'scale-[1.01]',
              className
            )}
            {...props}
          />

          {/* Right side icons */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {onClear && props.value && (
              <motion.button
                type="button"
                onClick={onClear}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}

            {type === 'password' && (
              <motion.button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-gray-400 hover:text-white"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </motion.button>
            )}

            {error && <AlertCircle className="h-5 w-5 text-red-500" />}
            {success && <Check className="h-5 w-5 text-green-500" />}
            {rightIcon && !error && !success && (
              <span className="text-gray-400">{rightIcon}</span>
            )}
          </div>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 text-sm text-red-500"
            >
              {error}
            </motion.p>
          )}
          {success && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 text-sm text-green-500"
            >
              {success}
            </motion.p>
          )}
          {hint && !error && !success && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 text-sm text-gray-500"
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = 'Input';

// Search Input
interface SearchInputProps extends Omit<InputProps, 'type' | 'leftIcon'> {
  onSearch?: (value: string) => void;
}

export function SearchInput({ onSearch, onClear, ...props }: SearchInputProps) {
  return (
    <Input
      type="search"
      leftIcon={<Search className="h-5 w-5" />}
      onClear={onClear}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onSearch) {
          onSearch((e.target as HTMLInputElement).value);
        }
      }}
      {...props}
    />
  );
}

// Animated floating label input
interface FloatingLabelInputProps extends InputProps {}

export const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ label, className, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);

    return (
      <div className="relative">
        <input
          ref={ref}
          className={cn(
            'peer w-full h-14 px-4 pt-4 bg-primary-900 border border-primary-700 rounded-lg',
            'text-white placeholder-gray-400',
            'transition-all duration-300',
            'focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30',
            className
          )}
          placeholder={label}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false);
            setHasValue(!!e.target.value);
          }}
          onChange={(e) => {
            setHasValue(!!e.target.value);
            props.onChange?.(e);
          }}
          {...props}
        />
        <motion.label
          className={cn(
            'absolute left-4 transition-all duration-300 pointer-events-none',
            'text-gray-400'
          )}
          animate={{
            top: isFocused || hasValue ? '0.5rem' : '50%',
            y: isFocused || hasValue ? 0 : '-50%',
            fontSize: isFocused || hasValue ? '0.75rem' : '1rem',
            color: isFocused ? '#ffffff' : '#9ca3af',
          }}
        >
          {label}
        </motion.label>
      </div>
    );
  }
);

FloatingLabelInput.displayName = 'FloatingLabelInput';

// Textarea
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full min-h-[120px] px-4 py-3 bg-primary-900 border border-primary-700 rounded-lg',
            'text-white placeholder-gray-400',
            'transition-all duration-300',
            'focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'resize-none',
            error && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Select
export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full h-12 px-4 bg-primary-900 border border-primary-700 rounded-lg',
            'text-white',
            'transition-all duration-300',
            'focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'appearance-none cursor-pointer',
            error && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
