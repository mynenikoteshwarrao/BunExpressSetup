/**
 * Audit logging is performed INSIDE the services (parity with Express):
 * `documentService.updateDocument/deleteDocument` and `userService.deleteUser`
 * call `AuditService.logAction` directly, threaded with an `updatedBy`/`deletedBy`
 * actor id from the controller. Express once shipped an `auditMiddleware` (a res.json
 * override gated on `req.sessionID`); it was dead/unwired code, was never ported here,
 * and was deleted in v3.2 — a global response hook here would double-log.
 *
 * This module provides only a small helper to derive request metadata
 * (ip + user-agent) for any service-level audit entry, since Elysia has no
 * `req.ip`. A global `onAfterHandle` audit hook could be added later as a
 * deliberate enhancement beyond Express parity (must guard against double-logging).
 */
export interface AuditMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export const getAuditMetadata = (
  request: Request,
  server: { requestIP?: (req: Request) => { address?: string } | null } | null,
  headers: Record<string, string | undefined>
): AuditMetadata => ({
  ipAddress: server?.requestIP?.(request)?.address || headers['x-forwarded-for'],
  userAgent: headers['user-agent']
});
