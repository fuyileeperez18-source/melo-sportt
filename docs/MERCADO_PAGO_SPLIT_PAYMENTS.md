# Mercado Pago Split Payments - Integración Completa

## 📋 Resumen

Esta implementación permite recibir automáticamente una comisión del 10% de cada transacción procesada a través de Mercado Pago, utilizando la funcionalidad **Split Payments 1:1 (Marketplace)**.

### División de Pagos

| Concepto | Porcentaje | Ejemplo (Venta de $100.000 COP) |
|-----------|------------|-------------------------------|
| Tu comisión | 10% | $10.000 COP |
| Para vendedor | 90% | $90.000 COP |
| Comisión de MP | ~3.5% (cargada por MP al vendedor) | - |
| Neto vendedor | ~86.5% | $86.500 COP |

---

## 🏗️ Arquitectura de la Implementación

### Backend

#### 1. Tablas de Base de Datos

**Tabla: `mercadopago_accounts`**
Almacena las credenciales OAuth de los vendedores.

```sql
CREATE TABLE mercadopago_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  mp_user_id BIGINT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  public_key TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  live_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Tabla: `mercadopago_commissions`**
Registra cada comisión cobrada por el marketplace.

```sql
CREATE TABLE mercadopago_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  payment_id VARCHAR(255) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  commission_amount DECIMAL(12, 2) NOT NULL,  -- Tu 10%
  seller_amount DECIMAL(12, 2) NOT NULL,       -- 90% del vendedor
  seller_mp_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. Servicios Implementados

**`seller.service.ts`**
- `getAuthUrl(state)` - Genera URL de autorización OAuth
- `exchangeCodeForToken(code, userId)` - Intercambia código por access_token
- `getAccountByUserId(userId)` - Obtiene cuenta vinculada
- `isTokenExpired(expiresAt)` - Verifica si token expira en 7 días
- `refreshToken(userId)` - Renueva access_token usando refresh_token
- `getValidAccessToken(userId?)` - Obtiene token válido (renueva si es necesario)
- `getPrimarySellerAccount()` - Obtiene la cuenta principal del vendedor

**`mercadopago.service.ts`**
- `createPreference(data, sellerAccessToken)` - Crea preferencia con `application_fee`
- `calculateMarketplaceFee(totalAmount, commissionRate)` - Calcula comisión (default 10%)
- `getPayment(paymentId)` - Obtiene detalles de pago
- `processWebhook(paymentId, topic)` - Procesa notificación
- `updateSplitDetails(orderId, details)` - Actualiza orden con split details

**`order.service.ts`**
- `registerMercadoPagoCommission(data)` - Registra comisión en DB
- `getMercadoPagoCommissionsSummary(filters)` - Obtiene resumen de comisiones

#### 3. Endpoints Implementados

**OAuth y Vinculación:**
- `GET /api/sellers/auth-url` - Obtiene URL de autorización
- `POST /api/sellers/callback` - Procesa callback OAuth
- `GET /api/sellers/account` - Obtiene estado de cuenta vinculada
- `POST /api/sellers/test-users` - Crea usuarios de prueba (admin only)

**Pagos:**
- `POST /api/orders/mercadopago/create-preference` - Crea preferencia con split
- `GET /api/orders/mercadopago/payment/:paymentId` - Obtiene estado de pago
- `POST /api/orders/mercadopago/webhook` - Procesa webhooks de MP

**Comisiones:**
- `GET /api/analytics/mercadopago-commissions` - Obtiene resumen de comisiones

---

### Frontend

#### 1. Componentes Implementados

**`MercadoPagoSellerLink.tsx`**
Muestra estado de la cuenta de Mercado Pago del vendedor y permite vincular/reconectar.

Características:
- Estado de conexión con indicador visual
- Información del vendedor (ID, modo live/sandbox)
- Expiración del token con alertas (7 días o menos)
- Explicación del Split Payments 10%/90%
- Instructivo paso a paso para vincular cuenta

**`MercadoPagoPayment.tsx`**
Componente de pago integrado en el checkout.

Características:
- Información de métodos de pago aceptados (tarjetas, Nequi, Daviplata, PSE)
- Redirección segura a Mercado Pago checkout
- Muestra de protección SSL

**`MercadoPagoCallback.tsx`**
Página de callback para manejar resultados de pago.

Estados soportados:
- **Success** - Muestra detalles del pago y la división del 10%/90%
- **Pending** - Pago en proceso
- **Failure** - Pago rechazado con motivos

**`MercadoPagoCommissions.tsx`**
Dashboard de comisiones para el propietario del marketplace.

Funcionalidades:
- Tarjetas de resumen (total comisiones, pedidos, promedio, volumen)
- Filtros por rango de fechas
- Exportar a CSV
- Tabla detallada de transacciones
- Información sobre cómo funciona Split Payments

**`AdminSettings.tsx`**
Integración del panel de administración con pestaña de pagos.

#### 2. Rutas Configuradas

```typescript
// Mercado Pago OAuth
/seller/callback                  → Callback de vinculación
/checkout/mercadopago/callback → Callback de pagos (success/failure/pending)
```

---

## 🔐 Configuración

### Variables de Entorno Requeridas

```bash
# Mercado Pago - Marketplace
MERCADOPAGO_ACCESS_TOKEN=APP_USR-XXXXXXXXXXXXXXXXXXXXXXX
MERCADOPAGO_PUBLIC_KEY=APP_USR-XXXXXXXXXXXXXXXXXXXXXXX
MERCADOPAGO_CLIENT_ID=APP_USR-XXXXXXXXXXXXXXXXXXXXXXX
MERCADOPAGO_CLIENT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
MERCADOPAGO_MARKETPLACE_FEE_PERCENTAGE=10
MERCADOPAGO_MARKETPLACE_ID=MP_MERCHANT_ID

# Frontend
FRONTEND_URL=http://localhost:5173  # O tu dominio en producción
VITE_API_URL=http://localhost:3000/api
```

### Pasos de Configuración en Mercado Pago

1. Crear aplicación en [mercadopago.com.co/developers](https://www.mercadopago.com.co/developers)
2. Seleccionar **Split de Pagos** como producto
3. Configurar URL de callback
4. Obtener credenciales (Client ID, Client Secret, Access Token)
5. Configurar Webhooks

---

## 🚀 Guía de Uso

### Para el Desarrollador (Tú)

#### 1. Configurar Credenciales de Mercado Pago

1. Ve a [mercadopago.com.co/developers](https://www.mercadopago.com.co/developers)
2. Crea una nueva aplicación
3. Selecciona **"Split de Pagos"** como producto
4. Configura:
   - Redirect URL: `https://tudominio.com/seller/callback`
   - Notificaciones: Configura webhook `/api/orders/mercadopago/webhook`

5. Copia las credenciales:
   - Client ID
   - Client Secret
   - Access Token (tú, como propietario del marketplace)

#### 2. Vincular Cuenta de Vendedor

1. Inicia sesión como super_admin
2. Ve a `/admin/settings` → Pestaña "Pagos"
3. Clic en "Vincular tienda"
4. Serás redirigido a Mercado Pago
5. Autoriza la aplicación
6. La cuenta quedará vinculada y el split automático activará

#### 3. Crear Usuarios de Prueba

```bash
POST /api/sellers/test-users
Content-Type: application/json
Authorization: Bearer <TU_ACCESS_TOKEN>

{
  "role": "seller",
  "siteId": "MCO"
}
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "id": 123456789,
    "nickname": "TEST_USER_123456789",
    "password": "qatest123",
    "email": "test_user_123456789@testuser.com",
    "site_id": "MCO",
    "site_status": "active",
    "role": "seller",
    "credentials_info": {
      "login_url": "https://www.mercadopago.com.co",
      "test_cards": [...]
    }
  }
}
```

#### 4. Verificar Split en Acción

1. Venta de prueba en el checkout
2. Completa el pago con tarjeta de prueba
3. Revisa `/admin/settings` → Pestaña "Pagos" → "Comisiones de Mercado Pago"
4. Verifica que:
   - La transacción aparece
   - Tu comisión del 10% se calculó correctamente
   - El monto del vendedor (90%) es el correcto

---

## 💳 Tarjetas de Prueba

### Para Colombia (MCO)

| Número | Tipo | CVC | Expiración | Nombre en Tarjeta | Resultado |
|---------|------|-----|-------------------|----------|
| 5031 4332 1540 6351 | Mastercard | 123 | 12/28 | **APRO** | ✅ Aprobado |
| 4013 5406 8274 6260 | Visa | 123 | 12/28 | **APRO** | ✅ Aprobado |
| 3711 8030 3257 522 | Amex | 1234 | 12/28 | **APRO** | ✅ Aprobado |
| 5031 4332 1540 6351 | Mastercard | 123 | 12/28 | **OTHE** | ❌ Rechazado (Error) |
| 5031 4332 1540 6351 | Mastercard | 123 | 12/28 | **CONT** | ⏳ Pendiente |
| 5031 4332 1540 6351 | Mastercard | 123 | 12/28 | **CALL** | 📞 Llamar para autorizar |
| 5031 4332 1540 6351 | Mastercard | 123 | 12/28 | **FUND** | 💰 Fondos insuficientes |
| 5031 4332 1540 6351 | Mastercard | 123 | 12/28 | **SECU** | 🔒 Código inválido |
| 5031 4332 1540 6351 | Mastercard | 123 | 12/28 | **EXPI** | 📅 Tarjeta expirada |
| 5031 4332 1540 6351 | Mastercard | 123 | 12/28 | **FORM** | 📝 Error en formulario |

### Otros datos de prueba

- **Email para pruebas:** `test@testuser.com` (único permitido)
- **Tipo de documento:** CC (Cédula de Ciudadanía)
- **Número de documento:** Cualquier 9 dígitos (ej: `123456789`)

---

## 🔄 Flujo OAuth Completo

### Paso 1: Generar URL de Autorización

```
GET /api/sellers/auth-url
Authorization: Bearer <TU_TOKEN>
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "url": "https://auth.mercadopago.com.co/authorization?..."
  }
}
```

### Paso 2: Usuario Autoriza

Usuario es redirigido a Mercado Pago, autoriza la aplicación.

### Paso 3: Callback con Código

```
POST /api/sellers/callback
Authorization: Bearer <TOKEN_DEL_VENDEDOR>
Content-Type: application/json

{
  "code": "TG-XXXXXXXXXXXXXXXXXXXXXXX"
}
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "mp_user_id": 123456789,
    "public_key": "APP_USR-...",
    "live_mode": false
  }
}
```

### Paso 4: Renovación Automática de Token

El sistema verifica si el token expira en 7 días y lo renueva automáticamente usando el `refresh_token` almacenado.

---

## 💡 Ejemplos de API

### Crear Preferencia con Split

```bash
POST /api/orders/mercadopago/create-preference
Authorization: Bearer <TOKEN_DEL_VENDEDOR>
Content-Type: application/json

{
  "items": [
    {
      "title": "Camiseta Premium",
      "quantity": 1,
      "unit_price": 50000,
      "currency_id": "COP"
    }
  ],
  "back_urls": {
    "success": "https://tudominio.com/checkout/mercadopago/callback?status=approved",
    "failure": "https://tudominio.com/checkout/mercadopago/callback?status=failed",
    "pending": "https://tudominio.com/checkout/mercadopago/callback?status=pending"
  },
  "external_reference": "order_123",
  "metadata": {
    "user_id": "user_uuid",
    "order_id": "order_123",
    "seller_id": "123456789"
  }
}
```

### Obtener Resumen de Comisiones

```bash
GET /api/analytics/mercadopago-commissions
Authorization: Bearer <TU_ADMIN_TOKEN>
?startDate=2024-01-01&endDate=2024-01-31
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "total_commissions": 150000.00,
    "total_orders": 15,
    "orders": [
      {
        "id": "uuid",
        "order_id": "order_uuid",
        "payment_id": "123456",
        "total_amount": 100000.00,
        "commission_amount": 10000.00,
        "seller_amount": 90000.00,
        "seller_mp_id": 123456789,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

## 🔔 Webhooks

### Configuración en Mercado Pago

**URL:** `/api/orders/mercadopago/webhook`

**Eventos:**
- `payment` - Cambio de estado de pago

### Formato del Webhook

```json
{
  "type": "payment",
  "data": {
    "id": "123456789"
  },
  "action": "payment.updated"
}
```

### Flujo del Webhook

1. Recibir webhook de Mercado Pago
2. Consultar detalles del pago con API de MP
3. Si `status === "approved"`:
   - Registrar comisión en DB
   - Actualizar estado de orden a "confirmed" y "paid"
   - Calcular y registrar split (10% marketplace, 90% vendedor)
4. Responder HTTP 200

---

## 📦 Migración de Base de Datos

```bash
# Ejecutar migración
psql postgres://TU_DB_URL -f migrations/009_mercadopago_split.sql
```

**Qué incluye la migración:**
- Tabla `mercadopago_accounts` para credenciales OAuth
- Tabla `mercadopago_commissions` para registro de comisiones
- Campos en `orders` para rastrear split (mp_preference_id, mp_merchant_order_id, application_fee, seller_amount, mp_seller_id)
- Índices para búsquedas rápidas
- Triggers para `updated_at` automático

---

## ⚠️ Consideraciones Importantes

1. **Seguridad de Tokens:**
   - `access_token` y `refresh_token` se almacenan en DB
   - Los tokens se renuevan automáticamente antes de expirar
   - El token de MP del marketplace se usa para crear la preferencia

2. **Modo de Producción vs Sandbox:**
   - Verifica siempre que `live_mode` sea `true` en producción
   - Mercado Pago **no tiene Sandbox tradicional**
   - Usa usuarios de prueba en producción para testing

3. **Renovación de Tokens:**
   - Los tokens expiran en 6 meses
   - El sistema los renueva automáticamente si faltan 7 días o menos
   - Si falla la renovación, muestra alerta en el dashboard

4. **Comisiones de Mercado Pago:**
   - MP cobra su comisión (aprox 3.5%) sobre el monto del vendedor
   - Tu comisión del 10% es sobre el monto total de la venta
   - Ejemplo: Venta $100.000 → MP cobra $3.500 al vendedor → Vendedor recibe $86.500 → Tú recibes $10.000

5. **Manejo de Errores:**
   - Si un pago falla, el webhook se reintentará
   - Siempre responde 200 para evitar reintentos infinitos
   - Registra todos los errores en consola para debugging

---

## ✅ Criterios de Éxito de la Implementación

- [x] Vendedor puede vincularse exitosamente via OAuth
- [x] Pagos se crean correctamente con access_token del vendedor
- [x] Split automático funciona: 90% vendedor, 10% marketplace
- [x] Tarjeta con nombre "APRO" resulta en pago aprobado
- [x] Tarjeta con nombre "OTHE" resulta en pago rechazado
- [x] Webhooks reciben y procesan notificaciones de pagos
- [x] Sistema maneja renovación automática de tokens expirados
- [x] Dashboard muestra comisiones acumuladas correctamente
- [x] Código limpio, seguro y escalable
- [x] Documentación técnica completa disponible

---

## 🔗 URLs de Referencia

- [Documentación Split Payments](https://www.mercadopago.com.co/developers/es/docs/split-payments/introduction)
- [API de Mercado Pago](https://api.mercadopago.com/)
- [Panel de Desarrolladores](https://www.mercadopago.com.co/developers)
- [OAuth Reference](https://www.mercadopago.com.co/developers/es/docs/authorization-and-authentication)

---

## 📞 Soporte y Troubleshooting

### Problemas Comunes

**"No se pudo crear la preferencia"**
- Verifica que `MERCADOPAGO_ACCESS_TOKEN` esté configurado
- Verifica que el vendedor tenga cuenta vinculada

**"Error al vincular cuenta"**
- Verifica `CLIENT_ID` y `CLIENT_SECRET`
- Verifica que la `FRONTEND_URL` sea correcta

**"El webhook no está actualizando órdenes"**
- Verifica que el webhook sea accesible públicamente
- Revisa los logs del backend

**"El token expiró"**
- El sistema debe renovar automáticamente
- Si no, reconecta la cuenta del vendedor

### Comandos Útiles

```bash
# Verificar estado de conexión a BD
psql -h localhost -U tu_usuario -d tu_db -c "SELECT * FROM mercadopago_accounts;"

# Verificar comisiones registradas
psql -h localhost -U tu_usuario -d tu_db -c "SELECT * FROM mercadopago_commissions ORDER BY created_at DESC LIMIT 10;"

# Ver logs del backend
tail -f logs/backend.log | grep "MERCADOPAGO"
```

---

## 📈 Roadmap de Mejoras Futuras

- [ ] Sistema de reembolsos automáticos
- [ ] Reportes de ventas y comisiones por vendedor
- [ ] Dashboard público para vendedores
- [ ] Notificaciones por email cuando se reciben comisiones
- [ ] API para obtener balance en cuenta de Mercado Pago
- [ ] Soporte para múltiples vendedores (Marketplace N:1)
- [ ] Integración con Wompi para comparar comisiones
