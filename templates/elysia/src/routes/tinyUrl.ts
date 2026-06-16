import { Elysia, t } from 'elysia';
import { tinyUrlController } from '../controllers/tinyUrlController';

const tag = ['TinyURL'];

export const tinyUrlRoutes = new Elysia({ prefix: '/tiny' })
  .post('/shorten', tinyUrlController.shortenUrl, {
    body: t.Object({ originalUrl: t.String({ format: 'uri' }) }),
    detail: { tags: tag, summary: 'Shorten a URL' }
  })
  .post('/redirect/:id', tinyUrlController.redirectUrl, {
    params: t.Object({ id: t.String() }),
    body: t.Optional(t.Object({ shortUrl: t.Optional(t.String()) })),
    detail: { tags: tag, summary: 'Get original URL from shortened ID' }
  })
  .get('/:id', tinyUrlController.getUrl, {
    params: t.Object({ id: t.String() }),
    detail: { tags: tag, summary: 'Get URL information by short ID' }
  });

export default tinyUrlRoutes;
