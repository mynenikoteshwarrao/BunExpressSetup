import fs from 'fs-extra';
import path from 'path';
import {
  GeneratorResult, GeneratorError, resolveProject, capitalize, toCamelCase,
  updateIndexExport, assertValidName,
} from './context';

// Generate TypeScript Service
// moved verbatim from cli.ts:735-778 (generateTypeScriptService) — framework-neutral, used for both frameworks
const generateService = (serviceName: string): string => {
  const capitalizedName = capitalize(serviceName);

  return `import { AppError } from '../utils/AppError';

export class ${capitalizedName}Service {
  /**
   * Service method example
   * @param data - Input data
   * @returns Promise<any>
   */
  public async performOperation(data: any): Promise<any> {
    try {
      // TODO: Implement service logic here
      return data;
    } catch (error) {
      throw new AppError(\`${capitalizedName} service error: \${error}\`, 500);
    }
  }

  /**
   * Validation method example
   * @param data - Data to validate
   * @returns boolean
   */
  public validateData(data: any): boolean {
    // TODO: Implement validation logic
    return data !== null && data !== undefined;
  }

  /**
   * Process data method example
   * @param rawData - Raw data to process
   * @returns Processed data
   */
  public processData(rawData: any): any {
    // TODO: Implement data processing logic
    return rawData;
  }
}

export default new ${capitalizedName}Service();
`;
};

export const createService = async (opts: { projectRoot: string; name: string }): Promise<GeneratorResult> => {
  assertValidName(opts.name, /^[A-Z][a-zA-Z0-9]*$/, 'service name (PascalCase)');
  const ctx = await resolveProject(opts.projectRoot);
  const camelName = toCamelCase(opts.name);
  const filePath = path.join(ctx.root, 'src', 'services', `${camelName}Service.ts`);
  if (await fs.pathExists(filePath)) {
    throw new GeneratorError('DUPLICATE', `Service already exists: ${filePath}`);
  }
  const content = generateService(opts.name);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content);
  await updateIndexExport(
    path.join(ctx.root, 'src', 'services'),
    `export * from './${camelName}Service';`
  );
  return { files: [filePath], warnings: ctx.warnings };
};
