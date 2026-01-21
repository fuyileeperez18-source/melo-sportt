import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import type { User, JwtPayload } from '../types/index.js';

export const authService = {
  async signUp(email: string, password: string, fullName: string): Promise<{ user: User; token: string }> {
    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      throw new AppError('Email already registered', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    // Create user
    const result = await query(
      `INSERT INTO users (id, email, full_name, password_hash, role)
       VALUES ($1, $2, $3, $4, 'customer')
       RETURNING id, email, full_name, phone, avatar_url, role, created_at, updated_at`,
      [userId, email, fullName, hashedPassword]
    );

    const user = result.rows[0] as User;
    const token = this.generateToken(user);

    return { user, token };
  },

  async signIn(email: string, password: string): Promise<{ user: User; token: string }> {
    console.log('🔐 [authService.signIn] Attempting login for:', email);

    // Get user with password
    const result = await query(
      'SELECT id, email, full_name, phone, avatar_url, role, password_hash, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ [authService.signIn] User not found:', email);
      throw new AppError('Invalid email or password', 401);
    }

    const userRow = result.rows[0];
    console.log('✅ [authService.signIn] User found:', { email, role: userRow.role });

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userRow.password_hash);
    if (!isValidPassword) {
      console.log('❌ [authService.signIn] Invalid password for:', email);
      throw new AppError('Invalid email or password', 401);
    }

    console.log('✅ [authService.signIn] Password verified for:', email);

    // Remove password hash from user object
    const { password_hash: _, ...user } = userRow;
    const token = this.generateToken(user as User);

    console.log('✅ [authService.signIn] Token generated for:', email);

    return { user: user as User, token };
  },

  generateToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as string,
    } as jwt.SignOptions);
  },

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  },

  async resetPassword(email: string): Promise<void> {
    const result = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      // Don't reveal if email exists
      return;
    }

    // TODO: Implement email sending with reset token
    console.log(`Password reset requested for ${email}`);
  },

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      hashedPassword,
      userId,
    ]);
  },
};
