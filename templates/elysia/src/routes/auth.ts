import { Elysia, t } from 'elysia';
import { authController } from '../controllers/authController';
import { authPlugin } from '../middleware/auth';
import { isGoogleAuthEnabled } from '../config/oauth';
import {
  registerBody,
  loginBody,
  forgotPasswordBody,
  resetPasswordBody,
  refreshTokenBody,
  verifyEmailBody,
  resendVerificationBody
} from '../middleware/validation';

const tag = ['Authentication'];

// Google OAuth routes live on their own sub-instance that is only populated when
// ENABLE_GOOGLE_AUTH=true, then always `.use()`d below. This keeps a single
// non-reassigned `authRoutes` binding (avoids Elysia generic-type churn) while
// preserving the Express "only registered when enabled" behavior.
const googleRoutes = new Elysia();
if (isGoogleAuthEnabled()) {
  googleRoutes
    .get('/google', authController.googleAuth, {
      detail: { tags: tag, summary: 'Google OAuth login' }
    })
    .get('/google/callback', authController.googleCallback, {
      detail: { tags: tag, summary: 'Google OAuth callback' }
    });
}

const authRoutes = new Elysia({ prefix: '/auth' })
  .use(authPlugin)
  .post('/register', authController.register, {
    body: registerBody,
    detail: { tags: tag, summary: 'Register a new user' }
  })
  .post('/login', authController.login, {
    body: loginBody,
    detail: { tags: tag, summary: 'Login user' }
  })
  .post('/forgot-password', authController.forgotPassword, {
    body: forgotPasswordBody,
    detail: { tags: tag, summary: 'Request password reset' }
  })
  .post('/reset-password', authController.resetPassword, {
    body: resetPasswordBody,
    detail: { tags: tag, summary: 'Reset password using token' }
  })
  .post('/refresh', authController.refreshToken, {
    body: refreshTokenBody,
    detail: { tags: tag, summary: 'Refresh access token' }
  })
  .post('/logout', authController.logout, {
    body: t.Optional(t.Object({ refreshToken: t.Optional(t.String()) })),
    detail: { tags: tag, summary: 'Logout user' }
  })
  .post('/verify-email', authController.verifyEmail, {
    body: verifyEmailBody,
    detail: { tags: tag, summary: 'Verify email address' }
  })
  .post('/resend-verification', authController.resendVerification, {
    body: resendVerificationBody,
    detail: { tags: tag, summary: 'Resend email verification' }
  })
  .get('/profile', authController.getProfile, {
    auth: true,
    detail: { tags: tag, summary: 'Get current user profile', security: [{ bearerAuth: [] }] }
  })
  .post('/profile-image', authController.uploadProfileImage, {
    auth: true,
    body: t.Object({ profileImage: t.File({ type: 'image', maxSize: '5m' }) }),
    detail: { tags: tag, summary: 'Upload profile image', security: [{ bearerAuth: [] }] }
  })
  .use(googleRoutes);

export { authRoutes };
export default authRoutes;
