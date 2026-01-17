import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

const signUpSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
});

const signInSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

// Sign up
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName } = signUpSchema.parse(req.body);
    const result = await authService.signUp(email, password, fullName);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Sign in
router.post('/signin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('📝 [POST /api/auth/signin] Request received');
    console.log('📝 Body:', { email: req.body?.email, hasPassword: !!req.body?.password });

    const { email, password } = signInSchema.parse(req.body);
    console.log('✅ [POST /api/auth/signin] Schema validation passed');

    const result = await authService.signIn(email, password);
    console.log('✅ [POST /api/auth/signin] SignIn successful for:', email);
    console.log('✅ User role:', result.user.role);
    console.log('✅ Result completo:', JSON.stringify(result, null, 2));
    console.log('✅ Result.user completo:', JSON.stringify(result.user, null, 2));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [POST /api/auth/signin] Error:', error);
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('👤 [AUTH] GET /me - Request received for user:', req.user?.id);
    res.json({ success: true, data: { user: req.user } });
  } catch (error) {
    console.error('❌ [AUTH] GET /me - Error:', error);
    next(error);
  }
});

// Reset password request
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    await authService.resetPassword(email);
    res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    next(error);
  }
});

// Update password
router.put('/password', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { newPassword } = z.object({
      newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    }).parse(req.body);

    await authService.updatePassword(req.user!.id, newPassword);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
