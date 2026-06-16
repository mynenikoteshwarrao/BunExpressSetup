import { swagger } from '@elysiajs/swagger';

/**
 * OpenAPI documentation surface for the Elysia app.
 *
 * Parity note (matches the Express swagger.ts):
 *  - UI is served at `/docs/api` (primary). `/api-docs` + `/docs` + the `*.json`
 *    aliases are wired as redirect routes in `server.ts` (the plugin serves one
 *    base path; @elysiajs/swagger also exposes raw spec at `<path>/json`).
 *  - Reusable component schemas (ApiResponse, PaginatedResponse, ErrorResponse,
 *    ValidationError) and the two security schemes are declared here because
 *    auto-derived `t` route schemas do NOT reproduce them.
 */
export const SWAGGER_PATH = '/docs/api';

export const swaggerPlugin = () =>
  swagger({
    path: SWAGGER_PATH,
    documentation: {
      info: {
        title: '{{PROJECT_NAME}} API Documentation',
        version: '1.0.0',
        description: 'Comprehensive API documentation for the {{PROJECT_NAME}} application',
        contact: { name: 'API Support', email: 'support@example.com' },
        license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' }
      },
      servers: [
        { url: process.env.API_URL || 'http://localhost:8000', description: 'Development server' }
      ],
      tags: [
        { name: 'Authentication', description: 'User authentication and authorization' },
        { name: 'Users', description: 'User management' },
        { name: 'Documents', description: 'Document upload and management' },
        { name: 'TinyURL', description: 'URL shortening' },
        { name: 'Audit', description: 'Audit trail' },
        { name: 'System', description: 'Health and system endpoints' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' }
        },
        schemas: {
          ApiResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Operation completed successfully' },
              data: { type: 'object', description: 'Response data' },
              error: { type: 'string', description: 'Error message if success is false' }
            }
          },
          PaginatedResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'array', items: { type: 'object' } },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer', example: 1 },
                  limit: { type: 'integer', example: 10 },
                  total: { type: 'integer', example: 100 },
                  totalPages: { type: 'integer', example: 10 },
                  hasNext: { type: 'boolean', example: true },
                  hasPrev: { type: 'boolean', example: false }
                }
              }
            }
          },
          ErrorResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              message: { type: 'string', example: 'An error occurred' },
              error: { type: 'string', example: 'ValidationError' },
              statusCode: { type: 'integer', example: 400 }
            }
          },
          ValidationError: {
            type: 'object',
            properties: {
              field: { type: 'string', example: 'email' },
              message: { type: 'string', example: 'Email is required' }
            }
          }
        }
      }
    }
  });

export default swaggerPlugin;
