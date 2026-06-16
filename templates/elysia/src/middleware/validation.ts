import { t } from 'elysia';

/**
 * Request body schemas (TypeBox `t`) replacing the Express Joi schemas.
 * Validation failures surface as 400 via the global error handler (Elysia's
 * native default is 422 — overridden in errorHandler.ts to match the Joi
 * contract). The password-complexity regex and username 3-30 rule are preserved
 * exactly from the Express `validation.ts`.
 */

// lowercase + uppercase + digit + special char, min length 8
const PASSWORD_PATTERN = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).{8,}$';

export const registerBody = t.Object({
  username: t.String({ minLength: 3, maxLength: 30 }),
  email: t.String({ format: 'email' }),
  password: t.String({ pattern: PASSWORD_PATTERN }),
  firstName: t.Optional(t.String()),
  lastName: t.Optional(t.String())
});

export const loginBody = t.Object({
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 1 })
});

export const forgotPasswordBody = t.Object({
  email: t.String({ format: 'email' })
});

export const resetPasswordBody = t.Object({
  token: t.String({ minLength: 1 }),
  newPassword: t.String({ pattern: PASSWORD_PATTERN })
});

export const refreshTokenBody = t.Object({
  refreshToken: t.String({ minLength: 1 })
});

export const verifyEmailBody = t.Object({
  token: t.String({ minLength: 1 })
});

export const resendVerificationBody = t.Object({
  email: t.String({ format: 'email' })
});
