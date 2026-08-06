import fs from 'fs-extra';
import path from 'path';
import {
  GeneratorResult, GeneratorError, resolveProject, capitalize, updateIndexExport, assertValidName,
} from './context';

export interface EnumValue { key: string; value: string | number; }

// moved verbatim from cli.ts:648-664
const generateTypeScriptEnum = (enumName: string, enumType: 'string' | 'number', values: EnumValue[]): string => {
  const capitalizedName = capitalize(enumName);
  const enumValues = values.map(({ key, value }) => {
    if (enumType === 'string') { return `  ${key} = '${value}'`; }
    return `  ${key} = ${value}`;
  }).join(',\n');
  return `export enum ${capitalizedName} {\n${enumValues}\n}\n\nexport default ${capitalizedName};\n`;
};

export const createEnum = async (opts: {
  projectRoot: string; name: string; enumType: 'string' | 'number'; values: EnumValue[];
}): Promise<GeneratorResult> => {
  assertValidName(opts.name, /^[A-Z][a-zA-Z0-9]*$/, 'enum name (PascalCase)');
  for (const v of opts.values) {
    assertValidName(v.key, /^[A-Z][A-Z0-9_]*$/, 'enum key (UPPER_SNAKE_CASE)');
    if (typeof v.value === 'string' && /[\r\n']/.test(v.value)) {
      throw new GeneratorError('INVALID_INPUT', `Enum value for ${v.key} must not contain newlines or quotes`);
    }
  }
  if (opts.values.length === 0) {
    throw new GeneratorError('INVALID_INPUT', 'At least one enum value is required');
  }
  const ctx = await resolveProject(opts.projectRoot);
  const capitalizedName = capitalize(opts.name);
  const enumPath = path.join(ctx.root, 'src', 'enums', `${capitalizedName}.ts`);
  if (await fs.pathExists(enumPath)) {
    throw new GeneratorError('DUPLICATE', `Enum already exists: ${enumPath}`);
  }
  await fs.ensureDir(path.dirname(enumPath));
  await fs.writeFile(enumPath, generateTypeScriptEnum(opts.name, opts.enumType, opts.values));
  await updateIndexExport(path.join(ctx.root, 'src', 'enums'), `export { ${capitalizedName} } from './${capitalizedName}';`);
  return { files: [enumPath], warnings: ctx.warnings };
};
