import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Wompi Payment Gateway
  WOMPI_PUBLIC_KEY: z.string().optional(),
  WOMPI_PRIVATE_KEY: z.string().optional(),
  WOMPI_EVENTS_SECRET: z.string().optional(),
  WOMPI_INTEGRITY_SECRET: z.string().optional(),

  FRONTEND_URL: z.string().default('http://localhost:5173'),
  // Optional backend URL (useful for some deployments or SDK callbacks)
  BACKEND_URL: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX: z.string().default('100'),

  // Cloudinary (credentials must be provided via environment variables)
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

  // WhatsApp Business API
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_WEBHOOK_TOKEN: z.string().optional(),
  FUYI_PHONE_NUMBER: z.string().default('573238020198'),
  STORE_OWNER_PHONE: z.string().optional(),

  // Comisión de intermediario (porcentaje)
  INTERMEDIARY_COMMISSION_PERCENTAGE: z.string().default('12'),

  // Categorías de productos para el bot
  WHATSAPP_BOT_CATEGORIES: z.string().optional(),
  // Enable to expose Wompi API error payloads in responses for debugging (set to 'true')
  DEBUG_WOMPI_ERRORS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
