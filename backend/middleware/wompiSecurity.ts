import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from './errorHandler';
import { wompiSecurity } from '../services/wompiSecurity.service';

/**
 * Middleware para validar firma de integridad al confirmar transacción
 * Protege contra pagos con montos manipulados
 */
export const validateWompiIntegrity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reference, amountInCents, currency, integritySignature } = req.body;

    // Validar campos requeridos
    if (!reference || !amountInCents || !currency || !integritySignature) {
      throw new AppError(
        'Missing required fields for integrity validation: reference, amountInCents, currency, integritySignature',
        400
      );
    }

    // Generar firma esperada
    const expectedSignature = wompiSecurity.generateIntegritySignature(
      reference,
      Number(amountInCents),
      currency
    );

    // Validar firma usando timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature.toLowerCase()),
      Buffer.from(integritySignature.toLowerCase())
    );

    if (!isValid) {
      console.error('🚨 Security Alert: Invalid integrity signature!', {
        reference,
        expected: expectedSignature,
        received: integritySignature,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Considerar implementar rate limiting o bloqueo de IP
      res.status(400).json({
        success: false,
        error: 'Invalid payment integrity signature',
        message: 'El monto o los datos de la transacción no coinciden con los esperados',
      });
      return;
    }

    console.log('✅ Integrity signature validated successfully');
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware para validar webhooks de Wompi
 * Protege contra notificaciones de pago falsas
 *
 * Wompi envía:
 * - Header: X-Event-Checksum (firma SHA256)
 * - Body: { timestamp, signature: { checksum, properties }, data, event, environment }
 *
 * El checksum se calcula: SHA256(concatenación de valores según properties + timestamp + secret)
 */
export const validateWompiWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // El checksum viene en el header O en el body (Wompi envía ambos)
    const headerChecksum = (req.headers['x-event-checksum'] as string) || '';
    const bodyChecksum = req.body?.signature?.checksum || '';
    const signature = headerChecksum || bodyChecksum;

    // El timestamp viene DENTRO del body, NO como header
    const timestamp = req.body?.timestamp;

    if (!signature) {
      console.error('Missing webhook checksum', {
        headerChecksum,
        bodyChecksum,
        headers: Object.keys(req.headers),
      });
      res.status(401).json({
        success: false,
        error: 'Missing webhook checksum',
      });
      return;
    }

    if (!timestamp) {
      console.error('Missing webhook timestamp in body', {
        bodyKeys: Object.keys(req.body || {}),
      });
      res.status(400).json({
        success: false,
        error: 'Missing timestamp in webhook body',
      });
      return;
    }

    // Validar timestamp (anti-replay attack)
    // Wompi envía timestamp como Unix timestamp en segundos
    const eventTimeMs = typeof timestamp === 'number'
      ? timestamp * 1000  // Convertir segundos a milisegundos
      : new Date(timestamp).getTime();
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutos

    if (Math.abs(now - eventTimeMs) > maxAge) {
      console.error('Webhook timestamp outside allowed range', {
        timestamp,
        eventTimeMs,
        now,
        diffMinutes: Math.round((now - eventTimeMs) / 60000),
      });

      res.status(400).json({
        success: false,
        error: 'Webhook timestamp too old',
      });
      return;
    }

    // Validar firma de webhook
    const isValid = wompiSecurity.validateWebhookSignature(signature, req.body);

    if (!isValid) {
      console.error('🚨 Security Alert: Invalid webhook signature!', {
        receivedSignature: signature,
        timestamp,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        event: req.body?.event,
        environment: req.body?.environment,
      });

      res.status(401).json({
        success: false,
        error: 'Invalid webhook signature',
      });
      return;
    }

    console.log('✅ Webhook signature validated', {
      event: req.body?.event,
      transactionId: req.body?.data?.transaction?.id,
    });
    next();
  } catch (error) {
    next(error);
  }
};
