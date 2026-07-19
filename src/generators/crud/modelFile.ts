import { FieldSpec, capitalize } from '../context';

// Generate TypeScript Model
// moved from cli.ts:554-591 (generateTypeScriptModel) with fixes:
//   - index option support
//   - JSON fields map to Schema.Types.Mixed instead of raw `JSON` identifier
//   - typed signature (FieldSpec[] instead of any[])
export const generateTypeScriptModel = (modelName: string, fields: FieldSpec[]): string => {
  const capitalizedName = capitalize(modelName);
  const fieldsCode = fields.map(field => {
    const options = [];
    if (field.required) options.push('required: true');
    if (field.unique) options.push('unique: true');
    if (field.index) options.push('index: true');
    if (field.default) options.push(`default: ${field.type === 'String' ? `'${field.default}'` : field.default}`);

    const optionsString = options.length > 0 ? `,  ${options.join(', ')}` : '';
    if (field.type === 'Array') {
      // `{ type: [Schema.Types.Mixed] }` fails to typecheck under a generic
      // `Schema<T>()` when the interface field is `any[]` (mongoose@8's nested
      // SchemaTypeOptions union resolves incorrectly for `any` in that position).
      // `[{ type: Schema.Types.Mixed }]` is the idiomatic mongoose array-of-mixed
      // form and typechecks cleanly against `any[]`.
      return `  ${field.name}: [{ type: Schema.Types.Mixed${optionsString} }]`;
    }
    const mongooseType = (field.type === 'Mixed' || field.type === 'JSON') ? 'Schema.Types.Mixed' : field.type;
    return `  ${field.name}: { type: ${mongooseType}${optionsString} }`;
  }).join(',\n');

  return `import { Schema, model, Document, Types } from 'mongoose';

export interface I${capitalizedName} extends Document {
${fields.map(field => {
  const tsType = field.type === 'ObjectId' ? 'Types.ObjectId' :
                 field.type === 'String' ? 'string' :
                 field.type === 'Number' ? 'number' :
                 field.type === 'Boolean' ? 'boolean' :
                 field.type === 'Date' ? 'Date' :
                 field.type === 'Array' ? 'any[]' : 'any';
  return `  ${field.name}: ${tsType};`;
}).join('\n')}
}

const ${capitalizedName}Schema = new Schema<I${capitalizedName}>({
${fieldsCode}
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export const ${capitalizedName} = model<I${capitalizedName}>('${capitalizedName}', ${capitalizedName}Schema);
export default ${capitalizedName};
`;
};
