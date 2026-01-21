import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import type { OrderStatus, PaymentStatus } from '@/types';

interface RevenueChartProps {
  data: Array<{ date: string; revenue: number; orders?: number }>;
  title?: string;
}

export function RevenueChart({ data, title = 'Ingresos' }: RevenueChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-black">{title}</h3>
          <p className="text-sm text-gray-500">Últimos 30 días</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-black" />
            <span className="text-sm text-gray-600">Ingresos</span>
          </div>
        </div>
      </div>
      <div className="h-72 min-h-[288px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={288}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#000000" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#000000" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              tickFormatter={formatCurrency}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number | undefined) => [
                new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  minimumFractionDigits: 0,
                }).format(value || 0),
                'Ingresos',
              ]}
              labelFormatter={(label) => formatDate(label)}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#000000"
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

interface OrdersChartProps {
  data: Array<{ status: string; count: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  processing: '#8b5cf6',
  shipped: '#06b6d4',
  delivered: '#10b981',
  cancelled: '#ef4444',
  refunded: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  processing: 'Procesando',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

export function OrdersChart({ data }: OrdersChartProps) {
  const total = data.reduce((acc, item) => acc + item.count, 0);

  const chartData = data.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] || '#6b7280',
    percentage: total > 0 ? ((item.count / total) * 100).toFixed(1) : 0,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-black">Pedidos por Estado</h3>
        <p className="text-sm text-gray-500">{total} pedidos en total</p>
      </div>
      <div className="flex items-center justify-between">
        <div className="w-48 h-48 min-h-[192px] min-w-[192px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={192} minHeight={192}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                formatter={(value: number | undefined, name: string | undefined) => [
                  `${value || 0} pedidos`,
                  name || '',
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3">
          {chartData.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium text-gray-700">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-black">{item.value}</span>
                <span className="text-xs text-gray-500">({item.percentage}%)</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

interface CategoryChartProps {
  data: Array<{
    name: string;
    revenue: number;
    items_sold: number;
    orders_count: number;
  }>;
}

export function CategoryChart({ data }: CategoryChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-black">Ventas por Categoría</h3>
        <p className="text-sm text-gray-500">Rendimiento de cada categoría</p>
      </div>
      <div className="h-72 min-h-[288px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={288}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
            <XAxis
              type="number"
              tickFormatter={formatCurrency}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#374151', fontSize: 12 }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number | undefined) => [
                new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  minimumFractionDigits: 0,
                }).format(value || 0),
                'Ingresos',
              ]}
            />
            <Bar
              dataKey="revenue"
              fill="url(#categoryGradient)"
              radius={[0, 8, 8, 0]}
            />
            <defs>
              <linearGradient id="categoryGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#000000" />
                <stop offset="100%" stopColor="#4b5563" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

interface MonthlyChartProps {
  data: Array<{
    month: string;
    month_label: string;
    revenue: number;
    orders: number;
  }>;
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-black">Ingresos Mensuales</h3>
        <p className="text-sm text-gray-500">Comparativa de los últimos 12 meses</p>
      </div>
      <div className="h-72 min-h-[288px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={288}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#000000" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#000000" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="month_label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              dy={10}
            />
            <YAxis
              tickFormatter={formatCurrency}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number | undefined, name: string | undefined) => [
                new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  minimumFractionDigits: 0,
                }).format(value || 0),
                name === 'revenue' ? 'Ingresos' : 'Pedidos',
              ]}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Ingresos"
              stroke="#000000"
              strokeWidth={2}
              fill="url(#monthlyGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

interface GenderChartProps {
  data: Array<{
    gender: string;
    revenue: number;
    items_sold: number;
    orders: number;
  }>;
}

const GENDER_LABELS: Record<string, string> = {
  hombre: 'Hombre',
  mujer: 'Mujer',
  unisex: 'Unisex',
  nino: 'Niño',
  nina: 'Niña',
};

const GENDER_COLORS: Record<string, string> = {
  hombre: '#ffffff',
  mujer: '#888888',
  unisex: '#666666',
  nino: '#444444',
  nina: '#333333',
};

export function GenderChart({ data }: GenderChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-black">Ventas por Género</h3>
        <p className="text-sm text-gray-500">Distribución por categoría de género</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {data.map((item, index) => (
          <motion.div
            key={item.gender}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            className="p-4 rounded-xl text-center cursor-pointer transition-all bg-gray-50 border border-gray-100 hover:bg-gray-100 hover:shadow-md"
          >
            <div
              className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
              style={{ backgroundColor: GENDER_COLORS[item.gender] || '#6b7280' }}
            >
              <span className="text-white font-bold text-lg">
                {GENDER_LABELS[item.gender]?.[0] || '?'}
              </span>
            </div>
            <p className="text-sm font-medium text-black mb-1">
              {GENDER_LABELS[item.gender] || item.gender}
            </p>
            <p className="text-lg font-bold text-black">{formatCurrency(item.revenue)}</p>
            <p className="text-xs text-gray-500">{item.items_sold} vendidos</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
