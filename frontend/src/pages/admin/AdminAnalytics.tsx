import { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Eye,
  Calendar,
  Download,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Mock data
const revenueData = [
  { name: 'Ene', revenue: 4000, orders: 24, visitors: 1200 },
  { name: 'Feb', revenue: 3000, orders: 18, visitors: 1100 },
  { name: 'Mar', revenue: 5000, orders: 32, visitors: 1400 },
  { name: 'Abr', revenue: 4500, orders: 28, visitors: 1300 },
  { name: 'May', revenue: 6000, orders: 38, visitors: 1600 },
  { name: 'Jun', revenue: 5500, orders: 35, visitors: 1500 },
  { name: 'Jul', revenue: 7000, orders: 45, visitors: 1800 },
];

const categoryData = [
  { name: 'Camisetas', value: 35, color: '#000000' },
  { name: 'Chaquetas', value: 25, color: '#404040' },
  { name: 'Pantalones', value: 20, color: '#737373' },
  { name: 'Accesorios', value: 20, color: '#a3a3a3' },
];

const trafficSources = [
  { name: 'Búsqueda Orgánica', value: 40, color: '#10b981' },
  { name: 'Directo', value: 25, color: '#3b82f6' },
  { name: 'Redes Sociales', value: 20, color: '#8b5cf6' },
  { name: 'Referidos', value: 10, color: '#f59e0b' },
  { name: 'Email', value: 5, color: '#ef4444' },
];

const topProducts = [
  { name: 'Camiseta Essential Cotton', sales: 245, revenue: 12005 },
  { name: 'Chaqueta Denim Urban', sales: 189, revenue: 35721 },
  { name: 'Pantalón Slim Fit Chino', sales: 156, revenue: 13884 },
  { name: 'Cinturón Premium Leather', sales: 134, revenue: 7906 },
  { name: 'Reloj Minimalist', sales: 98, revenue: 14602 },
];

const conversionData = [
  { name: 'Lun', rate: 3.2 },
  { name: 'Mar', rate: 3.5 },
  { name: 'Mié', rate: 3.1 },
  { name: 'Jue', rate: 3.8 },
  { name: 'Vie', rate: 4.2 },
  { name: 'Sáb', rate: 4.5 },
  { name: 'Dom', rate: 3.9 },
];

const timeRanges = ['7 días', '30 días', '90 días', '12 meses'];

export function AdminAnalytics() {
  const [selectedRange, setSelectedRange] = useState('30 días');

  const stats = [
    {
      title: 'Ingresos Totales',
      value: formatCurrency(35000),
      change: '+12.5%',
      changeType: 'increase' as const,
      icon: DollarSign,
    },
    {
      title: 'Total Pedidos',
      value: '165',
      change: '+8.2%',
      changeType: 'increase' as const,
      icon: ShoppingCart,
    },
    {
      title: 'Total Visitantes',
      value: '8,942',
      change: '+15.3%',
      changeType: 'increase' as const,
      icon: Eye,
    },
    {
      title: 'Tasa de Conversión',
      value: '3.7%',
      change: '-0.5%',
      changeType: 'decrease' as const,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Analytics</h1>
          <p className="text-gray-600">Rastrea el rendimiento de tu tienda</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex bg-white rounded-lg p-1 border border-gray-200">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  selectedRange === range
                    ? 'bg-black text-white'
                    : 'text-gray-700 hover:text-black'
                )}
              >
                {range}
              </button>
            ))}
          </div>
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <stat.icon className="h-5 w-5 text-black" />
              </div>
              <span className={cn(
                'flex items-center gap-1 text-sm font-medium',
                stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
              )}>
                {stat.changeType === 'increase' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {stat.change}
              </span>
            </div>
            <p className="text-gray-600 text-sm">{stat.title}</p>
            <p className="text-2xl font-bold text-black">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-black mb-6">Ingresos y Pedidos</h3>
          <div className="h-[300px] min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
              <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#000000" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="name" stroke="#666" style={{ fontSize: '12px' }} />
              <YAxis stroke="#666" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px' }}
                labelStyle={{ color: '#000', fontWeight: 600 }}
                itemStyle={{ color: '#666' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#000000"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name="Ingresos ($)"
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                name="Pedidos"
              />
              </AreaChart>
            </ResponsiveContainer>
          </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-black mb-6">Ventas por Categoría</h3>
          <div className="h-[200px] min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              <PieChart>
                <Pie
                  data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px' }}
                itemStyle={{ color: '#000' }}
              />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {categoryData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-700 text-sm truncate">{item.name}</span>
                <span className="text-black text-sm ml-auto font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-black mb-6">Fuentes de Tráfico</h3>
          <div className="space-y-4">
            {trafficSources.map((source) => (
              <div key={source.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-800 text-sm sm:text-base">{source.name}</span>
                  <span className="text-black font-medium">{source.value}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${source.value}%`, backgroundColor: source.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-black mb-6">Tasa de Conversión</h3>
          <div className="h-[250px] min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
              <BarChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="name" stroke="#666" style={{ fontSize: '12px' }} />
                <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px' }}
                  labelStyle={{ color: '#000', fontWeight: 600 }}
                  itemStyle={{ color: '#666' }}
                />
                <Bar dataKey="rate" fill="#000000" radius={[4, 4, 0, 0]} name="Conversión %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-black mb-6">Productos Más Vendidos</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 sm:px-4 text-sm font-semibold text-black">#</th>
                <th className="text-left py-3 px-2 sm:px-4 text-sm font-semibold text-black">Producto</th>
                <th className="text-right py-3 px-2 sm:px-4 text-sm font-semibold text-black">Ventas</th>
                <th className="text-right py-3 px-2 sm:px-4 text-sm font-semibold text-black">Ingresos</th>
                <th className="text-right py-3 px-2 sm:px-4 text-sm font-semibold text-black hidden sm:table-cell">% del Total</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product, index) => {
                const totalRevenue = topProducts.reduce((sum, p) => sum + p.revenue, 0);
                const percentage = ((product.revenue / totalRevenue) * 100).toFixed(1);
                return (
                  <tr key={product.name} className="border-b border-gray-100 last:border-0">
                    <td className="py-4 px-2 sm:px-4 text-gray-600">{index + 1}</td>
                    <td className="py-4 px-2 sm:px-4 text-black font-medium">{product.name}</td>
                    <td className="py-4 px-2 sm:px-4 text-right text-gray-700">{product.sales}</td>
                    <td className="py-4 px-2 sm:px-4 text-right text-black font-medium">
                      {formatCurrency(product.revenue)}
                    </td>
                    <td className="py-4 px-2 sm:px-4 text-right hidden sm:table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-black rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-gray-700 text-sm w-12">{percentage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
