import { Router } from 'express';
import { wompiSecurityController } from '../controllers/wompi.controller.js';
import { validateWompiIntegrity, validateWompiWebhook } from '../middleware/wompiSecurity.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * FASE 1: Preparar transacción (backend calcula firma)
 * POST /api/wompi/prepare
 *
 * Retorna:
 * - integrity (firma SHA256)
 * - reference (ID único)
 * - acceptance_token (para Habeas Data)
 * - Datos configuración del Widget
 */
router.post('/prepare', authenticate, wompiSecurityController.prepareTransaction);

/**
 * FASE 2: Confirmación de pago (valida firma)
 * POST /api/wompi/confirm
 *
 * Requiere:
 * - integrity_signature (valida que el monto no fue cambiado)
 * - transactionId (de Wompi)
 * - reference (ID de nuestra orden)
 */
router.post('/confirm', authenticate, validateWompiIntegrity, wompiSecurityController.confirmTransaction);

/**
 * WEBHOOK: Eventos asíncronos de Wompi
 * POST /api/wompi/webhook
 *
 * Headers que Wompi envía:
 * - X-Event-Checksum (firma SHA256)
 *
 * Body contiene:
 * - timestamp: Unix timestamp en segundos
 * - signature.checksum: El mismo checksum del header
 * - signature.properties: Array con los campos usados para calcular el checksum
 * - data.transaction: Datos de la transacción
 * - event: Tipo de evento (ej: "transaction.updated")
 * - environment: "test" o "production"
 */
router.post('/webhook', validateWompiWebhook, wompiSecurityController.handleWebhook);

/**
 * Obtener estado de transacción
 * GET /api/wompi/transaction/:id
 */
router.get('/transaction/:id', authenticate, wompiSecurityController.getTransaction);

export default router;
