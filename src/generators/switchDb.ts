import fs from 'fs-extra';
import path from 'path';
import {
  Database, DATABASES, Framework, GeneratorError, GeneratorResult,
  ModelManifestEntry, capitalize, toCamelCase, resolveProject, templatesDir,
  updateIndexExport, readModelManifest,
} from './context';
import { applyDbFragments } from './project';
import { importManifestFromSource } from './model';
import { generateTypeScriptModel } from './crud/mongoose/modelFile';
import { generateCRUDService } from './crud/mongoose/service';
import { generateDrizzleModel } from './crud/drizzle/modelFile';
import { generateDrizzleCRUDService } from './crud/drizzle/service';
import { generateJoiValidation } from './crud/express';
import { generateTypeBoxValidator } from './crud/elysia';

/** Entries under templates/db/<name>/ that are composed rather than copied whole. */
const FRAGMENT_ENTRIES = new Set(['src', 'package.deps.json', 'env.fragment', 'readme.fragment.md']);

/**
 * Root-level files/directories a db layer owns, derived the same way the
 * scaffold copies them (project.ts) so the two can never drift apart.
 */
const rootEntriesOf = async (database: Database): Promise<string[]> => {
  const entries = await fs.readdir(path.join(templatesDir(), 'db', database)).catch(() => [] as string[]);
  return entries.filter(e => !FRAGMENT_ENTRIES.has(e));
};

/** Every file a db layer ships under src/, as paths relative to src/. */
const srcFilesOf = async (database: Database): Promise<Set<string>> => {
  const base = path.join(templatesDir(), 'db', database, 'src');
  const found = new Set<string>();
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else found.add(path.relative(base, full));
    }
  };
  await walk(base);
  return found;
};

/**
 * Files the outgoing layer owns that the incoming one does not provide. The
 * overlay copy cannot displace these — left live they still import the ORM
 * whose dependency the switch just removed, and the project stops compiling.
 */
const orphansOf = async (source: Database, target: Database): Promise<string[]> => {
  const [from, to] = await Promise.all([srcFilesOf(source), srcFilesOf(target)]);
  return [...from].filter(f => !to.has(f)).sort();
};

/** Same convention as editModel: the previous content lives on at <file>.bak. */
const backup = async (target: string): Promise<boolean> => {
  if (!(await fs.pathExists(target))) return false;
  await fs.copy(target, `${target}.bak`, { overwrite: true });
  return true;
};

const listFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir).catch(() => [] as string[]);
  return entries.filter(e => e.endsWith('.ts') && !e.endsWith('.bak')).map(e => path.join(dir, e));
};

/** Comments the live DB connection line out instead of dropping it (spec 7.2 step 7). */
const commentOutDbLine = async (file: string): Promise<void> => {
  if (!(await fs.pathExists(file))) return;
  const content = await fs.readFile(file, 'utf-8');
  const next = content
    .split('\n')
    .map(l => (/^\s*(MONGODB_URI|DATABASE_URL)\s*=/.test(l) ? `# ${l.trim()}` : l))
    .join('\n');
  await fs.writeFile(file, next);
};

/** Drops every dependency/script the source db layer contributed. */
const removeDbFragment = async (projectPath: string, source: Database): Promise<void> => {
  const fragmentPath = path.join(templatesDir(), 'db', source, 'package.deps.json');
  const pkgPath = path.join(projectPath, 'package.json');
  if (!(await fs.pathExists(fragmentPath)) || !(await fs.pathExists(pkgPath))) return;

  const fragment = await fs.readJson(fragmentPath);
  const pkg = await fs.readJson(pkgPath);
  for (const section of ['dependencies', 'devDependencies', 'scripts'] as const) {
    const names = Object.keys(fragment[section] ?? {});
    if (names.length === 0 || !pkg[section]) continue;
    for (const name of names) delete pkg[section][name];
  }
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });
};

const modelBarrelLine = (name: string, database: Database): string =>
  database === 'postgres'
    ? `export * from './${name}';`
    : `export { default as ${name}, I${name} } from './${name}';`;

/**
 * Converts a project between database layers. Code only — no data is moved,
 * and every file this overwrites is kept as a sibling `.bak`.
 */
export const switchDatabase = async (
  projectRoot: string,
  target: Database,
): Promise<GeneratorResult & { nextSteps: string[] }> => {
  // 1. Resolve and validate.
  if (!DATABASES.includes(target)) {
    throw new GeneratorError('UNSUPPORTED_DATABASE', `Unsupported database: "${target}" (must be one of ${DATABASES.join(', ')})`);
  }
  const ctx = await resolveProject(projectRoot);
  const source = ctx.database;
  if (source === target) {
    throw new GeneratorError('INVALID_INPUT', `Project already uses ${target} — nothing to switch`);
  }

  const root = ctx.root;
  const files: string[] = [];
  const warnings: string[] = [...ctx.warnings];
  const configPath = path.join(root, 'koti.config.json');

  // 2. Manifest. Mongo sources may predate 3.2 and get a one-time import;
  //    drizzle sources are never parsed, so a lost manifest is fatal.
  //    Nothing read here may be held for the step-8 write: the import below
  //    persists the manifest, so a snapshot taken now is already stale.
  let initialConfig: Record<string, any>;
  try {
    initialConfig = await fs.readJson(configPath);
  } catch {
    throw new GeneratorError('IO_ERROR', `Cannot read ${configPath}`);
  }
  if (!initialConfig.models) {
    if (source === 'postgres') {
      throw new GeneratorError(
        'IO_ERROR',
        'koti.config.json has no "models" manifest and Drizzle sources are never parsed. ' +
        'Restore koti.config.json (or re-add the "models" section by hand) before switching.',
      );
    }
    const imported = await importManifestFromSource(root);
    warnings.push(...imported.warnings);
    if (imported.imported.length > 0) {
      warnings.push(`Imported ${imported.imported.length} model(s) into the manifest from source: ${imported.imported.join(', ')}`);
    }
  }
  const manifest = await readModelManifest(root);
  const modelNames = Object.keys(manifest);

  // 3. Back up everything steps 4-5 overwrite or retire.
  const srcDir = path.join(root, 'src');
  const [sourceRootEntries, targetRootEntries, orphans] = await Promise.all([
    rootEntriesOf(source), rootEntriesOf(target), orphansOf(source, target),
  ]);
  const retiredRootEntries = sourceRootEntries.filter(e => !targetRootEntries.includes(e));
  const backupTargets = [
    path.join(srcDir, 'config', 'database.ts'),
    ...(await listFiles(path.join(srcDir, 'models'))),
    ...(await listFiles(path.join(srcDir, 'services'))),
    ...(await listFiles(path.join(srcDir, 'seeds'))),
    ...modelNames.map(n => path.join(srcDir, 'validators', `${toCamelCase(n)}.ts`)),
    ...orphans.map(rel => path.join(srcDir, rel)),
    ...retiredRootEntries.map(e => path.join(root, e)),
  ];
  for (const t of new Set(backupTargets)) {
    if (await backup(t)) files.push(`${t}.bak`);
  }

  // 4. Overlay the target db layer, then retire what it does not replace.
  const dbTemplateDir = path.join(templatesDir(), 'db', target);
  const dbTemplateSrc = path.join(dbTemplateDir, 'src');
  if (await fs.pathExists(dbTemplateSrc)) {
    await fs.copy(dbTemplateSrc, srcDir, { overwrite: true });
  }
  for (const entry of targetRootEntries) {
    const dest = path.join(root, entry);
    const restored = `${dest}.bak`;
    // A round-trip keeps its own migration history; a first switch gets the
    // shipped initial migration.
    if (await fs.pathExists(restored)) {
      await fs.copy(restored, dest, { overwrite: true });
    } else if (await fs.pathExists(path.join(dbTemplateDir, entry))) {
      await fs.copy(path.join(dbTemplateDir, entry), dest, { overwrite: true });
    }
    files.push(dest);
  }
  // The overlay only replaces files the target layer also ships; anything the
  // outgoing layer alone owned lives on as a .bak and nothing else.
  for (const rel of orphans) await fs.remove(path.join(srcDir, rel));
  for (const entry of retiredRootEntries) await fs.remove(path.join(root, entry));

  // 5. Regenerate every manifest model in the target idiom. The overlay just
  //    reset the barrels to the built-ins, so each model re-appends its line.
  const isPg = target === 'postgres';
  const isElysia = ctx.framework === 'elysia';
  for (const [name, entry] of Object.entries(manifest) as Array<[string, ModelManifestEntry]>) {
    const capitalizedName = capitalize(name);
    const camelName = toCamelCase(name);

    const modelPath = path.join(srcDir, 'models', `${capitalizedName}.ts`);
    await fs.writeFile(modelPath, isPg
      ? generateDrizzleModel(name, entry.fields, warnings)
      : generateTypeScriptModel(name, entry.fields));
    files.push(modelPath);
    await updateIndexExport(path.join(srcDir, 'models'), modelBarrelLine(capitalizedName, target));

    if (!entry.crud) continue;

    const servicePath = path.join(srcDir, 'services', `${camelName}Service.ts`);
    await fs.writeFile(servicePath, isPg
      ? generateDrizzleCRUDService(name, entry.fields)
      : generateCRUDService(name, entry.fields));
    files.push(servicePath);
    await updateIndexExport(path.join(srcDir, 'services'), `export * from './${camelName}Service';`);

    const validatorPath = path.join(srcDir, 'validators', `${camelName}.ts`);
    await fs.writeFile(validatorPath, isElysia
      ? generateTypeBoxValidator(name, entry.fields, target)
      : generateJoiValidation(name, entry.fields, target));
    files.push(validatorPath);
  }

  // 6/7. Deps and env. The old connection line is commented out first so the
  //      fragment inserts a new one instead of overwriting it.
  await removeDbFragment(root, source);
  for (const envFile of ['.env', '.env.example']) {
    await commentOutDbLine(path.join(root, envFile));
  }
  const projectName = await fs.readJson(path.join(root, 'package.json'))
    .then((p: { name?: string }) => p.name ?? path.basename(root))
    .catch(() => path.basename(root));
  await applyDbFragments(root, target, ctx.framework as Framework, projectName);

  // 8. Record the new axis — fresh read-modify-write of the `database` key only,
  //    so the manifest written by the step-2 import survives.
  const config = await fs.readJson(configPath).catch(() => {
    throw new GeneratorError('IO_ERROR', `Cannot read ${configPath}`);
  });
  config.database = target;
  await fs.writeJson(configPath, config, { spaces: 2 });
  files.push(configPath);

  // 9. What the user has to do by hand.
  const nextSteps = [
    'Install dependencies: bun install (or npm install)',
    ...(isPg
      ? [
        'Generate a migration for your own models: npm run db:generate',
        'Apply migrations: npm run db:migrate',
        'Start PostgreSQL and set DATABASE_URL in .env',
      ]
      : ['Start MongoDB and set MONGODB_URI in .env']),
    'Re-seed the new database: npm run seed',
    'Review the .bak files, then delete them once you are happy',
  ];
  warnings.push('Data is not migrated — db:switch converts code only, and the new database starts empty');
  if (isPg) {
    warnings.push('Drizzle migration history is not preserved across a round-trip unless the previous drizzle/ directory was restored from .bak');
  }

  return { files, warnings, nextSteps };
};
