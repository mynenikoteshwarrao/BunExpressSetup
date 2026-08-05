#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as readline from 'readline';
import {
  GeneratorError, FieldSpec, resolveProject, getVersion, Framework, FRAMEWORKS, Database, DATABASES,
  capitalize, toCamelCase, toUpperSnakeCase, readModelManifest,
} from './generators/context';
import { createEnum } from './generators/enum';
import { createTask } from './generators/task';
import { createController } from './generators/controller';
import { createService } from './generators/service';
import { createMiddleware } from './generators/middleware';
import { createModel, editModel, parseExistingModel } from './generators/model';
import { createProject } from './generators/project';

interface Colors {
  green: (text: string) => string;
  blue: (text: string) => string;
  yellow: (text: string) => string;
  red: (text: string) => string;
  cyan: (text: string) => string;
  bold: (text: string) => string;
  dim: (text: string) => string;
}

const program = new Command();

// Console colors without chalk
const colors: Colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`
};

// Available enum types for generation
const enumTypes: string[] = ['string', 'number'];

// Helper function to create readline interface
const createReadlineInterface = (): readline.Interface => {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
};

// Helper function to ask question
const askQuestion = (rl: readline.Interface, question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
};

program
  .name('koti')
  .description('⚠️  DEVELOPMENT VERSION: CLI tool to generate TypeScript Bun API projects with Express and MongoDB\n    This is an initial development release and may contain errors or bugs.\n    Use at your own discretion and always review generated code before production use.')
  .version(getVersion());

// TypeScript Model Generation Command
program
  .command('model')
  .argument('<model-name>', 'Name of the model to create')
  .description('Create a new TypeScript model with schema registry')
  .action(async (modelName: string) => {
    try {
      console.log(colors.blue(`🏗️ Creating TypeScript model: ${capitalize(modelName)}`));

      const rl = createReadlineInterface();
      const fields: FieldSpec[] = [];

      console.log(colors.cyan('\n📝 Define your model fields:'));
      console.log(colors.dim('Available data types:'));
      console.log(colors.dim('1. String    2. Number    3. Date      4. Boolean'));
      console.log(colors.dim('5. ObjectId  6. Array     7. Mixed     8. JSON'));
      console.log(colors.dim('Type "done" when finished\n'));

      const dataTypes = ['String', 'Number', 'Date', 'Boolean', 'ObjectId', 'Array', 'Mixed', 'JSON'];

      let fieldName = '';
      while (fieldName !== 'done') {
        fieldName = await askQuestion(rl, colors.yellow('Field name (or "done" to finish): '));

        if (fieldName === 'done') break;
        if (!fieldName.trim()) continue;

        // Show data type options
        console.log(colors.cyan('\nSelect data type:'));
        dataTypes.forEach((type, index) => {
          console.log(colors.dim(`${index + 1}. ${type}`));
        });

        const typeChoice = await askQuestion(rl, colors.yellow('Enter type number (1-8): '));
        const typeIndex = parseInt(typeChoice) - 1;

        if (typeIndex < 0 || typeIndex >= dataTypes.length) {
          console.log(colors.red('❌ Invalid choice. Please select 1-8.'));
          continue;
        }

        const fieldType = dataTypes[typeIndex];
        const isRequired = (await askQuestion(rl, colors.yellow('Required? (y/n): '))).toLowerCase() === 'y';
        const isUnique = (await askQuestion(rl, colors.yellow('Unique? (y/n): '))).toLowerCase() === 'y';
        const isIndexed = (await askQuestion(rl, colors.yellow('Add index? (y/n): '))).toLowerCase() === 'y';
        const defaultValue = await askQuestion(rl, colors.yellow('Default value (press enter to skip): '));

        fields.push({
          name: fieldName,
          type: fieldType as FieldSpec['type'],
          required: isRequired,
          unique: isUnique || undefined,
          index: isIndexed || undefined,
          default: defaultValue || undefined
        });

        console.log(colors.green(`✅ Added field: ${fieldName} (${fieldType})`));
      }

      // Ask if user wants to generate CRUD operations
      const generateCRUD = (await askQuestion(rl, colors.cyan('\n🔧 Generate CRUD operations (controller, service, routes)? (y/n): '))).toLowerCase() === 'y';

      // Ask if user wants to add CRUD tasks for permission control
      let withTasks = false;
      if (generateCRUD) {
        withTasks = (await askQuestion(rl, colors.cyan('🔐 Add CRUD tasks for permission control? (y/n): '))).toLowerCase() === 'y';
      }

      rl.close();

      const result = await createModel({
        projectRoot: process.cwd(),
        name: modelName,
        fields,
        crud: generateCRUD,
        tasks: withTasks,
      });

      // Determine framework only for display purposes (createModel already resolved it internally).
      const ctx = await resolveProject(process.cwd());
      const isElysia = ctx.framework === 'elysia';
      const crudCamelName = toCamelCase(modelName);

      console.log(colors.green(
        `✅ Created ${ctx.database === 'postgres' ? 'Drizzle' : 'Mongoose'} model: src/models/${capitalize(modelName)}.ts`
      ));
      console.log(colors.green(`✅ Updated export in src/models/index.ts`));

      const indexedFieldNames = fields.filter(f => f.index).map(f => f.name);
      if (indexedFieldNames.length > 0) {
        console.log(colors.dim(`   Indexed fields (now applied to the schema): ${indexedFieldNames.join(', ')}`));
      }

      if (generateCRUD) {
        // Did createModel actually add the RBAC tasks, or fall back (Task.ts missing/duplicate)?
        const tasksActuallyAdded = withTasks && result.files.some(f => f.endsWith(path.join('src', 'enums', 'Task.ts')));

        if (withTasks) {
          if (tasksActuallyAdded) {
            const upperSnakeName = toUpperSnakeCase(modelName);
            console.log(colors.green(`✅ Added CRUD tasks to src/enums/Task.ts`));
            console.log(colors.dim(`   VIEW_${upperSnakeName}, CREATE_${upperSnakeName}, UPDATE_${upperSnakeName}, DELETE_${upperSnakeName}`));
          } else {
            console.log(colors.yellow(`⚠️  Could not add tasks (Task.ts not found or tasks already exist)`));
          }
        }

        console.log(colors.green(`✅ Created TypeScript controller: src/controllers/${crudCamelName}Controller.ts`));
        console.log(colors.green(`✅ Created TypeScript service: src/services/${crudCamelName}Service.ts`));
        console.log(colors.green(`✅ Created ${isElysia ? 'TypeBox validator' : 'Joi validation'}: src/validators/${crudCamelName}.ts`));
        console.log(colors.green(`✅ Created TypeScript routes: src/routes/${crudCamelName}.ts`));
        console.log(colors.green(`✅ Registered route in src/routes/index.ts`));

        console.log(colors.cyan('\n📚 Generated CRUD system includes:'));
        console.log('   • Model with Mongoose schema and TypeScript types');
        console.log('   • Controller with full CRUD operations (GET, POST, PUT, DELETE)');
        console.log('   • Service layer with business logic and pagination');
        console.log('   • Routes with Swagger documentation');
        console.log('   • Pagination support (configurable in .env - DEFAULT_PAGE_LIMIT)');
        console.log('   • Automatic route registration');
        if (tasksActuallyAdded) {
          console.log('   • CRUD tasks added to Task enum (VIEW, CREATE, UPDATE, DELETE)');
          console.log('   • Routes protected with checkPermission middleware');
        }

        console.log(colors.yellow('\n🔧 Next steps:'));
        console.log('   • Update .env file with DEFAULT_PAGE_LIMIT (default: 10)');
        if (tasksActuallyAdded) {
          console.log('   • Assign the new tasks to roles via your admin panel or seed script');
        }
        console.log('   • Run TypeScript compilation: npm run build');
        console.log('   • Test the CRUD endpoints in your API');
      } else {
        console.log(colors.cyan('\n📚 Model created successfully!'));
        console.log(colors.yellow('🔧 Next steps:'));
        console.log('   • Import the model in your controllers');
        console.log('   • Use "koti controller", "koti service" for CRUD operations');
        console.log('   • Run TypeScript compilation: npm run build');
      }

      result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
      result.warnings.forEach((w) => console.log(colors.yellow(`⚠️  ${w}`)));

    } catch (error) {
      if (error instanceof GeneratorError) {
        console.error(colors.red(`❌ ${error.message}`));
      } else {
        console.error(colors.red('❌ Unexpected error:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

// TypeScript Enum Generation Command
program
  .command('enum')
  .argument('<enum-name>', 'Name of the enum to create')
  .description('Create a new TypeScript enum')
  .action(async (enumName: string) => {
    try {
      console.log(colors.blue(`📋 Creating TypeScript enum: ${capitalize(enumName)}`));
      
      const rl = createReadlineInterface();
      const enumType = await askQuestion(rl, colors.yellow('Enum type (string/number): '));
      
      if (!enumTypes.includes(enumType)) {
        console.log(colors.red('❌ Invalid enum type. Use "string" or "number"'));
        rl.close();
        process.exit(1);
      }

      const values: { key: string; value: string | number }[] = [];
      
      console.log(colors.cyan('\n📝 Define your enum values:'));
      console.log(colors.dim('Type "done" when finished\n'));

      let key = '';
      while (key !== 'done') {
        key = await askQuestion(rl, colors.yellow('Enum key (or "done" to finish): '));
        
        if (key === 'done') break;
        if (!key.trim()) continue;

        let value: string | number;
        if (enumType === 'string') {
          value = await askQuestion(rl, colors.yellow(`String value for ${key}: `));
        } else {
          const numValue = await askQuestion(rl, colors.yellow(`Number value for ${key}: `));
          value = parseInt(numValue);
        }

        values.push({ key: key.toUpperCase(), value });
        console.log(colors.green(`✅ Added: ${key.toUpperCase()} = ${value}`));
      }

      rl.close();

      const result = await createEnum({
        projectRoot: process.cwd(),
        name: enumName,
        enumType: enumType as 'string' | 'number',
        values,
      });

      console.log(colors.green(`✅ Created TypeScript enum: src/enums/${capitalize(enumName)}.ts`));
      console.log(colors.green(`✅ Updated export in src/enums/index.ts`));
      result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
      result.warnings.forEach((w) => console.log(colors.yellow(`⚠️  ${w}`)));

    } catch (error) {
      if (error instanceof GeneratorError) {
        console.error(colors.red(`❌ ${error.message}`));
      } else {
        console.error(colors.red('❌ Unexpected error:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

// TypeScript Controller Generation Command
program
  .command('controller')
  .argument('<controller-name>', 'Name of the controller to create')
  .description('Create a new TypeScript controller')
  .action(async (controllerName: string) => {
    try {
      console.log(colors.blue(`🎮 Creating TypeScript controller: ${capitalize(controllerName)}`));

      const result = await createController({ projectRoot: process.cwd(), name: controllerName });

      console.log(colors.green(`✅ Created TypeScript controller: src/controllers/${toCamelCase(controllerName)}Controller.ts`));
      console.log(colors.green(`✅ Updated export in src/controllers/index.ts`));
      result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
      result.warnings.forEach((w) => console.log(colors.yellow(`⚠️  ${w}`)));

    } catch (error) {
      if (error instanceof GeneratorError) {
        console.error(colors.red(`❌ ${error.message}`));
      } else {
        console.error(colors.red('❌ Unexpected error:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

// TypeScript Service Generation Command
program
  .command('service')
  .argument('<service-name>', 'Name of the service to create')
  .description('Create a new TypeScript service')
  .action(async (serviceName: string) => {
    try {
      console.log(colors.blue(`⚙️ Creating TypeScript service: ${capitalize(serviceName)}`));

      const result = await createService({ projectRoot: process.cwd(), name: serviceName });

      console.log(colors.green(`✅ Created TypeScript service: src/services/${toCamelCase(serviceName)}Service.ts`));
      console.log(colors.green(`✅ Updated export in src/services/index.ts`));
      result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
      result.warnings.forEach((w) => console.log(colors.yellow(`⚠️  ${w}`)));

    } catch (error) {
      if (error instanceof GeneratorError) {
        console.error(colors.red(`❌ ${error.message}`));
      } else {
        console.error(colors.red('❌ Unexpected error:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

// TypeScript Middleware Generation Command
program
  .command('middleware')
  .argument('<middleware-name>', 'Name of the middleware to create')
  .description('Create a new TypeScript middleware')
  .action(async (middlewareName: string) => {
    try {
      console.log(colors.blue(`🛡️ Creating TypeScript middleware: ${toCamelCase(middlewareName)}`));

      const result = await createMiddleware({ projectRoot: process.cwd(), name: middlewareName });

      console.log(colors.green(`✅ Created TypeScript middleware: src/middleware/${toCamelCase(middlewareName)}.ts`));
      console.log(colors.green(`✅ Updated export in src/middleware/index.ts`));
      result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
      result.warnings.forEach((w) => console.log(colors.yellow(`⚠️  ${w}`)));

    } catch (error) {
      if (error instanceof GeneratorError) {
        console.error(colors.red(`❌ ${error.message}`));
      } else {
        console.error(colors.red('❌ Unexpected error:'), (error as Error).message);
      }
      process.exit(1);
    }
  });


program
  .command('new')
  .alias('create')
  .argument('<project-name>', 'Name of the project to create')
  .option('--framework <framework>', 'Framework choice: express or elysia (default: express)')
  .option('--database <database>', 'Database choice: mongodb or postgres (default: mongodb)')
  .description('Create a new TypeScript Bun API project')
  .action(async (projectName: string, options: { framework?: string; database?: string }) => {
    try {
      // Resolve framework: the --framework flag wins (CI-friendly). Otherwise
      // prompt interactively — but only when attached to a TTY. In non-interactive
      // contexts (CI, pipes, tests) there is no one to answer, so default to express.
      let framework = options?.framework?.toLowerCase();
      if (!framework) {
        if (process.stdin.isTTY) {
          const rl = createReadlineInterface();
          const answer = (await askQuestion(
            rl,
            colors.cyan('\n📦 Choose a framework:\n  1) Express (default)\n  2) Elysia\nEnter choice [1-2 or name]: ')
          )).trim().toLowerCase();
          rl.close();
          framework = (answer === '2' || answer === 'elysia') ? 'elysia' : 'express';
        } else {
          framework = 'express';
        }
      }
      if (!FRAMEWORKS.includes(framework as Framework)) {
        console.error(colors.red('Error: Framework must be either express or elysia'));
        process.exit(1);
      }

      // Same resolution order for the database axis: flag wins, then TTY prompt,
      // then the mongodb default so non-interactive runs stay silent.
      let database = options?.database?.toLowerCase();
      if (!database) {
        if (process.stdin.isTTY) {
          const rl = createReadlineInterface();
          const answer = (await askQuestion(
            rl,
            colors.cyan('\n🗄️  Choose a database:\n  1) MongoDB (default)\n  2) PostgreSQL\nEnter choice [1-2 or name]: ')
          )).trim().toLowerCase();
          rl.close();
          database = (answer === '2' || answer === 'postgres' || answer === 'postgresql') ? 'postgres' : 'mongodb';
        } else {
          database = 'mongodb';
        }
      }
      if (!DATABASES.includes(database as Database)) {
        console.error(colors.red('Error: Database must be either mongodb or postgres'));
        process.exit(1);
      }
      const isPostgres = database === 'postgres';

      const result = await createProject({
        name: projectName,
        framework: framework as Framework,
        database: database as Database,
        log: (m: string) => console.log(m),
      });

      result.warnings.forEach((w) => console.log(colors.yellow(`⚠️  ${w}`)));

      console.log(colors.cyan('\n📋 Next steps:'));
      console.log(`   1. cd ${projectName}`);
      if (isPostgres) {
        console.log('   2. Update .env file with your DATABASE_URL and JWT secret');
        console.log(`   3. createdb ${projectName}`);
        console.log('   4. npm run db:migrate');
        console.log('   5. npm run seed');
        console.log('   6. bun run dev');
      } else {
        console.log('   2. Update .env file with your MongoDB URI and JWT secret');
        console.log('   3. Start MongoDB server');
        console.log('   4. bun run dev');
      }

      console.log(colors.blue('\n📚 Useful commands:'));
      console.log('   • npm run build   - Build TypeScript to JavaScript');
      console.log('   • npm start       - Start production server');
      console.log('   • bun run dev     - Start development server with Bun');
      console.log('   • npm run dev:ts  - Start development server with ts-node');

      console.log(colors.cyan('\n🌐 Default endpoints:'));
      console.log('   • http://localhost:8000/health     - Health check');
      console.log('   • http://localhost:8000/api/       - API welcome');
      console.log('   • http://localhost:8000/api-docs   - Swagger documentation');

      console.log(colors.cyan('\n🔐 Authentication endpoints:'));
      console.log('   • POST /api/auth/register - Register user');
      console.log('   • POST /api/auth/login    - Login user');
      console.log('   • GET  /api/auth/me       - Get current user');

      console.log(colors.yellow('\n💡 Don\'t forget to:'));
      console.log(`   • Set up your ${isPostgres ? 'PostgreSQL' : 'MongoDB'} database`);
      console.log('   • Generate a secure JWT secret');
      console.log('   • Configure your environment variables');
      console.log('   • Review the generated TypeScript code');

      console.log(colors.red('\n⚠️  IMPORTANT DISCLAIMER:'));
      console.log(`   • This is a development version (v${getVersion()}) and may contain errors`);
      console.log('   • Review all generated code before production use');
      console.log('   • Test thoroughly in development environments');
      console.log('   • Update dependencies to latest secure versions');

      console.log(colors.green('\nHappy coding! 🚀'));

    } catch (error) {
      if (error instanceof GeneratorError) {
        console.error(colors.red(`❌ ${error.message}`));
      } else {
        console.error(colors.red('❌ Error creating project:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

// Model Edit Command
program
  .command('model:edit')
  .argument('<model-name>', 'Name of the model to edit')
  .description('Edit an existing TypeScript model (add/delete fields)')
  .action(async (modelName: string) => {
    try {
      console.log(colors.blue(`✏️ Editing TypeScript model: ${capitalize(modelName)}`));

      // Current fields come from the manifest when it knows this model — the
      // source parser only understands Mongoose files, so it cannot serve a
      // Postgres project. Fall back to it for pre-3.2 projects.
      let existingFields: FieldSpec[];
      const manifestEntry = (await readModelManifest(process.cwd()))[capitalize(modelName)];
      if (manifestEntry) {
        existingFields = manifestEntry.fields;
      } else {
        try {
          existingFields = await parseExistingModel(process.cwd(), modelName);
        } catch (error) {
          if (error instanceof GeneratorError) {
            console.log(colors.red(`❌ Model ${capitalize(modelName)} not found!`));
            console.log(colors.yellow('💡 Use "koti model <name>" to create a new model'));
            process.exit(1);
          }
          throw error;
        }
      }

      // Check if CRUD operations exist
      const editCamelName = toCamelCase(modelName);
      const controllerPath = path.join(process.cwd(), 'src', 'controllers', `${editCamelName}Controller.ts`);
      const servicePath = path.join(process.cwd(), 'src', 'services', `${editCamelName}Service.ts`);
      const routePath = path.join(process.cwd(), 'src', 'routes', `${editCamelName}.ts`);
      const [hasController, hasService, hasRoutes] = await Promise.all([
        fs.pathExists(controllerPath),
        fs.pathExists(servicePath),
        fs.pathExists(routePath),
      ]);
      const hasCRUD = hasController || hasService || hasRoutes;

      console.log(colors.green(`✅ Found model: ${capitalize(modelName)}`));
      console.log(colors.dim(`   Fields: ${existingFields.map(f => f.name).join(', ')}`));

      if (hasCRUD) {
        console.log(colors.cyan('🔧 CRUD operations detected:'));
        if (hasController) console.log(colors.dim('   • Controller'));
        if (hasService) console.log(colors.dim('   • Service'));
        if (hasRoutes) console.log(colors.dim('   • Routes'));
      }

      const rl = createReadlineInterface();
      let updatedFields: FieldSpec[] = [...existingFields];
      const addFields: FieldSpec[] = [];
      const removeFields: string[] = [];
      let updateCRUD = false;

      while (true) {
        console.log(colors.cyan('\n📝 Current fields:'));
        updatedFields.forEach((field, index) => {
          const attrs = [];
          if (field.required) attrs.push('required');
          if (field.unique) attrs.push('unique');
          if (field.default) attrs.push(`default: ${field.default}`);
          const attrStr = attrs.length > 0 ? ` (${attrs.join(', ')})` : '';
          console.log(colors.dim(`   ${index + 1}. ${field.name}: ${field.type}${attrStr}`));
        });

        console.log(colors.yellow('\n🔧 Available actions:'));
        console.log('   1. Add new field');
        console.log('   2. Delete field');
        console.log('   3. Save changes');
        console.log('   4. Cancel');

        const action = await askQuestion(rl, colors.yellow('Choose action (1-4): '));

        if (action === '1') {
          // Add new field
          console.log(colors.cyan('\n➕ Adding new field:'));
          console.log(colors.dim('Available data types:'));
          console.log(colors.dim('1. String    2. Number    3. Date      4. Boolean'));
          console.log(colors.dim('5. ObjectId  6. Array     7. Mixed     8. JSON'));

          const dataTypes = ['String', 'Number', 'Date', 'Boolean', 'ObjectId', 'Array', 'Mixed', 'JSON'];

          const fieldName = await askQuestion(rl, colors.yellow('Field name: '));
          if (!fieldName.trim()) {
            console.log(colors.red('❌ Field name cannot be empty'));
            continue;
          }

          // Check if field already exists
          if (updatedFields.some(f => f.name === fieldName)) {
            console.log(colors.red(`❌ Field "${fieldName}" already exists`));
            continue;
          }

          console.log(colors.cyan('\nSelect data type:'));
          dataTypes.forEach((type, index) => {
            console.log(colors.dim(`${index + 1}. ${type}`));
          });

          const typeChoice = await askQuestion(rl, colors.yellow('Enter type number (1-8): '));
          const typeIndex = parseInt(typeChoice) - 1;

          if (typeIndex < 0 || typeIndex >= dataTypes.length) {
            console.log(colors.red('❌ Invalid choice. Please select 1-8.'));
            continue;
          }

          const fieldType = dataTypes[typeIndex];
          const isRequired = (await askQuestion(rl, colors.yellow('Required? (y/n): '))).toLowerCase() === 'y';
          const isUnique = (await askQuestion(rl, colors.yellow('Unique? (y/n): '))).toLowerCase() === 'y';
          const isIndexed = (await askQuestion(rl, colors.yellow('Add index? (y/n): '))).toLowerCase() === 'y';
          const defaultValue = await askQuestion(rl, colors.yellow('Default value (press enter to skip): '));

          const newField: FieldSpec = {
            name: fieldName,
            type: fieldType as FieldSpec['type'],
            required: isRequired,
            unique: isUnique || undefined,
            index: isIndexed || undefined,
            default: defaultValue || undefined,
          };

          updatedFields.push(newField);
          addFields.push(newField);

          console.log(colors.green(`✅ Added field: ${fieldName} (${fieldType})`));

        } else if (action === '2') {
          // Delete field
          if (updatedFields.length === 0) {
            console.log(colors.red('❌ No fields to delete'));
            continue;
          }

          console.log(colors.cyan('\n🗑️ Delete field:'));
          updatedFields.forEach((field, index) => {
            console.log(colors.dim(`   ${index + 1}. ${field.name}: ${field.type}`));
          });

          const deleteChoice = await askQuestion(rl, colors.yellow('Enter field number to delete (or enter to cancel): '));
          if (!deleteChoice.trim()) continue;

          const deleteIndex = parseInt(deleteChoice) - 1;
          if (deleteIndex >= 0 && deleteIndex < updatedFields.length) {
            const deletedField = updatedFields.splice(deleteIndex, 1)[0];
            console.log(colors.green(`✅ Deleted field: ${deletedField.name}`));

            // If the field was only added earlier in this session, drop it from addFields
            // instead of recording a remove (it never existed in the persisted model).
            const addedIndex = addFields.findIndex(f => f.name === deletedField.name);
            if (addedIndex >= 0) {
              addFields.splice(addedIndex, 1);
            } else {
              removeFields.push(deletedField.name);
            }
          } else {
            console.log(colors.red('❌ Invalid field number'));
          }

        } else if (action === '3') {
          // Save changes
          const hasChanges = addFields.length > 0 || removeFields.length > 0;

          if (!hasChanges) {
            console.log(colors.yellow('ℹ️ No changes detected'));
            break;
          }

          console.log(colors.cyan('\n💾 Saving changes...'));

          // Ask about updating CRUD operations
          if (hasCRUD) {
            console.log(colors.cyan('\n🔄 CRUD operations detected'));
            updateCRUD = (await askQuestion(rl, colors.yellow('Update CRUD operations with new schema? (y/n): '))).toLowerCase() === 'y';
          }

          const result = await editModel({
            projectRoot: process.cwd(),
            name: modelName,
            addFields,
            removeFields,
            updateCrud: updateCRUD,
          });

          console.log(colors.green(`✅ Updated model: src/models/${capitalize(modelName)}.ts`));

          if (updateCRUD) {
            console.log(colors.blue('🔄 Updating CRUD operations...'));

            if (result.files.includes(controllerPath)) {
              console.log(colors.green(`✅ Updated controller: src/controllers/${editCamelName}Controller.ts`));
              console.log(colors.dim(`   Backup saved: src/controllers/${editCamelName}Controller.ts.bak`));
            }
            if (result.files.includes(servicePath)) {
              console.log(colors.green(`✅ Updated service: src/services/${editCamelName}Service.ts`));
              console.log(colors.dim(`   Backup saved: src/services/${editCamelName}Service.ts.bak`));
            }
            if (result.files.includes(routePath)) {
              console.log(colors.green(`✅ Updated routes: src/routes/${editCamelName}.ts`));
              console.log(colors.dim(`   Backup saved: src/routes/${editCamelName}.ts.bak`));
            }

            console.log(colors.green('\n✅ CRUD operations updated successfully!'));
            console.log(colors.cyan('💡 What happened:'));
            console.log(colors.dim('   • Previous files saved as .bak backups'));
            console.log(colors.dim('   • New code generated based on updated schema'));
            console.log(colors.dim('   • Files are clean and compilable — no commented-out code'));
            console.log(colors.dim('   • Both versions coexist in the same files for easy comparison'));
          }

          result.warnings.forEach((w) => console.log(colors.yellow(`⚠️  ${w}`)));

          console.log(colors.cyan('\n🎉 Model edit completed successfully!'));
          console.log(colors.yellow('\n🔧 Next steps:'));
          console.log('   • Run TypeScript compilation: npm run build');
          console.log('   • Test your updated model and API endpoints');
          if (hasCRUD && !updateCRUD) {
            console.log('   • Consider manually updating CRUD operations if needed');
          }

          break;

        } else if (action === '4') {
          // Cancel
          console.log(colors.yellow('✖️ Edit cancelled'));
          break;
        } else {
          console.log(colors.red('❌ Invalid choice. Please select 1-4.'));
        }
      }

      rl.close();

    } catch (error) {
      if (error instanceof GeneratorError) {
        console.error(colors.red(`❌ ${error.message}`));
      } else {
        console.error(colors.red('❌ Error editing model:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

// Task Creation Command — adds a new task to the Task enum
program
  .command('task')
  .argument('<task-name>', 'Name of the task to create (e.g., MANAGE_USERS)')
  .description('Add a new task to the Task enum for role-based authorization')
  .action(async (taskName: string) => {
    try {
      const taskKey = taskName.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

      const rl = createReadlineInterface();
      const description = await askQuestion(rl, colors.yellow('Task description: '));
      rl.close();

      if (!description.trim()) {
        console.log(colors.red('❌ Description is required'));
        process.exit(1);
      }

      const result = await createTask({
        projectRoot: process.cwd(),
        name: taskKey,
        description,
      });

      console.log(colors.green(`✅ Added task: ${taskKey}`));
      console.log(colors.dim(`   Description: ${description}`));
      console.log(colors.dim(`   File: src/enums/Task.ts`));
      result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
      result.warnings.forEach((w) => console.log(colors.yellow(`⚠️  ${w}`)));

      console.log(colors.cyan('\n💡 Usage in routes:'));
      console.log(colors.dim(`   import { checkPermission } from '../middleware/checkPermission';`));
      console.log(colors.dim(`   import { Task } from '../enums/Task';`));
      console.log(colors.dim(`   router.get('/endpoint', auth, checkPermission(Task.${taskKey}), handler);`));

    } catch (error) {
      if (error instanceof GeneratorError) {
        console.error(colors.red(`❌ ${error.message}`));
      } else {
        console.error(colors.red('❌ Unexpected error:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

program.parse();