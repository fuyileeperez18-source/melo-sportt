# Análisis del Flujo de Checkout - Frontend → Backend → Base de Datos

## Comparación de Campos

### 1. Shipping Address

| Campo | Frontend | Backend Schema | Base de Datos | Estado |
|-------|----------|----------------|---------------|--------|
| `email` | ✅ Enviado | ✅ Opcional | ✅ En JSONB | ✅ OK |
| `firstName` | ✅ Enviado | ✅ Opcional | ✅ En JSONB | ✅ OK |
| `lastName` | ✅ Enviado | ✅ Opcional | ✅ En JSONB | ✅ OK |
| `phone` | ✅ Enviado | ✅ Opcional | ✅ En JSONB | ✅ OK |
| `address` | ✅ Enviado | ✅ Opcional | ✅ En JSONB | ✅ OK |
| `apartment` | ✅ Enviado (opcional) | ✅ Opcional | ✅ En JSONB | ✅ OK |
| `city` | ✅ Enviado | ✅ Opcional | ✅ En JSONB | ✅ OK |
| `state` | ✅ Enviado | ✅ Opcional | ✅ En JSONB | ✅ OK |
| `postalCode` | ✅ Enviado | ✅ Opcional | ✅ En JSONB | ✅ OK |
| `country` | ✅ Enviado | ✅ Opcional | ✅ En JSONB | ✅ OK |

**Conclusión**: ✅ Todos los campos están alineados correctamente.

### 2. Order Items

| Campo | Frontend | Backend Schema | Base de Datos | Estado |
|-------|----------|----------------|---------------|--------|
| `product_id` | ✅ Enviado | ✅ Requerido | ✅ UUID | ✅ OK |
| `variant_id` | ✅ Enviado (opcional) | ✅ Opcional | ✅ UUID | ✅ OK |
| `quantity` | ✅ Enviado | ✅ Requerido | ✅ INTEGER | ✅ OK |
| `price` | ✅ Enviado | ✅ Requerido | ✅ DECIMAL(12,2) | ✅ OK |
| `total` | ❌ No enviado | ❌ No en schema | ✅ DECIMAL(12,2) | ⚠️ Calculado en backend |

**Conclusión**: ✅ OK - `total` se calcula en el backend como `price * quantity`.

### 3. Order Main Fields

| Campo | Frontend | Backend Schema | Base de Datos | Estado |
|-------|----------|----------------|---------------|--------|
| `user_id` | ✅ Enviado | ✅ Opcional | ✅ UUID | ✅ OK |
| `order_number` | ✅ Enviado | ✅ Opcional | ✅ VARCHAR(50) | ✅ OK |
| `subtotal` | ✅ Enviado | ✅ Requerido | ✅ DECIMAL(12,2) | ✅ OK |
| `discount` | ✅ Enviado (0) | ✅ Opcional (default 0) | ✅ DECIMAL(12,2) | ✅ OK |
| `shipping_cost` | ✅ Enviado | ✅ Requerido | ✅ DECIMAL(12,2) | ✅ OK |
| `tax` | ✅ Enviado | ✅ Requerido | ✅ DECIMAL(12,2) | ✅ OK |
| `total` | ✅ Enviado | ✅ Requerido | ✅ DECIMAL(12,2) | ✅ OK |
| `status` | ✅ Enviado | ✅ Opcional | ✅ VARCHAR(20) | ✅ OK |
| `payment_status` | ✅ Enviado | ✅ Opcional | ✅ VARCHAR(20) | ✅ OK |
| `payment_method` | ⚠️ 'prepaid' | ✅ String (default 'card') | ✅ VARCHAR(50) | ⚠️ PROBLEMA |
| `payment_id` | ✅ Enviado (Wompi) | ✅ Opcional | ✅ VARCHAR(255) | ✅ OK |
| `stripe_payment_intent_id` | ❌ No enviado | ✅ Opcional | ✅ VARCHAR(255) | ✅ OK |
| `billing_address` | ❌ No enviado | ✅ Opcional | ✅ JSONB | ✅ OK |
| `notes` | ❌ No enviado | ✅ Opcional | ✅ TEXT | ✅ OK |
| `coupon_code` | ❌ No enviado | ✅ Opcional | ✅ VARCHAR(50) | ✅ OK |

## Problemas Encontrados

### ⚠️ PROBLEMA 1: payment_method inconsistente

**Frontend envía:**
- `'prepaid'` para pagos con Wompi (línea 214 de CheckoutPage.tsx)
- `'cash_on_delivery'` para pago contra entrega (línea 156)

**Backend espera:**
- `'card'` por defecto
- `'cash_on_delivery'` está manejado correctamente

**Solución**: Cambiar `'prepaid'` a `'wompi'` o `'card'` en el frontend.

### ✅ TODO LO DEMÁS ESTÁ BIEN

Todos los demás campos están correctamente alineados entre frontend, backend y base de datos.

## Flujo Completo

### 1. Usuario completa formulario de envío
- Frontend valida con `shippingSchema` (Zod)
- Campos: email, firstName, lastName, phone, address, apartment, city, state, postalCode, country

### 2. Usuario selecciona método de pago
- **Wompi**: Frontend llama a `WompiPayment` component
- **Cash on Delivery**: Frontend llama a `handleCashOnDelivery`

### 3. Para Wompi:
- Frontend crea transacción en Wompi
- Cuando el pago es exitoso, llama a `handlePaymentSuccess`
- Frontend envía orden al backend con:
  - `payment_method: 'prepaid'` ⚠️ DEBERÍA SER 'wompi'
  - `payment_id: paymentId` (ID de transacción de Wompi)
  - `status: 'confirmed'`
  - `payment_status: 'paid'`

### 4. Para Cash on Delivery:
- Frontend llama directamente a `handleCashOnDelivery`
- Frontend envía orden al backend con:
  - `payment_method: 'cash_on_delivery'` ✅ CORRECTO
  - `status: 'pending'`
  - `payment_status: 'pending'`

### 5. Backend procesa la orden
- Valida con `createOrderSchema` (Zod)
- Si `payment_method === 'cash_on_delivery'`, usa `createCashOnDelivery`
- Si no, usa `create` normal
- Guarda en BD con todos los campos

## Recomendaciones

1. ✅ Cambiar `payment_method: 'prepaid'` a `payment_method: 'wompi'` en el frontend
2. ✅ Agregar validación en el backend para aceptar `'wompi'` como payment_method válido
3. ✅ Considerar agregar `billing_address` en el futuro si es necesario
4. ✅ Considerar agregar soporte para `coupon_code` en el frontend
