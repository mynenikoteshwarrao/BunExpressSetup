import fs from 'fs-extra';
import path from 'path';
import { GeneratorResult, GeneratorError, resolveProject, assertValidName } from './context';

/**
 * Insert a task entry into src/enums/Task.ts (both enum and TaskDescriptions).
 * Returns true if the task was added, false if it already exists or the file is missing.
 */
// moved verbatim from cli.ts:120-174, cwd → projectRoot parameter
export const addTaskToEnum = async (projectRoot: string, taskKey: string, description: string): Promise<boolean> => {
  const enumPath = path.join(projectRoot, 'src', 'enums', 'Task.ts');

  if (!await fs.pathExists(enumPath)) {
    return false;
  }

  let content = await fs.readFile(enumPath, 'utf-8');

  // Skip if task already exists
  if (content.includes(`${taskKey} =`) || content.includes(`${taskKey}=`)) {
    return false;
  }

  // Insert new entry before the closing brace of the Task enum
  const enumClosingMatch = content.match(/([ \t]*\w+\s*=\s*'[^']*',?\s*\n)(}\s*\n)/);
  if (!enumClosingMatch) {
    return false;
  }

  const lastEntry = enumClosingMatch[1];
  const closingBrace = enumClosingMatch[2];

  const lastEntryWithComma = lastEntry.trimEnd().endsWith(',')
    ? lastEntry
    : lastEntry.replace(/(\S)\s*$/, '$1,\n');

  const newEnumEntry = `\n  /** ${description} */\n  ${taskKey} = '${taskKey}',\n`;

  content = content.replace(
    lastEntry + closingBrace,
    lastEntryWithComma + newEnumEntry + closingBrace
  );

  // Insert into TaskDescriptions
  const descClosingMatch = content.match(/([ \t]*\[Task\.\w+\]:\s*'[^']*',?\s*\n)(};\s*\n?)/);
  if (descClosingMatch) {
    const lastDescEntry = descClosingMatch[1];
    const descClosing = descClosingMatch[2];

    const lastDescWithComma = lastDescEntry.trimEnd().endsWith(',')
      ? lastDescEntry
      : lastDescEntry.replace(/(\S)\s*$/, '$1,\n');

    const newDescEntry = `  [Task.${taskKey}]: '${description.replace(/'/g, "\\'")}',\n`;

    content = content.replace(
      lastDescEntry + descClosing,
      lastDescWithComma + newDescEntry + descClosing
    );
  }

  await fs.writeFile(enumPath, content);
  return true;
};

export const createTask = async (opts: {
  projectRoot: string; name: string; description: string;
}): Promise<GeneratorResult> => {
  assertValidName(opts.name, /^[A-Z][A-Z0-9_]*$/, 'task name (UPPER_SNAKE_CASE)');
  if (!opts.description.trim()) {
    throw new GeneratorError('INVALID_INPUT', 'Task description is required');
  }
  if (/[\r\n]/.test(opts.description)) {
    throw new GeneratorError('INVALID_INPUT', 'Task description must be a single line');
  }
  const ctx = await resolveProject(opts.projectRoot);
  const enumPath = path.join(ctx.root, 'src', 'enums', 'Task.ts');
  if (!(await fs.pathExists(enumPath))) {
    throw new GeneratorError('IO_ERROR', `src/enums/Task.ts not found — run this inside a Koti project (koti new creates it)`);
  }
  const content = await fs.readFile(enumPath, 'utf-8');
  if (content.includes(`${opts.name} =`) || content.includes(`${opts.name}=`)) {
    throw new GeneratorError('DUPLICATE', `Task ${opts.name} already exists in Task.ts`);
  }
  const added = await addTaskToEnum(ctx.root, opts.name, opts.description);
  if (!added) {
    throw new GeneratorError('IO_ERROR', 'Could not parse src/enums/Task.ts — unexpected enum format');
  }
  return { files: [enumPath], warnings: ctx.warnings };
};
