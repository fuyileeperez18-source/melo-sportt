import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  format?: 'currency' | 'number' | 'percent';
  delay?: number;
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'text-white',
  iconBg = 'bg-white/10',
  format = 'number',
  delay = 0,
}: StatCardProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percent':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString('es-CO');
    }
  };

  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${iconBg} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-full ${
              isPositive
                ? 'bg-green-100 text-green-700'
                : isNegative
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isPositive && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
            {isNegative && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-gray-600 font-medium">{title}</p>
        <p className="text-3xl font-bold text-black mt-1">{formatValue(value)}</p>
      </div>
    </motion.div>
  );
}

interface MiniStatProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'white' | 'black';
}

const colorClasses = {
  blue: { bg: 'bg-gray-50', icon: 'text-black', dot: 'bg-black' },
  green: { bg: 'bg-gray-50', icon: 'text-black', dot: 'bg-black' },
  orange: { bg: 'bg-gray-50', icon: 'text-black', dot: 'bg-black' },
  purple: { bg: 'bg-gray-50', icon: 'text-black', dot: 'bg-black' },
  pink: { bg: 'bg-gray-50', icon: 'text-black', dot: 'bg-black' },
  white: { bg: 'bg-gray-50', icon: 'text-black', dot: 'bg-black' },
  black: { bg: 'bg-gray-50', icon: 'text-black', dot: 'bg-black' },
};

export function MiniStat({ title, value, icon: Icon, color }: MiniStatProps) {
  const colors = colorClasses[color];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`flex items-center gap-4 p-4 rounded-xl ${colors.bg} cursor-pointer transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white`}
    >
      <div className={`p-2.5 rounded-lg bg-gray-100`}>
        <Icon className={`w-5 h-5 ${colors.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-600 truncate font-medium">{title}</p>
        <p className="text-xl font-bold text-black">{value}</p>
      </div>
      <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
    </motion.div>
  );
}
