import fs from 'fs-extra';
import path from 'path';
import {
  GeneratorResult, GeneratorError, resolveProject, capitalize, toCamelCase, toUpperSnakeCase,
  updateIndexExport, assertValidName, FieldSpec, Framework, FIELD_TYPES,
  BUILTIN_MODELS, ModelManifestEntry, readModelManifest, upsertModelManifest,
} from './context';
import { addTaskToEnum } from './task';
import { generateTypeScriptModel } from './crud/mongoose/modelFile';
import { generateCRUDService } from './crud/mongoose/service';
import { generateCRUDController, generateJoiValidation, generateCRUDRoutes } from './crud/express';
import { generateElysiaCrudController, generateTypeBoxValidator, generateElysiaCrudRoutes } from './crud/elysia';

export interface CreateModelOptions {
  projectRoot: string;
  name: string;
  fields: FieldSpec[];
  crud?: boolean;
  tasks?: boolean;
}

export interface EditModelOptions {
  projectRoot: string;
  name: string;
  addFields?: FieldSpec[];
  removeFields?: string[];
  updateCrud?: boolean;
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

  if (!opts.crud) {
    await upsertModelManifest(ctx.root, capitalizedName, { fields: opts.fields, crud: false, rbacTasks: false });
    return { files, warnings };
  }

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
  await upsertModelManifest(ctx.root, capitalizedName, { fields: opts.fields, crud: true, rbacTasks: withTasks });
  return { files, warnings };
};

/**
 * Sniff a model's crud/rbacTasks flags from disk — used when backfilling the
 * manifest for a pre-3.2 project that has generated files but no manifest.
 */
const sniffModelFlags = async (
  projectRoot: string, camelName: string
): Promise<{ crud: boolean; rbacTasks: boolean }> => {
  const routePath = path.join(projectRoot, 'src', 'routes', `${camelName}.ts`);
  if (!(await fs.pathExists(routePath))) return { crud: false, rbacTasks: false };
  const routes = await fs.readFile(routePath, 'utf-8');
  return { crud: true, rbacTasks: routes.includes('checkPermission(') || routes.includes('auth: [Task.') };
};

/**
 * One-time importer for pre-3.2 mongodb projects: parse each user-authored
 * model file into the manifest. Built-ins and index.ts are skipped (ingesting
 * them would regenerate the auth models as generic CRUD), and a file that
 * cannot be parsed produces a warning rather than aborting the import.
 * Drizzle sources are never parsed — see spec §6.4.
 */
export const importManifestFromSource = async (
  root: string
): Promise<{ imported: string[]; warnings: string[] }> => {
  const imported: string[] = [];
  const warnings: string[] = [];
  const modelsDir = path.join(root, 'src', 'models');
  if (!(await fs.pathExists(modelsDir))) return { imported, warnings };

  const entries = (await fs.readdir(modelsDir)).filter(f => f.endsWith('.ts')).sort();
  for (const file of entries) {
    const name = path.basename(file, '.ts');
    if (name === 'index') continue;
    if ((BUILTIN_MODELS as readonly string[]).includes(name)) continue;
    try {
      const fields = await parseExistingModel(root, name);
      if (fields.length === 0) {
        warnings.push(`Could not import ${file} into the models manifest — no fields parsed; declare it manually in koti.config.json if it is a Koti model`);
        continue;
      }
      const flags = await sniffModelFlags(root, toCamelCase(name));
      await upsertModelManifest(root, name, { fields, ...flags });
      imported.push(name);
    } catch (error) {
      warnings.push(`Could not import ${file} into the models manifest (${(error as Error).message}) — declare it manually in koti.config.json if it is a Koti model`);
    }
  }
  return { imported, warnings };
};

// Moved verbatim from cli.ts:127-167 (parseExistingModel): cwd → projectRoot param;
// missing file / no schema match now throws IO_ERROR instead of returning an empty result.
export const parseExistingModel = async (projectRoot: string, name: string): Promise<FieldSpec[]> => {
  const modelPath = path.join(projectRoot, 'src', 'models', `${capitalize(name)}.ts`);

  if (!(await fs.pathExists(modelPath))) {
    throw new GeneratorError('IO_ERROR', `Model not found: ${modelPath}`);
  }

  const content = await fs.readFile(modelPath, 'utf-8');
  const fields: FieldSpec[] = [];

  // Simple regex parsing to extract schema fields
  // Match from `({` to `}, {` (the boundary between schema fields and schema options)
  const schemaMatch = content.match(/const\s+\w+Schema\s*=\s*new\s+Schema<.*?>\(\{([\s\S]*?)\},\s*\{/);

  if (!schemaMatch) {
    throw new GeneratorError('IO_ERROR', `Could not parse schema in ${modelPath}`);
  }

  const schemaContent = schemaMatch[1];
  // Optional `[` / `]` wrapper matches the array-of-mixed form generateTypeScriptModel
  // emits for Array fields, e.g. `tags: [{ type: Schema.Types.Mixed, index: true }]`
  // (see generators/crud/mongoose/modelFile.ts) — the plain `word: { ... }` form covers everything else.
  const fieldMatches = schemaContent.match(/(\w+):\s*(\[)?\{[^}]+\}(\])?/g);

  if (fieldMatches) {
    fieldMatches.forEach(fieldMatch => {
      const nameMatch = fieldMatch.match(/(\w+):/);
      const isArrayForm = /^\w+:\s*\[/.test(fieldMatch);
      const typeMatch = fieldMatch.match(/type:\s*(\w+)/);
      const requiredMatch = fieldMatch.match(/required:\s*(true|false)/);
      const uniqueMatch = fieldMatch.match(/unique:\s*(true|false)/);
      const indexMatch = fieldMatch.match(/index:\s*(true|false)/);
      const defaultMatch = fieldMatch.match(/default:\s*(['"].*?['"]|\d+|true|false)/);

      if (nameMatch && (isArrayForm || typeMatch)) {
        fields.push({
          name: nameMatch[1],
          type: isArrayForm ? 'Array' : (typeMatch![1] as FieldSpec['type']),
          required: requiredMatch ? requiredMatch[1] === 'true' : false,
          unique: uniqueMatch ? uniqueMatch[1] === 'true' : false,
          index: indexMatch ? indexMatch[1] === 'true' : false,
          default: defaultMatch ? defaultMatch[1].replace(/['"]/g, '') : undefined,
        });
      }
    });
  }

  return fields;
};

export const editModel = async (opts: EditModelOptions): Promise<GeneratorResult> => {
  assertValidName(opts.name, /^[A-Z][a-zA-Z0-9]*$/, 'model name (PascalCase)');
  const ctx = await resolveProject(opts.projectRoot);
  const capitalizedName = capitalize(opts.name);
  const camelName = toCamelCase(opts.name);
  const files: string[] = [];
  const warnings: string[] = [...ctx.warnings];

  // Manifest is authoritative for regeneration; the parser is only the
  // pre-3.2 fallback (and immediately backfills the manifest).
  const manifest = await readModelManifest(ctx.root);
  let entry: ModelManifestEntry | undefined = manifest[capitalizedName];
  if (!entry) {
    const parsed = await parseExistingModel(ctx.root, opts.name);
    entry = { fields: parsed, ...(await sniffModelFlags(ctx.root, camelName)) };
    await upsertModelManifest(ctx.root, capitalizedName, entry);
  }

  let updatedFields = entry.fields;
  for (const removeName of opts.removeFields ?? []) {
    if (!updatedFields.some(f => f.name === removeName)) {
      throw new GeneratorError('INVALID_INPUT', `Field "${removeName}" does not exist on ${capitalizedName}`);
    }
    updatedFields = updatedFields.filter(f => f.name !== removeName);
  }
  if (opts.addFields?.length) {
    validateFields(opts.addFields);
    for (const f of opts.addFields) {
      if (updatedFields.some(existing => existing.name === f.name)) {
        throw new GeneratorError('INVALID_INPUT', `Field "${f.name}" already exists on ${capitalizedName}`);
      }
    }
    updatedFields = [...updatedFields, ...opts.addFields];
  }
  if (updatedFields.length === 0) {
    throw new GeneratorError('INVALID_INPUT', 'Cannot remove all fields from a model');
  }

  const modelPath = path.join(ctx.root, 'src', 'models', `${capitalizedName}.ts`);
  if (await fs.pathExists(modelPath)) {
    const previousModel = await fs.readFile(modelPath, 'utf-8');
    await fs.writeFile(modelPath + '.bak', previousModel);
  }
  await fs.writeFile(modelPath, generateTypeScriptModel(opts.name, updatedFields));
  files.push(modelPath);

  if (opts.updateCrud) {
    const isElysia = ctx.framework === 'elysia';
    const routePath = path.join(ctx.root, 'src', 'routes', `${camelName}.ts`);
    // Legacy bug fix: detect whether the existing routes used RBAC so the regen keeps it
    let withTasks = false;
    if (await fs.pathExists(routePath)) {
      const existingRoutes = await fs.readFile(routePath, 'utf-8');
      withTasks = existingRoutes.includes('checkPermission(') || existingRoutes.includes('auth: [Task.');
    }
    const regens: Array<{ file: string; content: string }> = [
      { file: path.join(ctx.root, 'src', 'controllers', `${camelName}Controller.ts`),
        content: isElysia ? generateElysiaCrudController(opts.name, updatedFields) : generateCRUDController(opts.name, updatedFields) },
      { file: path.join(ctx.root, 'src', 'services', `${camelName}Service.ts`),
        content: generateCRUDService(opts.name, updatedFields) },
      { file: path.join(ctx.root, 'src', 'validators', `${camelName}.ts`),
        content: isElysia ? generateTypeBoxValidator(opts.name, updatedFields) : generateJoiValidation(opts.name, updatedFields) },
      { file: routePath,
        content: isElysia ? generateElysiaCrudRoutes(opts.name, updatedFields, withTasks) : generateCRUDRoutes(opts.name, updatedFields, withTasks) },
    ];
    for (const r of regens) {
      if (!(await fs.pathExists(r.file))) {
        warnings.push(`${path.relative(ctx.root, r.file)} did not exist — skipped`);
        continue;
      }
      const previous = await fs.readFile(r.file, 'utf-8');
      await fs.writeFile(r.file + '.bak', previous);
      await fs.writeFile(r.file, r.content);
      files.push(r.file);
    }
  }
  await upsertModelManifest(ctx.root, capitalizedName, { ...entry, fields: updatedFields });
  return { files, warnings };
};
