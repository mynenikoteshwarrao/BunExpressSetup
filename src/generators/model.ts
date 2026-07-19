import fs from 'fs-extra';
import path from 'path';
import {
  GeneratorResult, GeneratorError, resolveProject, capitalize, toCamelCase, toUpperSnakeCase,
  updateIndexExport, assertValidName, FieldSpec, Framework, FIELD_TYPES,
} from './context';
import { addTaskToEnum } from './task';
import { generateTypeScriptModel } from './crud/modelFile';
import { generateCRUDService } from './crud/service';
import { generateCRUDController, generateJoiValidation, generateCRUDRoutes } from './crud/express';
import { generateElysiaCrudController, generateTypeBoxValidator, generateElysiaCrudRoutes } from './crud/elysia';

export interface CreateModelOptions {
  projectRoot: string;
  name: string;
  fields: FieldSpec[];
  crud?: boolean;
  tasks?: boolean;
}

const validateFields = (fields: FieldSpec[]): void => {
  if (fields.length === 0) throw new GeneratorError('INVALID_INPUT', 'At least one field is required');
  for (const f of fields) {
    assertValidName(f.name, /^[a-zA-Z_][a-zA-Z0-9_]*$/, 'field name');
    if (!FIELD_TYPES.includes(f.type)) {
      throw new GeneratorError('INVALID_INPUT', `Unknown field type "${f.type}" (valid: ${FIELD_TYPES.join(', ')})`);
    }
    if (f.default !== undefined && /[\r\n]/.test(f.default)) {
      throw new GeneratorError('INVALID_INPUT', `Default value for ${f.name} must be a single line`);
    }
  }
};

// Express: moved verbatim from cli.ts:1424-1471 (updateMainRoutes), cwd → projectRoot param.
// Elysia: NEW — inserts `.use(xRoutes)` into the chain in routes/index.ts.
export const registerRouteInIndex = async (
  projectRoot: string, framework: Framework, camelName: string
): Promise<boolean> => {
  const indexPath = path.join(projectRoot, 'src', 'routes', 'index.ts');
  let content: string;
  try { content = await fs.readFile(indexPath, 'utf-8'); } catch { return false; }
  if (framework === 'express') {
    const importStatement = `import ${camelName}Routes from './${camelName}';`;
    const routeUsage = `router.use('/${camelName}', ${camelName}Routes);`;
    if (content.includes(importStatement)) return true;
    const lines = content.split('\n');
    let lastImportIndex = -1; let routerUseIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import') && lines[i].includes('from')) lastImportIndex = i;
      if (lines[i].includes('router.use') && lines[i].includes('Routes')) routerUseIndex = i;
    }
    if (lastImportIndex < 0 || routerUseIndex < 0) return false;
    lines.splice(lastImportIndex + 1, 0, importStatement);
    lines.splice(routerUseIndex + 2, 0, routeUsage); // +1 for inserted import, +1 to go after
    await fs.writeFile(indexPath, lines.join('\n'));
    return true;
  }
  // elysia
  const importStatement = `import { ${camelName}Routes } from './${camelName}';`;
  if (content.includes(importStatement)) return true;
  const lines = content.split('\n');
  let lastImportIndex = -1; let lastUseIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import') && lines[i].includes('from')) lastImportIndex = i;
    if (/^\s*\.use\(\w+Routes\);?\s*$/.test(lines[i])) lastUseIndex = i;
  }
  if (lastImportIndex < 0 || lastUseIndex < 0) return false;
  lines.splice(lastImportIndex + 1, 0, importStatement);
  lastUseIndex += 1;
  if (lines[lastUseIndex].trimEnd().endsWith(';')) {
    lines[lastUseIndex] = lines[lastUseIndex].replace(/;\s*$/, '');
    lines.splice(lastUseIndex + 1, 0, `  .use(${camelName}Routes);`);
  } else {
    lines.splice(lastUseIndex + 1, 0, `  .use(${camelName}Routes)`);
  }
  await fs.writeFile(indexPath, lines.join('\n'));
  return true;
};

export const createModel = async (opts: CreateModelOptions): Promise<GeneratorResult> => {
  assertValidName(opts.name, /^[A-Z][a-zA-Z0-9]*$/, 'model name (PascalCase)');
  validateFields(opts.fields);
  const ctx = await resolveProject(opts.projectRoot);
  const capitalizedName = capitalize(opts.name);
  const camelName = toCamelCase(opts.name);
  const upperSnakeName = toUpperSnakeCase(opts.name);
  const files: string[] = [];
  const warnings: string[] = [...ctx.warnings];

  const modelPath = path.join(ctx.root, 'src', 'models', `${capitalizedName}.ts`);
  if (await fs.pathExists(modelPath)) {
    throw new GeneratorError('DUPLICATE', `Model already exists: ${modelPath}`);
  }
  await fs.ensureDir(path.dirname(modelPath));
  await fs.writeFile(modelPath, generateTypeScriptModel(opts.name, opts.fields));
  files.push(modelPath);
  await updateIndexExport(
    path.join(ctx.root, 'src', 'models'),
    `export { default as ${capitalizedName}, I${capitalizedName} } from './${capitalizedName}';`
  );

  if (!opts.crud) return { files, warnings };

  // RBAC tasks first, so routes stay consistent with the enum (legacy cli.ts:2312-2331 behavior)
  let withTasks = !!opts.tasks;
  if (withTasks) {
    const taskEntries = [
      { key: `VIEW_${upperSnakeName}`, desc: `View the list of ${camelName}s and ${camelName} details` },
      { key: `CREATE_${upperSnakeName}`, desc: `Create new ${camelName} records` },
      { key: `UPDATE_${upperSnakeName}`, desc: `Update existing ${camelName} records` },
      { key: `DELETE_${upperSnakeName}`, desc: `Delete ${camelName} records` },
    ];
    let added = 0;
    for (const entry of taskEntries) {
      if (await addTaskToEnum(ctx.root, entry.key, entry.desc)) added++;
    }
    if (added > 0) {
      files.push(path.join(ctx.root, 'src', 'enums', 'Task.ts'));
    } else {
      withTasks = false;
      warnings.push('No RBAC tasks were added (Task.ts missing or entries already exist) — routes generated without permission middleware');
    }
  }

  const isElysia = ctx.framework === 'elysia';
  const writes: Array<{ file: string; content: string; barrelDir?: string; barrelLine?: string }> = [
    {
      file: path.join(ctx.root, 'src', 'controllers', `${camelName}Controller.ts`),
      content: isElysia ? generateElysiaCrudController(opts.name, opts.fields) : generateCRUDController(opts.name, opts.fields),
      barrelDir: path.join(ctx.root, 'src', 'controllers'),
      barrelLine: `export { default as ${camelName}Controller } from './${camelName}Controller';`,
    },
    {
      file: path.join(ctx.root, 'src', 'services', `${camelName}Service.ts`),
      content: generateCRUDService(opts.name, opts.fields),
      barrelDir: path.join(ctx.root, 'src', 'services'),
      barrelLine: `export * from './${camelName}Service';`,
    },
    {
      file: path.join(ctx.root, 'src', 'validators', `${camelName}.ts`),
      content: isElysia ? generateTypeBoxValidator(opts.name, opts.fields) : generateJoiValidation(opts.name, opts.fields),
    },
    {
      file: path.join(ctx.root, 'src', 'routes', `${camelName}.ts`),
      content: isElysia ? generateElysiaCrudRoutes(opts.name, opts.fields, withTasks) : generateCRUDRoutes(opts.name, opts.fields, withTasks),
    },
  ];
  for (const w of writes) {
    await fs.ensureDir(path.dirname(w.file));
    await fs.writeFile(w.file, w.content);
    files.push(w.file);
    if (w.barrelDir && w.barrelLine) await updateIndexExport(w.barrelDir, w.barrelLine);
  }

  const registered = await registerRouteInIndex(ctx.root, ctx.framework, camelName);
  if (!registered) {
    warnings.push(
      ctx.framework === 'express'
        ? `Could not update src/routes/index.ts — add manually: router.use('/${camelName}', ${camelName}Routes);`
        : `Could not update src/routes/index.ts — add manually: .use(${camelName}Routes)`
    );
  }
  return { files, warnings };
};
