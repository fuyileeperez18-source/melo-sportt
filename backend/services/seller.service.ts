import axios from 'axios';
import { env } from '../config/env.js';
import { query } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

interface MPTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
  public_key: string;
  live_mode: boolean;
}

export const sellerService = {
  /**
   * Generates the authorization URL for Mercado Pago OAuth
   */
  getAuthUrl(state: string): string {
    const clientId = env.MERCADOPAGO_CLIENT_ID;
    const redirectUri = `${env.FRONTEND_URL}/seller/callback`;

    if (!clientId) {
      throw new AppError('Mercado Pago Client ID not configured', 500);
    }

    return `https://auth.mercadopago.com.co/authorization?client_id=${clientId}&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  },

  /**
   * Exchanges the authorization code for an access token
   */
  async exchangeCodeForToken(code: string, userId: string): Promise<any> {
    const clientId = env.MERCADOPAGO_CLIENT_ID;
    const clientSecret = env.MERCADOPAGO_CLIENT_SECRET;
    const redirectUri = `${env.FRONTEND_URL}/seller/callback`;

    if (!clientId || !clientSecret) {
      throw new AppError('Mercado Pago credentials not configured', 500);
    }

    try {
      const response = await axios.post<MPTokenResponse>('https://api.mercadopago.com/oauth/token', {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`
        }
      });

      const data = response.data;
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);

      // Store in database
      const result = await query(`
        INSERT INTO mercadopago_accounts (
          user_id, mp_user_id, access_token, refresh_token, public_key, expires_at, scope, live_mode
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id) DO UPDATE SET
          mp_user_id = EXCLUDED.mp_user_id,
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          public_key = EXCLUDED.public_key,
          expires_at = EXCLUDED.expires_at,
          scope = EXCLUDED.scope,
          live_mode = EXCLUDED.live_mode,
          updated_at = NOW()
        RETURNING *
      `, [
        userId, data.user_id, data.access_token, data.refresh_token,
        data.public_key, expiresAt, data.scope, data.live_mode
      ]);

      return result.rows[0];
    } catch (error: any) {
      console.error('Error exchanging MP code:', error.response?.data || error.message);
      throw new AppError(
        `Failed to link Mercado Pago account: ${error.response?.data?.message || error.message}`,
        error.response?.status || 500
      );
    }
  },

  /**
   * Gets the linked account for a user
   */
  async getAccountByUserId(userId: string) {
    const result = await query(
      'SELECT * FROM mercadopago_accounts WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  },

  /**
   * Checks if token is expired or will expire soon (within 7 days)
   */
  isTokenExpired(expiresAt: string | Date | null): boolean {
    if (!expiresAt) return true;
    const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
    const sevenDaysFromNow = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
    return expiryDate < sevenDaysFromNow;
  },

  /**
   * Refreshes the access token using refresh_token
   */
  async refreshToken(userId: string): Promise<any> {
    const clientSecret = env.MERCADOPAGO_CLIENT_SECRET;
    const redirectUri = `${env.FRONTEND_URL}/seller/callback`;

    if (!clientSecret) {
      throw new AppError('Mercado Pago credentials not configured', 500);
    }

    // Get current account to get refresh token
    const account = await this.getAccountByUserId(userId);
    if (!account || !account.refresh_token) {
      throw new AppError('No refresh token available. Please re-link your Mercado Pago account.', 400);
    }

    try {
      const response = await axios.post<MPTokenResponse>('https://api.mercadopago.com/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token,
        client_id: env.MERCADOPAGO_CLIENT_ID,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = response.data;
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);

      // Update in database
      const result = await query(`
        UPDATE mercadopago_accounts SET
          mp_user_id = $1,
          access_token = $2,
          refresh_token = $3,
          public_key = $4,
          expires_at = $5,
          scope = $6,
          live_mode = $7,
          updated_at = NOW()
        WHERE user_id = $8
        RETURNING *
      `, [
        data.user_id, data.access_token, data.refresh_token,
        data.public_key, expiresAt, data.scope, data.live_mode, userId
      ]);

      console.log(`✅ [MP TOKEN REFRESH] Token refreshed for user ${userId}, expires at ${expiresAt}`);

      return result.rows[0];
    } catch (error: any) {
      console.error('Error refreshing MP token:', error.response?.data || error.message);
      throw new AppError(
        `Failed to refresh Mercado Pago token: ${error.response?.data?.message || error.message}`,
        error.response?.status || 500
      );
    }
  },

  /**
   * Gets valid access token, refreshing if needed
   */
  async getValidAccessToken(userId?: string): Promise<string | undefined> {
    // Get primary seller account if no userId specified
    const account = userId
      ? await this.getAccountByUserId(userId)
      : await this.getPrimarySellerAccount();

    if (!account) {
      return undefined;
    }

    // Check if token needs refresh
    if (this.isTokenExpired(account.expires_at)) {
      console.log(`⚠️ [MP TOKEN] Token expired, refreshing for user ${account.user_id}`);
      const refreshed = await this.refreshToken(account.user_id);
      return refreshed.access_token;
    }

    return account.access_token;
  },

  /**
   * Gets the primary seller account (usually for a 1:1 marketplace)
   */
  async getPrimarySellerAccount() {
    // We look for the first active seller account.
    // In a 1:1 model, there should only be one or a designated "marketplace seller".
    const result = await query(
      'SELECT * FROM mercadopago_accounts ORDER BY created_at ASC LIMIT 1'
    );
    return result.rows[0];
  }
};
