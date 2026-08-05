export * from './authService';
export * from './auditService';
export * from './tinyUrlService';
export * from './documentService';
export * from './userService';

// Both authService and userService define `getUserById`; two star exports make
// the name ambiguous and drop it. The userService variant (admin lookup, roles
// attached, 404 on miss) is the one the barrel re-exports.
export { getUserById } from './userService';
