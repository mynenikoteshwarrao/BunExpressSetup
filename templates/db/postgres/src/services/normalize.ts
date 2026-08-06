/**
 * Input shaping for the Drizzle layer — everything Mongoose did in the schema
 * and this layer has to do by hand.
 */

/**
 * Mongoose normalizes in the schema (`lowercase: true`, `trim: true`) and does
 * it on query filters as well as on writes. Drizzle has no schema layer, so
 * every read and every write that touches these columns normalizes here —
 * otherwise "John@Example.com" and "john@example.com" become two accounts and
 * neither Google account-linking nor password reset can find the right row.
 */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const normalizeUsername = (username: string): string => username.trim();

/**
 * Drops undefined keys from an update payload. `Object.assign` + `save()`
 * ignored them and answered 200 unchanged; drizzle's `.set({})` throws
 * "No values to set", turning the same request into a 500. Callers check the
 * result for emptiness and skip the write instead.
 */
export const definedOnly = <T extends object>(patch: T): Partial<T> =>
  Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<T>;
