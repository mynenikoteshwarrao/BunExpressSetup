/**
 * Mongoose normalizes in the schema (`lowercase: true`, `trim: true`) and does
 * it on query filters as well as on writes. Drizzle has no schema layer, so
 * every read and every write that touches these columns normalizes here —
 * otherwise "John@Example.com" and "john@example.com" become two accounts and
 * neither Google account-linking nor password reset can find the right row.
 */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const normalizeUsername = (username: string): string => username.trim();
