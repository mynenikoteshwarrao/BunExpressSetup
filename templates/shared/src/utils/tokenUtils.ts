import jwt from 'jsonwebtoken';

interface TokenPayload {
  userId: string;
  email?: string;
  username?: string;
}

// Pinned signing algorithm — prevents algorithm-confusion / `alg: none` attacks.
const JWT_ALGORITHM = 'HS256' as const;

/**
 * Read a required secret from the environment. No insecure hardcoded fallback —
 * the server fails fast (on first token operation) if it is missing. Evaluated
 * lazily (not at import time) so it works regardless of when dotenv loads.
 */
const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in your .env before starting the server.`
    );
  }
  return value;
};

const accessSecret = (): string => requireEnv('JWT_SECRET');
// Refresh uses its own secret when provided, otherwise falls back to JWT_SECRET
// (never to a hardcoded value). Env names match .env / .env.example / README.
const refreshSecret = (): string => process.env.JWT_REFRESH_SECRET || requireEnv('JWT_SECRET');
const accessExpiry = (): string => process.env.JWT_EXPIRES_IN || '15m';
const refreshExpiry = (): string => process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export const generateAccessToken = async (payload: TokenPayload): Promise<string> => {
  return jwt.sign(payload, accessSecret(), {
    expiresIn: accessExpiry(),
    algorithm: JWT_ALGORITHM
  } as jwt.SignOptions);
};

export const generateRefreshToken = async (payload: TokenPayload): Promise<string> => {
  return jwt.sign(payload, refreshSecret(), {
    expiresIn: refreshExpiry(),
    algorithm: JWT_ALGORITHM
  } as jwt.SignOptions);
};

export const verifyAccessToken = async (token: string): Promise<TokenPayload | null> => {
  // Resolve the secret BEFORE the try so a missing-secret error fails fast
  // instead of being swallowed and mistaken for an invalid token.
  const secret = accessSecret();
  try {
    return jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM] }) as TokenPayload;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = async (token: string): Promise<TokenPayload | null> => {
  const secret = refreshSecret();
  try {
    return jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM] }) as TokenPayload;
  } catch (error) {
    return null;
  }
};
