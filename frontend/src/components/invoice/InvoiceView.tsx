import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Printer, Download, Calendar, CreditCard, Package, MapPin, User, Mail, Phone } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface InvoiceData {
  id: string;
  invoice_number: string;
  order_number: string;
  issue_date: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  payment_method: string;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  tax: number;
  total: number;
  full_name: string;
  email: string;
  phone: string;
  shipping_address: {
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

interface InvoiceViewProps {
  invoiceId: string;
  onClose?: () => void;
}

export function InvoiceView({ invoiceId, onClose }: InvoiceViewProps) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/details`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Error al cargar factura');

      const data = await response.json();
      setInvoice(data.data);
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('No se pudo cargar la factura');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.open(`/api/invoices/${invoiceId}/print`, '_blank');
  };

  const handleDownload = () => {
    // Open in new tab and trigger browser print dialog
    const printWindow = window.open(`/api/invoices/${invoiceId}/print`, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center p-12">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">Factura no encontrada</p>
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-gray-500',
    sent: 'bg-blue-500',
    paid: 'bg-green-500',
    cancelled: 'bg-red-500',
  };

  const statusLabels = {
    draft: 'Borrador',
    sent: 'Enviada',
    paid: 'Pagada',
    cancelled: 'Cancelada',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="bg-black text-white p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">MELO SPORTT</h1>
            <p className="text-sm text-gray-300">
              Cartagena de Indias, Colombia<br />
              741 Cra. 17, Barrio San Francisco<br />
              Email: info@melosportt.com
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold mb-2">FACTURA</h2>
            <p className="text-sm">
              Nº {invoice.invoice_number}<br />
              Fecha: {new Date(invoice.issue_date).toLocaleDateString('es-CO')}
            </p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${statusColors[invoice.status]}`}>
              {statusLabels[invoice.status]}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
          >
            Imprimir
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleDownload}
          >
            Descargar
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="ml-auto"
            >
              Cerrar
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Customer Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-black mb-3 flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del Cliente
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                {invoice.full_name || 'N/A'}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                {invoice.email || 'N/A'}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                {invoice.phone || 'N/A'}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-black mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Dirección de Envío
            </h3>
            <p className="text-sm text-gray-700">
              {invoice.shipping_address?.address || 'N/A'}<br />
              {invoice.shipping_address?.city}, {invoice.shipping_address?.state}<br />
              {invoice.shipping_address?.postalCode}
            </p>
          </div>
        </div>

        {/* Order Info */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Package className="w-4 h-4" />
            <span>Orden: <strong>{invoice.order_number}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <CreditCard className="w-4 h-4" />
            <span>Pago: <strong>{invoice.payment_method}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Fecha: <strong>{new Date(invoice.issue_date).toLocaleDateString('es-CO')}</strong></span>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Producto</th>
                <th className="text-center py-3 px-2 font-semibold text-gray-700">Cantidad</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">Precio</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-3 px-2 text-gray-800">{item.product_name}</td>
                  <td className="py-3 px-2 text-center text-gray-600">{item.quantity}</td>
                  <td className="py-3 px-2 text-right text-gray-600">{formatCurrency(item.price)}</td>
                  <td className="py-3 px-2 text-right font-semibold text-gray-800">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t-2 border-gray-200 pt-4">
          <div className="max-w-sm ml-auto space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento:</span>
                <span>-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Envío:</span>
              <span>{formatCurrency(invoice.shipping_cost)}</span>
            </div>
            {invoice.tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>IVA:</span>
                <span>{formatCurrency(invoice.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-black border-t pt-2">
              <span>TOTAL:</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-6 border-t">
          <p>Gracias por tu compra en Melo Sportt</p>
        </div>
      </div>
    </motion.div>
  );
}
