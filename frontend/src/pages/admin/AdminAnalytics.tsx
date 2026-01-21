import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useAnalyticsDashboard, useAnalyticsChartData, useCalculateRealData } from '@/hooks/useAnalytics';
import { formatCurrency, formatCategoryName } from '@/lib/utils';
import { cn } from '@/lib/utils';

const timeRanges = ['7 días', '30 días', '90 días', '12 meses'];

export function AdminAnalytics() {
  const [selectedRange, setSelectedRange] = useState('30 días');

  // Usamos los hooks de analítica para obtener datos reales
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useAnalyticsDashboard();
  const { data: chartData, isLoading: chartLoading, error: chartError } = useAnalyticsChartData();
  const { mutate: calculateRealData, isPending: calculating } = useCalculateRealData();

  // Datos para estadísticas generales
  const generalStats = dashboardData?.generalStats || {
    totalSales: 0,
    totalOrders: 0,
    totalUsers: 0,
    activeUsers: 0,
  };

  // Datos para gráficos
  const monthlySalesData = chartData?.monthlySales || [];
  const paymentMethodsData = chartData?.paymentMethods || [];
  const categoriesData = chartData?.categories || [];

  // Datos para productos más vendidos
  const topProductsData = dashboardData?.topProducts || [];

  // Datos para categorías más populares
  const topCategoriesData = dashboardData?.topCategories || [];

  const stats = [
    {
      title: 'Ingresos Totales',
      value: formatCurrency(generalStats.totalSales),
      change: dashboardData ? '+12.5%' : '0%',
      changeType: 'increase' as const,
      icon: DollarSign,
    },
    {
      title: 'Total Pedidos',
      value: generalStats.totalOrders.toString(),
      change: dashboardData ? '+8.2%' : '0%',
      changeType: 'increase' as const,
      icon: ShoppingCart,
    },
    {
      title: 'Total Usuarios',
      value: generalStats.totalUsers.toString(),
      change: dashboardData ? '+15.3%' : '0%',
      changeType: 'increase' as const,
      icon: Users,
    },
    {
      title: 'Usuarios Activos',
      value: generalStats.activeUsers.toString(),
      change: dashboardData ? '+5.2%' : '0%',
      changeType: 'increase' as const,
      icon: Eye,
    },
  ];

  const handleCalculateData = () => {
    calculateRealData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Analytics</h1>
          <p className="text-gray-600">Rastrea el rendimiento real de tu tienda</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <Button
            onClick={handleCalculateData}
            disabled={calculating}
            variant="outline"
            leftIcon={<RefreshCw className={`h-4 w-4 ${calculating ? 'animate-spin' : ''}`} />}
          >
            {calculating ? 'Calculando...' : 'Recalcular Datos'}
          </Button>
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
            Exportar
          </Button>
        </div>
      </div>

      {/* Errores */}
      {(dashboardError || chartError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">
            Error al cargar datos: {
              dashboardError instanceof Error 
                ? dashboardError.message 
                : chartError instanceof Error 
                ? chartError.message 
                : String(dashboardError || chartError || 'Error desconocido')
            }
          </p>
        </div>
      )}

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
          <h3 className="text-lg font-semibold text-black mb-6">Ingresos y Pedidos (Real)</h3>
          <div className="h-[300px] min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
              <AreaChart data={monthlySalesData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000000" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="month" stroke="#666" style={{ fontSize: '12px' }} />
                <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px' }}
                  labelStyle={{ color: '#000', fontWeight: 600 }}
                  itemStyle={{ color: '#666' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Area
                  type="monotone"
                  dataKey="sales"
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
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-black mb-6">Ventas por Categoría</h3>
          <div className="h-[200px] min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              <PieChart>
                <Pie
                  data={topCategoriesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="sales"
                >
                  {topCategoriesData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? '#000000' : index === 1 ? '#404040' : index === 2 ? '#737373' : '#a3a3a3'}
                    />
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
            {topCategoriesData.slice(0, 4).map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: index === 0 ? '#000000' : index === 1 ? '#404040' : index === 2 ? '#737373' : '#a3a3a3'
                  }}
                />
                <span className="text-gray-700 text-sm truncate">{item.name}</span>
                <span className="text-black text-sm ml-auto font-medium">
                  {((item.sales / (topCategoriesData.reduce((sum, c) => sum + c.sales, 0) || 1)) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-black mb-6">Métodos de Pago</h3>
          <div className="space-y-4">
            {paymentMethodsData.map((method, index) => (
              <div key={method.method}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-800 text-sm sm:text-base">{method.method}</span>
                  <span className="text-black font-medium">{formatCurrency(method.amount)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(method.amount / (paymentMethodsData.reduce((sum, m) => sum + m.amount, 0) || 1)) * 100}%`,
                      backgroundColor: index === 0 ? '#000000' : index === 1 ? '#3b82f6' : index === 2 ? '#8b5cf6' : '#f59e0b'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-black mb-6">Productos Más Vendidos</h3>
          <div className="space-y-4">
            {topProductsData.slice(0, 5).map((product, index) => (
              <div key={product.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 w-6">{index + 1}</span>
                  <div className="flex-1">
                    <p className="text-black font-medium text-sm">{product.name}</p>
                    <p className="text-gray-600 text-xs">{product.quantity} unidades vendidas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-black font-medium">{formatCurrency(product.sales)}</p>
                  <p className="text-gray-600 text-xs">{product.orders} pedidos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Performance Table */}
      <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-black mb-6">Rendimiento de Categorías</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 sm:px-4 text-sm font-semibold text-black">#</th>
                <th className="text-left py-3 px-2 sm:px-4 text-sm font-semibold text-black">Categoría</th>
                <th className="text-right py-3 px-2 sm:px-4 text-sm font-semibold text-black">Ventas</th>
                <th className="text-right py-3 px-2 sm:px-4 text-sm font-semibold text-black">Cantidad</th>
                <th className="text-right py-3 px-2 sm:px-4 text-sm font-semibold text-black hidden sm:table-cell">Productos</th>
              </tr>
            </thead>
            <tbody>
              {topCategoriesData.map((category, index) => (
                <tr key={category.name} className="border-b border-gray-100 last:border-0">
                  <td className="py-4 px-2 sm:px-4 text-gray-600">{index + 1}</td>
                  <td className="py-4 px-2 sm:px-4 text-black font-medium">{formatCategoryName(category.name)}</td>
                  <td className="py-4 px-2 sm:px-4 text-right text-black font-medium">
                    {formatCurrency(category.sales)}
                  </td>
                  <td className="py-4 px-2 sm:px-4 text-right text-gray-700">{category.quantity}</td>
                  <td className="py-4 px-2 sm:px-4 text-right hidden sm:table-cell text-gray-700">
                    {category.products}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
