import { Router, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { sellerService } from '../services/seller.service.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';
import { z } from 'zod';
import axios from 'axios';

const router = Router();

/**
 * Get the Mercado Pago authorization URL
 */
router.get('/auth-url', authenticate, (req: AuthRequest, res: Response) => {
  const state = req.user!.id; // Using user ID as state for verification
  const url = sellerService.getAuthUrl(state);
  res.json({ success: true, data: { url } });
});

/**
 * Handle the OAuth callback from Mercado Pago
 */
router.post('/callback', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code } = z.object({
      code: z.string().min(1, 'Authorization code is required'),
    }).parse(req.body);

    const account = await sellerService.exchangeCodeForToken(code, req.user!.id);

    res.json({
      success: true,
      message: 'Mercado Pago account linked successfully',
      data: {
        mp_user_id: account.mp_user_id,
        public_key: account.public_key,
        live_mode: account.live_mode
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get account details
 */
router.get('/account', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await sellerService.getAccountByUserId(req.user!.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'No Mercado Pago account linked' });
    }

    res.json({
      success: true,
      data: {
        mp_user_id: account.mp_user_id,
        public_key: account.public_key,
        expires_at: account.expires_at,
        live_mode: account.live_mode,
        linked_at: account.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create Mercado Pago test users (for development/testing)
 * Only use in sandbox/development environment
 */
router.post('/test-users', authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { siteId, role } = z.object({
      siteId: z.string().default('MCO'), // MCO = Colombia
      role: z.enum(['buyer', 'seller']).default('seller'),
    }).parse(req.body);

    if (!env.MERCADOPAGO_ACCESS_TOKEN) {
      return res.status(400).json({
        success: false,
        error: 'Mercado Pago access token not configured'
      });
    }

    const response = await axios.post(
      'https://api.mercadopago.com/users/test',
      { site_id: siteId, description: role === 'seller' ? 'Vendedor de prueba' : 'Comprador de prueba' },
      {
        headers: {
          'Authorization': `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const testUser = {
      id: response.data.id,
      nickname: response.data.nickname,
      password: response.data.password,
      site_id: response.data.site_id,
      email: response.data.email,
      site_status: response.data.site_status,
      role,
      credentials_info: {
        login_url: 'https://www.mercadopago.com.co',
        test_cards: [
          {
            number: '5031 4332 1540 6351', // Mastercard
            cvv: '123',
            expiry: '12/28',
            holder_name: 'APRO' // Name for APPROVED payments
          },
          {
            number: '5031 4332 1540 6351',
            cvv: '123',
            expiry: '12/28',
            holder_name: 'OTHE' // Name for REJECTED payments
          }
        ]
      }
    };

    res.json({
      success: true,
      data: testUser,
      message: 'Usuario de prueba creado exitosamente'
    });

  } catch (error: any) {
    console.error('Error creating test user:', error.response?.data || error.message);
    next(error);
  }
});

export default router;
