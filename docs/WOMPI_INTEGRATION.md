# Wompi - Integración Completa de Pagos

## 📋 Resumen

Esta implementación permite recibir pagos a través de **Wompi** (pasarela de pagos de Bancolombia), con soporte para tarjetas de crédito/débito, PSE, Nequi y más.

### Características

- ✅ Modo **SANDBOX** incluido para pruebas sin cargos reales
- ✅ Fácil migración a **PRODUCCIÓN** cambiando solo credenciales
- ✅ Datos de prueba integrados y accesibles desde la UI
- ✅ Badge visual del ambiente actual (Sandbox/Producción)
- ✅ Comisiones automáticas del 10%
- ✅ Webhook handling con validación de checksum
- ✅ Polling de estado de transacción
- ✅ Soporte para múltiples métodos de pago

---

## 🏗️ Arquitectura de la Implementación

### Backend

#### 1. Servicio Principal: `wompi.service.ts`

El servicio de Wompi incluye:

| Método | Descripción |
|--------|-------------|
| `getAcceptanceToken()` | Obtiene token de aceptación de términos y condiciones |
| `createTransaction(data)` | Crea una transacción de pago |
| `tokenizeCard(data)` | Tokeniza una tarjeta de crédito |
| `getTransaction(id)` | Consulta estado de una transacción |
| `processWebhook(event, signature, timestamp)` | Procesa webhook de Wompi |
| `generateIntegritySignature(...)` | Genera hash de integridad para el widget |
| `calculateCommission(total)` | Calcula comisión del 10% |
| `isSimulatedMode()` | Verifica si está en modo simulación |
| `simulatePaymentSuccess(id)` | Simula pago exitoso (solo dev) |

#### 2. Endpoints Implementados

**Endpoint** | Método | Descripción
------------|---------|-------------
`/api/orders/wompi/create-transaction` | POST | Crea transacción de pago
`/api/orders/wompi/transaction/:id` | GET | Obtiene estado de transacción
`/api/orders/wompi/tokenize` | POST | Tokeniza tarjeta
`/api/orders/wompi/webhook` | POST | Recibe webhooks de Wompi
`/api/orders/wompi/simulate-payment` | POST | Simula pago (solo dev)

#### 3. Tabla de Comisiones

**Tabla: `wompi_commissions`**
Registra las comisiones del 10% cobradas por el marketplace.

```sql
CREATE TABLE wompi_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  transaction_id VARCHAR(255) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL, -- 10%
  merchant_amount DECIMAL(12,2) NOT NULL,   -- 90%
  status VARCHAR(50) DEFAULT 'pending',     -- pending, paid, cancelled
  fuyi_phone VARCHAR(20) NOT NULL,           -- Identificador del receptor
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### Frontend

#### 1. Componente Principal: `WompiPayment.tsx`

Características del componente:

- ✅ Badge visual del ambiente actual (Sandbox/Producción)
- ✅ Panel de datos de prueba colapsable (solo en Sandbox)
- ✅ Botones para copiar y aplicar tarjetas de prueba
- ✅ Soporte para:
  - Tarjeta de Crédito/Débito
  - PSE / Bancolombia
  - Nequi
- ✅ Polling automático para verificar estado
- ✅ Mensajes de error claros
- ✅ Estados visuales: Loading, Success, Error

#### 2. Rutas Configuradas

```typescript
/checkout/wompi/callback → Página de callback de pagos
```

---

## 🔐 Configuración

### Variables de Entorno Requeridas

```bash
# ===========================================
# WOMPI (Colombia - Bancolombia)
# ===========================================

# MODO SANDBOX (Pruebas - Sin cargos reales)
WOMPI_PUBLIC_KEY=pub_test_your_wompi_public_key_here
WOMPI_PRIVATE_KEY=prv_test_your_wompi_private_key_here
WOMPI_EVENTS_SECRET=test_events_your_events_secret_here
WOMPI_INTEGRITY_SECRET=test_integrity_your_integrity_secret_here

# MODO PRODUCCIÓN (Real - Cargos a tarjetas reales)
# Para migrar, simplemente reemplaza las llaves de test por las de prod:
# WOMPI_PUBLIC_KEY=pub_prod_your_wompi_public_key_here
# WOMPI_PRIVATE_KEY=prv_prod_your_wompi_private_key_here
# WOMPI_EVENTS_SECRET=prod_events_your_events_secret_here
# WOMPI_INTEGRITY_SECRET=prod_integrity_your_integrity_secret_here

# Frontend (para detectar ambiente)
VITE_WOMPI_PUBLIC_KEY=pub_test_your_wompi_public_key_here
```

### Prefijos de Llaves

| Ambiente | Prefijo Público | Prefijo Privado | Prefijo Events | Prefijo Integrity |
|----------|------------------|-------------------|------------------|-------------------|
| **SANDBOX** | `pub_test_` | `prv_test_` | `test_events_` | `test_integrity_` |
| **PRODUCCIÓN** | `pub_prod_` | `prv_prod_` | `prod_events_` | `prod_integrity_` |

### URLs por Ambiente

| Ambiente | API Base | Checkout URL |
|----------|------------|--------------|
| **SANDBOX** | `https://sandbox.wompi.co/v1` | `https://checkout.wompi.co` |
| **PRODUCCIÓN** | `https://production.wompi.co/v1` | `https://checkout.wompi.co` |

---

## 🚀 Guía de Uso

### Paso 1: Configurar Credenciales

1. Ve a [dashboard.wompi.co](https://dashboard.wompi.co/)
2. Regístrate o inicia sesión
3. Ve a la sección **Desarrolladores**
4. Copia tus llaves según el ambiente que necesites

**Para Sandbox (Pruebas):**
- Clave Pública: `pub_test_xxxxxxxxxx`
- Clave Privada: `prv_test_xxxxxxxxxx`
- Events Secret: `test_events_xxxxxxxxxx`
- Integrity Secret: `test_integrity_xxxxxxxxxx`

**Para Producción:**
- Clave Pública: `pub_prod_xxxxxxxxxx`
- Clave Privada: `prv_prod_xxxxxxxxxx`
- Events Secret: `prod_events_xxxxxxxxxx`
- Integrity Secret: `prod_integrity_xxxxxxxxxx`

### Paso 2: Configurar Webhook

En el Dashboard de Wompi:

**Sandbox:**
- URL: `https://tu-dominio.com/api/orders/wompi/webhook` (o ngrok en dev)
- Eventos: `transaction.updated`

**Producción:**
- URL: `https://tu-dominio.com/api/orders/wompi/webhook`
- Eventos: `transaction.updated`

### Paso 3: Migrar de Sandbox a Producción

Solo necesitas cambiar las variables de entorno:

```bash
# ANTES (Sandbox)
WOMPI_PUBLIC_KEY=pub_test_abc123...
WOMPI_PRIVATE_KEY=prv_test_xyz789...

# DESPUÉS (Producción)
WOMPI_PUBLIC_KEY=pub_prod_def456...
WOMPI_PRIVATE_KEY=prv_prod_uvw012...
```

**¡Eso es todo!** No necesitas cambiar código. El sistema detecta automáticamente el ambiente basado en el prefijo de la llave pública.

---

## 💳 Datos de Prueba (Sandbox)

### Tarjetas de Crédito/Débito

| Tipo | Número | CVC | Expiración | Nombre | Resultado |
|------|----------|------|------------|---------|-----------|
| Aprobada | `4242 4242 4242 4242` | 123 | 12/25 | Juan Pérez | ✅ APPROVED |
| Rechazada | `4111 1111 1111 1111` | 123 | 12/25 | Juan Pérez | ❌ DECLINED |

### Nequi

| Tipo | Celular | Resultado |
|------|----------|-----------|
| Aprobado | `3991111111` | ✅ APPROVED |
| Rechazado | `3992222222` | ❌ DECLINED |

### PSE

Funciona con todos los bancos soportados:
- Bancolombia
- Banco de Bogotá
- Davivienda
- BBVA
- Y más...

---

## 🔄 Flujo Completo de Pago

```
1. Usuario selecciona productos → Total: $25.000 COP

2. Frontend genera referencia única
   Ref: MST-1704067200000-1234

3. Frontend envía datos al backend
   POST /api/orders/wompi/create-transaction

4. Backend crea transacción en Wompi
   POST https://sandbox.wompi.co/v1/transactions

5. Backend genera hash de integridad
   SHA256(reference + amount + currency + integrity_secret)

6. Frontend abre Widget Wompi o redirige al checkout

7. Usuario completa pago
   - Ingresa datos de tarjeta en Sandbox
   - O usa PSE/Nequi

8. Wompi procesa transacción
   - Valida tarjeta
   - Procesa pago
   - Actualiza estado

9. Wompi envía webhook al servidor
   POST /api/orders/wompi/webhook
   Header: x-event-checksum (SHA256 de validación)

10. Backend valida y procesa evento
    - Verifica checksum con EVENTS_SECRET
    - Si status === 'APPROVED':
      * Registra comisión del 10%
      * Actualiza estado del pedido a 'paid'
      * Actualiza estado del pedido a 'confirmed'

11. Usuario ve confirmación
    - Frontend polling o callback
    - Muestra página de éxito
```

---

## 🔔 Webhooks y Validación

### Formato del Webhook

Wompi envía eventos con este formato:

```json
{
  "event": "transaction.updated",
  "data": {
    "transaction": {
      "id": "1234567890",
      "reference": "MST-1704067200000-1234",
      "status": "APPROVED",
      "amount_in_cents": 250000,
      "currency": "COP",
      "payment_method_type": "CARD",
      "created_at": 1704067200000
    }
  },
  "signature": {
    "checksum": "abc123def456...",
    "properties": [
      "transaction.id",
      "transaction.status",
      "transaction.amount_in_cents"
    ]
  },
  "timestamp": 1704067200123
}
```

### Headers del Webhook

```
x-event-checksum: SHA256(transaction.id + transaction.status + transaction.amount_in_cents + timestamp + EVENTS_SECRET)
x-wompi-timestamp: 1704067200123
```

### Validación del Checksum

```typescript
// Concatenar properties en orden
const concat = `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${EVENTS_SECRET}`;

// Generar SHA256
const calculatedChecksum = crypto
  .createHash('sha256')
  .update(concat)
  .digest('hex')
  .toUpperCase();

// Verificar
if (calculatedChecksum === receivedChecksum.toUpperCase()) {
  // Checksum válido
}
```

---

## 💡 Ejemplos de API

### Crear Transacción

```bash
POST /api/orders/wompi/create-transaction
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "items": [
    {
      "title": "Camiseta Premium",
      "quantity": 1,
      "unit_price": 50000
    }
  ],
  "customerEmail": "cliente@email.com",
  "orderId": "MST-1704067200000-1234",
  "shippingAddress": {
    "address_line_1": "Calle 123 #45-67",
    "address_line_2": "Apto 101",
    "country": "CO",
    "region": "Antioquia",
    "city": "Medellín",
    "name": "Juan Pérez",
    "phone_number": "+573001234567"
  }
}
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "id": "1234567890",
    "reference": "MST-1704067200000-1234",
    "status": "PENDING",
    "checkout_url": "https://checkout.wompi.co/l/1234567890",
    "amount_in_cents": 50000,
    "currency": "COP",
    "public_key": "pub_test_abc123...",
    "integrity_signature": "abc123def456..."
  }
}
```

### Consultar Estado de Transacción

```bash
GET /api/orders/wompi/transaction/1234567890
Authorization: Bearer <USER_TOKEN>
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "id": "1234567890",
    "reference": "MST-1704067200000-1234",
    "status": "APPROVED",
    "amount_in_cents": 50000,
    "currency": "COP",
    "payment_method_type": "CARD",
    "created_at": 1704067200000
  }
}
```

### Simular Pago (Solo Dev)

```bash
POST /api/orders/wompi/simulate-payment
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "transactionId": "1234567890"
}
```

---

## 📊 Cálculo de Comisiones

### Fórmula

```typescript
const totalAmount = 100000; // $1.000 COP en centavos
const commissionRate = 0.10; // 10%
const commission = Math.round(totalAmount * commissionRate); // 10.000 centavos
const merchantAmount = totalAmount - commission; // 90.000 centavos
```

### Ejemplo de División

| Concepto | Monto |
|-----------|---------|
| Venta Total | $100.000 COP |
| Tu Comisión (10%) | $10.000 COP |
| Para Vendedor (90%) | $90.000 COP |

---

## ⚠️ Consideraciones Importantes

### 1. Seguridad

- ✅ **Nunca** almacenes datos de tarjeta en tu BD
- ✅ Usa el SDK de Wompi para tokenización
- ✅ Valida siempre el checksum del webhook
- ✅ Las llaves privadas nunca van al frontend

### 2. Modo Simulado

Cuando no hay credenciales configuradas, el servicio usa **modo simulado**:

```typescript
const SIMULATED_MODE = !env.WOMPI_PRIVATE_KEY;
```

En modo simulado:
- Las transacciones se crean localmente
- No se hacen llamadas reales a la API de Wompi
- Útil para desarrollo sin credenciales

### 3. Referencia Única

Siempre genera una referencia única por transacción:

```typescript
const generateReference = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `MST-${timestamp}-${random}`;
};
```

### 4. Estados de Transacción

| Estado | Significado | Acción |
|--------|--------------|----------|
| `PENDING` | Transacción creada, esperando pago | Esperar |
| `APPROVED` | Pago aprobado | Confirmar pedido |
| `DECLINED` | Pago rechazado | Notificar usuario |
| `ERROR` | Error en el proceso | Reintentar |
| `VOIDED` | Transacción anulada | Cancelar pedido |

---

## 🐛 Troubleshooting

### Problemas Comunes

**"Wompi is not configured"**
- Verifica que `WOMPI_PUBLIC_KEY` y `WOMPI_PRIVATE_KEY` estén configurados
- En modo simulado, esto se ignora

**"Invalid webhook signature"**
- Verifica que `WOMPI_EVENTS_SECRET` sea correcto
- Asegúrate de que el checksum se calcule en el orden correcto

**"Error al crear transacción"**
- Verifica que el `acceptance_token` sea válido
- Revisa los logs del backend

**"El pago quedó pendiente"**
- Usa el polling para verificar el estado
- Puedes consultar manualmente con `/api/orders/wompi/transaction/:id`

### Comandos Útiles

```bash
# Verificar transacciones en Wompi DB
psql -h localhost -U tu_usuario -d tu_db -c "SELECT * FROM wompi_commissions ORDER BY created_at DESC LIMIT 10;"

# Ver logs del backend
tail -f logs/backend.log | grep "WOMPI"

# Test webhook con curl
curl -X POST http://localhost:3000/api/orders/wompi/webhook \
  -H "Content-Type: application/json" \
  -H "x-event-checksum: abc123..." \
  -d '{...}'
```

---

## 📚 Referencias

### Documentación Oficial

- [Wompi Developers](https://docs.wompi.co/)
- [API Reference](https://docs.wompi.co/docs/payment-links-widget)
- [Webhooks](https://docs.wompi.co/docs/payment-intents)
- [Dashboard](https://dashboard.wompi.co/)

### URLs de API

| Servicio | Sandbox | Producción |
|----------|----------|-------------|
| API | `https://sandbox.wompi.co/v1` | `https://production.wompi.co/v1` |
| Checkout | `https://checkout.wompi.co` | `https://checkout.wompi.co` |
| Widget | `https://checkout.wompi.co/widget.js` | `https://checkout.wompi.co/widget.js` |

---

## ✅ Checklist de Implementación

- [x] Servicio backend con modo simulado
- [x] Creación de transacciones
- [x] Tokenización de tarjetas
- [x] Consulta de estado de transacciones
- [x] Webhook con validación de checksum
- [x] Cálculo de comisiones del 10%
- [x] Componente frontend con badge de ambiente
- [x] Panel de datos de prueba (solo Sandbox)
- [x] Polling automático de estado
- [x] Página de callback con manejo de estados
- [x] Documentación completa
- [x] Variables de entorno bien documentadas
- [x] Soporte para múltiples métodos de pago

---

## 🚀 Roadmap de Mejoras Futuras

- [ ] Integración con Widget embebido de Wompi
- [ ] Soporte para cuotas (installments)
- [ ] Dashboard de comisiones Wompi (similar a MP)
- [ ] Reembolsos automáticos vía API
- [ ] Notificaciones push para estado de transacciones
- [ ] Soporte para pagos recurrentes
- [ ] Integración con Wompi One-Click
