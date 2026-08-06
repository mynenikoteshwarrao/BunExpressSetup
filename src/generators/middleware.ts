import fs from 'fs-extra';
import path from 'path';
import {
  GeneratorResult, GeneratorError, resolveProject, capitalize, toCamelCase,
  updateIndexExport, assertValidName,
} from './context';

// Generate TypeScript Middleware
// moved verbatim from cli.ts:781-813 (generateTypeScriptMiddleware)
const generateExpressMiddleware = (middlewareName: string): string => {
  const camelCaseName = toCamelCase(middlewareName);

  return `import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

/**
 * ${capitalize(middlewareName)} middleware
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const ${camelCaseName} = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // TODO: Implement middleware logic here
    console.log(\`${capitalize(middlewareName)} middleware executed for \${req.method} \${req.path}\`);

    // Example: Check some condition
    const isValid = true; // Replace with actual validation logic

    if (!isValid) {
      return next(new AppError('${capitalize(middlewareName)} validation failed', 400));
    }

    next();
  } catch (error) {
    next(new AppError(\`${capitalize(middlewareName)} middleware error\`, 500));
  }
};

export default ${camelCaseName};
`;
};

const generateElysiaMiddleware = (middlewareName: string): string => {
  const camelCaseName = toCamelCase(middlewareName);
  return `import { Elysia } from 'elysia';

/**
 * ${capitalize(middlewareName)} middleware plugin
 * Attach with .use(${camelCaseName}) on an Elysia instance or route group.
 */
export const ${camelCaseName} = new Elysia({ name: '${camelCaseName}' })
  .onBeforeHandle(({ request, set }) => {
    // TODO: Implement middleware logic here
    console.log(\`${capitalize(middlewareName)} middleware executed for \${request.method} \${new URL(request.url).pathname}\`);

    // Example: block the request by returning a response
    // set.status = 400;
    // return { success: false, message: '${capitalize(middlewareName)} validation failed' };
  });

export default ${camelCaseName};
`;
};

export const createMiddleware = async (opts: { projectRoot: string; name: string }): Promise<GeneratorResult> => {
  assertValidName(opts.name, /^[A-Za-z][a-zA-Z0-9]*$/, 'middleware name');
  const ctx = await resolveProject(opts.projectRoot);
  const camelName = toCamelCase(opts.name);
  const filePath = path.join(ctx.root, 'src', 'middleware', `${camelName}.ts`);
  if (await fs.pathExists(filePath)) {
    throw new GeneratorError('DUPLICATE', `Middleware already exists: ${filePath}`);
  }
  const content = ctx.framework === 'elysia'
    ? generateElysiaMiddleware(opts.name)
    : generateExpressMiddleware(opts.name);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content);
  await updateIndexExport(
    path.join(ctx.root, 'src', 'middleware'),
    `export { ${camelName} } from './${camelName}';`
  );
  return { files: [filePath], warnings: ctx.warnings };
};
