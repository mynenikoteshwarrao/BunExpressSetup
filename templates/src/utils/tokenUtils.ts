import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;

export interface TokenPayload {
  userId: string;
  exp?: number;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  const accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
  const options: SignOptions = { expiresIn: accessTokenExpiry };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  const refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const options: SignOptions = { expiresIn: refreshTokenExpiry };
  return jwt.sign(payload, JWT_REFRESH_SECRET, options);
};

export const verifyAccessToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};