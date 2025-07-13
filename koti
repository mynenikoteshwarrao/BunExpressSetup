#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const program = new Command();

// Console colors without chalk
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// Available Mongoose data types
const availableDataTypes = [
  'String',
  'Number',
  'Date',
  'Boolean', 
  'ObjectId',
  'Array',
  'Mixed',
  'Decimal128',
  'Map',
  'Schema'
];

// Helper function to create readline interface
const createReadlineInterface = () => {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
};

// Helper function to ask question
const askQuestion = (rl, question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
};

// Helper function to capitalize first letter
const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Helper function to generate model schema fields
const generateSchemaFields = (fields) => {
  return fields.map(field => {
    let fieldDef = `  ${field.name}: {\n`;
    
    if (field.type === 'ObjectId' && field.ref) {
      fieldDef += `    type: mongoose.Schema.Types.ObjectId,\n`;
      fieldDef += `    ref: '${field.ref}',\n`;
    } else if (field.type === 'Array' && field.arrayType) {
      if (field.arrayType === 'ObjectId' && field.ref) {
        fieldDef += `    type: [{\n`;
        fieldDef += `      type: mongoose.Schema.Types.ObjectId,\n`;
        fieldDef += `      ref: '${field.ref}'\n`;
        fieldDef += `    }],\n`;
      } else {
        fieldDef += `    type: [${field.arrayType}],\n`;
      }
    } else {
      fieldDef += `    type: ${field.type},\n`;
    }
    
    if (field.required) fieldDef += `    required: true,\n`;
    if (field.unique) fieldDef += `    unique: true,\n`;
    if (field.default !== undefined && field.default !== '') {
      if (field.type === 'String') {
        fieldDef += `    default: '${field.default}',\n`;
      } else if (field.type === 'Boolean') {
        fieldDef += `    default: ${field.default},\n`;
      } else if (field.type === 'Number') {
        fieldDef += `    default: ${field.default},\n`;
      } else {
        fieldDef += `    default: ${field.default},\n`;
      }
    }
    if (field.minLength) fieldDef += `    minlength: ${field.minLength},\n`;
    if (field.maxLength) fieldDef += `    maxlength: ${field.maxLength},\n`;
    if (field.min) fieldDef += `    min: ${field.min},\n`;
    if (field.max) fieldDef += `    max: ${field.max},\n`;
    if (field.trim && field.type === 'String') fieldDef += `    trim: true,\n`;
    if (field.lowercase && field.type === 'String') fieldDef += `    lowercase: true,\n`;
    if (field.uppercase && field.type === 'String') fieldDef += `    uppercase: true,\n`;
    
    fieldDef = fieldDef.slice(0, -2) + '\n'; // Remove trailing comma
    fieldDef += `  }`;
    
    return fieldDef;
  }).join(',\n');
};

// Helper function to find existing models in project
const findExistingModels = async (projectPath) => {
  const modelsPath = path.join(projectPath, 'models');
  if (!await fs.pathExists(modelsPath)) {
    return [];
  }
  
  const files = await fs.readdir(modelsPath);
  return files
    .filter(file => file.endsWith('.js'))
    .map(file => file.replace('.js', ''))
    .filter(model => model !== 'index'); // Exclude index files
};

// Template generators for model components
const generateModelTemplate = (modelName, fields) => {
  const modelNameCap = capitalize(modelName);
  const schemaFields = generateSchemaFields(fields);
  
  return `const mongoose = require('mongoose');

const ${modelName}Schema = new mongoose.Schema({
${schemaFields}
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
${fields.filter(f => f.index).map(f => `${modelName}Schema.index({ ${f.name}: 1 });`).join('\n')}

// Virtual fields
${modelName}Schema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Instance methods
${modelName}Schema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    ${fields.map(f => `${f.name}: this.${f.name}`).join(',\n    ')},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static methods
${modelName}Schema.statics.findActive = function() {
  return this.find({ isActive: { $ne: false } });
};

module.exports = mongoose.model('${modelNameCap}', ${modelName}Schema);`;
};

const generateServiceTemplate = (modelName, fields) => {
  const modelNameCap = capitalize(modelName);
  const modelNameLower = modelName.toLowerCase();
  
  return `const ${modelNameCap} = require('../models/${modelNameCap}');

class ${modelNameCap}Service {
  // Create a new ${modelNameLower}
  async create(${modelNameLower}Data) {
    try {
      const ${modelNameLower} = new ${modelNameCap}(${modelNameLower}Data);
      await ${modelNameLower}.save();
      return { success: true, data: ${modelNameLower}.toPublicJSON() };
    } catch (error) {
      throw error;
    }
  }

  // Get all ${modelNameLower}s with pagination
  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = { createdAt: -1 },
        filter = {}
      } = options;

      const skip = (page - 1) * limit;
      
      const ${modelNameLower}s = await ${modelNameCap}
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await ${modelNameCap}.countDocuments(filter);
      
      return {
        success: true,
        data: {
          ${modelNameLower}s,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get ${modelNameLower} by ID
  async findById(id) {
    try {
      const ${modelNameLower} = await ${modelNameCap}.findById(id);
      
      if (!${modelNameLower}) {
        return { success: false, message: '${modelNameCap} not found' };
      }
      
      return { success: true, data: ${modelNameLower}.toPublicJSON() };
    } catch (error) {
      throw error;
    }
  }

  // Update ${modelNameLower} by ID
  async updateById(id, updateData) {
    try {
      const ${modelNameLower} = await ${modelNameCap}.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!${modelNameLower}) {
        return { success: false, message: '${modelNameCap} not found' };
      }
      
      return { success: true, data: ${modelNameLower}.toPublicJSON() };
    } catch (error) {
      throw error;
    }
  }

  // Delete ${modelNameLower} by ID
  async deleteById(id) {
    try {
      const ${modelNameLower} = await ${modelNameCap}.findByIdAndDelete(id);
      
      if (!${modelNameLower}) {
        return { success: false, message: '${modelNameCap} not found' };
      }
      
      return { success: true, message: '${modelNameCap} deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Search ${modelNameLower}s
  async search(query, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        fields = ['${fields.filter(f => f.type === 'String').map(f => f.name).join("', '")}']
      } = options;

      const searchRegex = new RegExp(query, 'i');
      const searchConditions = fields.map(field => ({
        [field]: searchRegex
      }));

      const filter = {
        $or: searchConditions
      };

      return await this.findAll({ page, limit, filter });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ${modelNameCap}Service();`;
};

const generateControllerTemplate = (modelName, fields) => {
  const modelNameCap = capitalize(modelName);
  const modelNameLower = modelName.toLowerCase();
  const serviceName = `${modelNameLower}Service`;
  
  return `const ${serviceName} = require('../services/${modelNameLower}Service');

// @desc    Create new ${modelNameLower}
// @route   POST /api/${modelNameLower}s
// @access  Private
exports.create${modelNameCap} = async (req, res, next) => {
  try {
    const result = await ${serviceName}.create(req.body);
    
    res.status(201).json({
      success: true,
      message: '${modelNameCap} created successfully',
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all ${modelNameLower}s
// @route   GET /api/${modelNameLower}s
// @access  Private
exports.get${modelNameCap}s = async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort ? JSON.parse(req.query.sort) : { createdAt: -1 }
    };

    const result = await ${serviceName}.findAll(options);
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single ${modelNameLower}
// @route   GET /api/${modelNameLower}s/:id
// @access  Private
exports.get${modelNameCap} = async (req, res, next) => {
  try {
    const result = await ${serviceName}.findById(req.params.id);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ${modelNameLower}
// @route   PUT /api/${modelNameLower}s/:id
// @access  Private
exports.update${modelNameCap} = async (req, res, next) => {
  try {
    const result = await ${serviceName}.updateById(req.params.id, req.body);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      message: '${modelNameCap} updated successfully',
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete ${modelNameLower}
// @route   DELETE /api/${modelNameLower}s/:id
// @access  Private
exports.delete${modelNameCap} = async (req, res, next) => {
  try {
    const result = await ${serviceName}.deleteById(req.params.id);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search ${modelNameLower}s
// @route   GET /api/${modelNameLower}s/search
// @access  Private
exports.search${modelNameCap}s = async (req, res, next) => {
  try {
    const { q: query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10
    };

    const result = await ${serviceName}.search(query, options);
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};`;
};

const generateRouteTemplate = (modelName) => {
  const modelNameCap = capitalize(modelName);
  const modelNameLower = modelName.toLowerCase();
  const controllerName = `${modelNameLower}Controller`;
  
  return `const express = require('express');
const router = express.Router();
const ${controllerName} = require('../controllers/${controllerName}');
const auth = require('../middleware/auth');

// @route   GET /api/${modelNameLower}s/search
// @desc    Search ${modelNameLower}s
// @access  Private
router.get('/search', auth, ${controllerName}.search${modelNameCap}s);

// @route   POST /api/${modelNameLower}s
// @desc    Create new ${modelNameLower}
// @access  Private
router.post('/', auth, ${controllerName}.create${modelNameCap});

// @route   GET /api/${modelNameLower}s
// @desc    Get all ${modelNameLower}s
// @access  Private
router.get('/', auth, ${controllerName}.get${modelNameCap}s);

// @route   GET /api/${modelNameLower}s/:id
// @desc    Get single ${modelNameLower}
// @access  Private
router.get('/:id', auth, ${controllerName}.get${modelNameCap});

// @route   PUT /api/${modelNameLower}s/:id
// @desc    Update ${modelNameLower}
// @access  Private
router.put('/:id', auth, ${controllerName}.update${modelNameCap});

// @route   DELETE /api/${modelNameLower}s/:id
// @desc    Delete ${modelNameLower}
// @access  Private
router.delete('/:id', auth, ${controllerName}.delete${modelNameCap});

module.exports = router;`;
};

// Main interactive model creation function
const createInteractiveModel = async (modelName) => {
  const rl = createReadlineInterface();
  const fields = [];
  
  try {
    // Check if we're in a valid project directory
    const currentPath = process.cwd();
    const packageJsonPath = path.join(currentPath, 'package.json');
    const serverJsPath = path.join(currentPath, 'server.js');
    
    if (!await fs.pathExists(packageJsonPath) || !await fs.pathExists(serverJsPath)) {
      console.log(colors.red('❌ This command must be run inside a Koti project directory.'));
      console.log(colors.yellow('💡 Create a new project first: koti new my-project'));
      process.exit(1);
    }

    // Check if services directory exists, create if not
    const servicesPath = path.join(currentPath, 'services');
    if (!await fs.pathExists(servicesPath)) {
      await fs.ensureDir(servicesPath);
      console.log(colors.green('✅ Created services directory'));
    }

    // Get existing models for reference options
    const existingModels = await findExistingModels(currentPath);
    
    console.log(colors.bold(`\n🏗️  Creating model: ${colors.cyan(capitalize(modelName))}\n`));
    console.log(colors.yellow('Available data types:'));
    availableDataTypes.forEach((type, index) => {
      console.log(`  ${index + 1}. ${type}`);
    });
    
    if (existingModels.length > 0) {
      console.log(colors.yellow('\nExisting models for references:'));
      existingModels.forEach((model, index) => {
        console.log(`  ${index + 1}. ${model}`);
      });
    }
    
    console.log(colors.cyan('\n📝 Add fields to your model (press Enter without field name to finish):\n'));
    
    // Interactive field creation loop
    let fieldCount = 1;
    while (true) {
      console.log(colors.bold(`--- Field ${fieldCount} ---`));
      
      // Get field name
      const fieldName = await askQuestion(rl, `Field name: `);
      if (!fieldName) {
        break; // Exit loop if no field name provided
      }
      
      // Validate field name
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName)) {
        console.log(colors.red('❌ Invalid field name. Use letters, numbers, and underscore only.'));
        continue;
      }
      
      // Check for duplicate field names
      if (fields.find(f => f.name === fieldName)) {
        console.log(colors.red('❌ Field name already exists. Please choose a different name.'));
        continue;
      }
      
      const field = { name: fieldName };
      
      // Get data type
      while (true) {
        const typeChoice = await askQuestion(rl, `Data type (1-${availableDataTypes.length}): `);
        const typeIndex = parseInt(typeChoice) - 1;
        
        if (typeIndex >= 0 && typeIndex < availableDataTypes.length) {
          field.type = availableDataTypes[typeIndex];
          break;
        } else {
          console.log(colors.red(`❌ Please enter a number between 1 and ${availableDataTypes.length}`));
        }
      }
      
      // Handle special type configurations
      if (field.type === 'ObjectId' && existingModels.length > 0) {
        console.log(colors.yellow('Available models for reference:'));
        existingModels.forEach((model, index) => {
          console.log(`  ${index + 1}. ${model}`);
        });
        
        const refChoice = await askQuestion(rl, `Reference model (1-${existingModels.length}) or custom name: `);
        const refIndex = parseInt(refChoice) - 1;
        
        if (refIndex >= 0 && refIndex < existingModels.length) {
          field.ref = existingModels[refIndex];
        } else if (refChoice.trim()) {
          field.ref = refChoice.trim();
        }
      }
      
      if (field.type === 'Array') {
        console.log(colors.yellow('Array element type:'));
        availableDataTypes.forEach((type, index) => {
          console.log(`  ${index + 1}. ${type}`);
        });
        
        while (true) {
          const arrayTypeChoice = await askQuestion(rl, `Array element type (1-${availableDataTypes.length}): `);
          const arrayTypeIndex = parseInt(arrayTypeChoice) - 1;
          
          if (arrayTypeIndex >= 0 && arrayTypeIndex < availableDataTypes.length) {
            field.arrayType = availableDataTypes[arrayTypeIndex];
            
            // If array of ObjectId, ask for reference
            if (field.arrayType === 'ObjectId' && existingModels.length > 0) {
              console.log(colors.yellow('Available models for reference:'));
              existingModels.forEach((model, index) => {
                console.log(`  ${index + 1}. ${model}`);
              });
              
              const arrayRefChoice = await askQuestion(rl, `Reference model (1-${existingModels.length}) or custom name: `);
              const arrayRefIndex = parseInt(arrayRefChoice) - 1;
              
              if (arrayRefIndex >= 0 && arrayRefIndex < existingModels.length) {
                field.ref = existingModels[arrayRefIndex];
              } else if (arrayRefChoice.trim()) {
                field.ref = arrayRefChoice.trim();
              }
            }
            break;
          } else {
            console.log(colors.red(`❌ Please enter a number between 1 and ${availableDataTypes.length}`));
          }
        }
      }
      
      // Field options
      const required = await askQuestion(rl, `Required? (y/N): `);
      field.required = required.toLowerCase() === 'y' || required.toLowerCase() === 'yes';
      
      const unique = await askQuestion(rl, `Unique? (y/N): `);
      field.unique = unique.toLowerCase() === 'y' || unique.toLowerCase() === 'yes';
      
      const index = await askQuestion(rl, `Add database index? (y/N): `);
      field.index = index.toLowerCase() === 'y' || index.toLowerCase() === 'yes';
      
      // Type-specific options
      if (field.type === 'String') {
        const minLength = await askQuestion(rl, `Minimum length (optional): `);
        if (minLength && !isNaN(minLength)) field.minLength = parseInt(minLength);
        
        const maxLength = await askQuestion(rl, `Maximum length (optional): `);
        if (maxLength && !isNaN(maxLength)) field.maxLength = parseInt(maxLength);
        
        const trim = await askQuestion(rl, `Trim whitespace? (Y/n): `);
        field.trim = trim.toLowerCase() !== 'n' && trim.toLowerCase() !== 'no';
        
        const lowercase = await askQuestion(rl, `Convert to lowercase? (y/N): `);
        field.lowercase = lowercase.toLowerCase() === 'y' || lowercase.toLowerCase() === 'yes';
        
        const uppercase = await askQuestion(rl, `Convert to uppercase? (y/N): `);
        field.uppercase = uppercase.toLowerCase() === 'y' || uppercase.toLowerCase() === 'yes';
        
        const defaultValue = await askQuestion(rl, `Default value (optional): `);
        if (defaultValue) field.default = defaultValue;
      }
      
      if (field.type === 'Number') {
        const min = await askQuestion(rl, `Minimum value (optional): `);
        if (min && !isNaN(min)) field.min = parseFloat(min);
        
        const max = await askQuestion(rl, `Maximum value (optional): `);
        if (max && !isNaN(max)) field.max = parseFloat(max);
        
        const defaultValue = await askQuestion(rl, `Default value (optional): `);
        if (defaultValue && !isNaN(defaultValue)) field.default = parseFloat(defaultValue);
      }
      
      if (field.type === 'Boolean') {
        const defaultValue = await askQuestion(rl, `Default value (true/false, optional): `);
        if (defaultValue === 'true') field.default = true;
        else if (defaultValue === 'false') field.default = false;
      }
      
      fields.push(field);
      fieldCount++;
      
      console.log(colors.green(`✅ Added field: ${fieldName} (${field.type})`));
      console.log('');
    }
    
    if (fields.length === 0) {
      console.log(colors.red('❌ No fields added. Model creation cancelled.'));
      rl.close();
      return;
    }
    
    // Show summary and confirm
    console.log(colors.bold('\n📋 Model Summary:'));
    console.log(colors.cyan(`Model Name: ${capitalize(modelName)}`));
    console.log(colors.cyan('Fields:'));
    fields.forEach(field => {
      let fieldInfo = `  • ${field.name}: ${field.type}`;
      if (field.ref) fieldInfo += ` (ref: ${field.ref})`;
      if (field.required) fieldInfo += ` [required]`;
      if (field.unique) fieldInfo += ` [unique]`;
      if (field.index) fieldInfo += ` [indexed]`;
      console.log(fieldInfo);
    });
    
    const confirm = await askQuestion(rl, colors.yellow('\nCreate this model? (Y/n): '));
    if (confirm.toLowerCase() === 'n' || confirm.toLowerCase() === 'no') {
      console.log(colors.yellow('Model creation cancelled.'));
      rl.close();
      return;
    }
    
    // Generate and create files
    console.log(colors.cyan('\n🔨 Generating files...\n'));
    
    const modelContent = generateModelTemplate(modelName, fields);
    const serviceContent = generateServiceTemplate(modelName, fields);
    const controllerContent = generateControllerTemplate(modelName, fields);
    const routeContent = generateRouteTemplate(modelName);
    
    // Create directories if they don't exist
    await fs.ensureDir(path.join(currentPath, 'models'));
    await fs.ensureDir(path.join(currentPath, 'services'));
    await fs.ensureDir(path.join(currentPath, 'controllers'));
    await fs.ensureDir(path.join(currentPath, 'routes'));
    
    // Write files
    const modelPath = path.join(currentPath, 'models', `${capitalize(modelName)}.js`);
    const servicePath = path.join(currentPath, 'services', `${modelName.toLowerCase()}Service.js`);
    const controllerPath = path.join(currentPath, 'controllers', `${modelName.toLowerCase()}Controller.js`);
    const routePath = path.join(currentPath, 'routes', `${modelName.toLowerCase()}.js`);
    
    await fs.writeFile(modelPath, modelContent);
    console.log(colors.green(`✅ Created model: models/${capitalize(modelName)}.js`));
    
    await fs.writeFile(servicePath, serviceContent);
    console.log(colors.green(`✅ Created service: services/${modelName.toLowerCase()}Service.js`));
    
    await fs.writeFile(controllerPath, controllerContent);
    console.log(colors.green(`✅ Created controller: controllers/${modelName.toLowerCase()}Controller.js`));
    
    await fs.writeFile(routePath, routeContent);
    console.log(colors.green(`✅ Created routes: routes/${modelName.toLowerCase()}.js`));
    
    // Update server.js to include new routes
    const serverPath = path.join(currentPath, 'server.js');
    const serverContent = await fs.readFile(serverPath, 'utf8');
    
    const routeImport = `const ${modelName.toLowerCase()}Routes = require('./routes/${modelName.toLowerCase()}');`;
    const routeUse = `app.use('/api/${modelName.toLowerCase()}s', ${modelName.toLowerCase()}Routes);`;
    
    // Check if route is already imported
    if (!serverContent.includes(routeImport)) {
      // Add import after existing route imports
      const authImportIndex = serverContent.indexOf("const authRoutes = require('./routes/auth');");
      if (authImportIndex !== -1) {
        const insertPosition = serverContent.indexOf('\n', authImportIndex) + 1;
        const newServerContent = serverContent.slice(0, insertPosition) + routeImport + '\n' + serverContent.slice(insertPosition);
        
        // Add route usage after existing route usage
        const authUseIndex = newServerContent.indexOf("app.use('/api/auth', authRoutes);");
        if (authUseIndex !== -1) {
          const routeInsertPosition = newServerContent.indexOf('\n', authUseIndex) + 1;
          const finalServerContent = newServerContent.slice(0, routeInsertPosition) + routeUse + '\n' + newServerContent.slice(routeInsertPosition);
          
          await fs.writeFile(serverPath, finalServerContent);
          console.log(colors.green(`✅ Updated server.js with new routes`));
        }
      }
    }
    
    // Success message
    console.log(colors.bold('\n🎉 Model created successfully!\n'));
    
    console.log(colors.cyan('📋 Generated files:'));
    console.log(`   • Model: models/${capitalize(modelName)}.js`);
    console.log(`   • Service: services/${modelName.toLowerCase()}Service.js`);
    console.log(`   • Controller: controllers/${modelName.toLowerCase()}Controller.js`);
    console.log(`   • Routes: routes/${modelName.toLowerCase()}.js`);
    
    console.log(colors.cyan('\n🌐 Available endpoints:'));
    console.log(`   • GET    /api/${modelName.toLowerCase()}s           - Get all ${modelName.toLowerCase()}s`);
    console.log(`   • GET    /api/${modelName.toLowerCase()}s/search    - Search ${modelName.toLowerCase()}s`);
    console.log(`   • GET    /api/${modelName.toLowerCase()}s/:id       - Get single ${modelName.toLowerCase()}`);
    console.log(`   • POST   /api/${modelName.toLowerCase()}s           - Create new ${modelName.toLowerCase()}`);
    console.log(`   • PUT    /api/${modelName.toLowerCase()}s/:id       - Update ${modelName.toLowerCase()}`);
    console.log(`   • DELETE /api/${modelName.toLowerCase()}s/:id       - Delete ${modelName.toLowerCase()}`);
    
    console.log(colors.yellow('\n💡 Next steps:'));
    console.log('   • Start your server: bun run dev');
    console.log('   • Test your endpoints with Postman or curl');
    console.log('   • All endpoints require authentication (JWT token)');
    
    console.log(colors.green('\nHappy coding! 🚀'));
    
  } catch (error) {
    console.error(colors.red('❌ Error creating model:'), error.message);
  } finally {
    rl.close();
  }
};

// Template files content
const templates = {
  'package.json': {
    "name": "{{PROJECT_NAME}}",
    "version": "1.0.0",
    "description": "Bun API project with Express and MongoDB",
    "main": "server.js",
    "scripts": {
      "start": "bun run server.js",
      "dev": "bun --watch server.js",
      "test": "echo \"Error: no test specified\" && exit 1"
    },
    "dependencies": {
      "express": "^4.18.2",
      "mongoose": "^8.0.0",
      "dotenv": "^16.3.1",
      "cors": "^2.8.5",
      "helmet": "^7.1.0",
      "bcryptjs": "^2.4.3",
      "jsonwebtoken": "^9.0.2",
      "express-rate-limit": "^7.1.5"
    },
    "devDependencies": {
      "nodemon": "^3.0.2"
    },
    "keywords": ["bun", "express", "mongodb", "api"],
    "author": "",
    "license": "MIT"
  },

  'server.js': `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', indexRoutes);
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`🚀 Server running on port \${PORT}\`);
  console.log(\`📱 Environment: \${process.env.NODE_ENV || 'development'}\`);
});

module.exports = app;`,

  '.env': `# Server Configuration
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:5000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/{{PROJECT_NAME}}
DB_NAME={{PROJECT_NAME}}

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# API Keys (add your external API keys here)
# EXAMPLE_API_KEY=your-api-key-here

# Email Configuration (optional)
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Security
BCRYPT_ROUNDS=12`,

  'config/database.js': `const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // No need for useNewUrlParser and useUnifiedTopology in newer versions
    });

    console.log(\`📦 MongoDB Connected: \${conn.connection.host}\`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;`,

  'routes/index.js': `const express = require('express');
const router = express.Router();

// Welcome route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to {{PROJECT_NAME}} API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API status route
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'operational',
      database: 'connected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    }
  });
});

module.exports = router;`,

  'routes/auth.js': `const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authController.login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, authController.getMe);

// @route   PUT /api/auth/update
// @desc    Update user profile
// @access  Private
router.put('/update', auth, authController.updateProfile);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, authController.logout);

module.exports = router;`,

  'controllers/authController.js': `const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          lastLogin: user.lastLogin
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/update
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    
    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (email) fieldsToUpdate.email = email;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.user.id } 
      });
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email is already taken'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But we can track logout time for analytics
    const user = await User.findById(req.user.id);
    user.lastLogout = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};`,

  'models/User.js': `const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\\w+([\\.-]?\\w+)*@\\w+([\\.-]?\\w+)*(\\.\\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  lastLogout: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for user's full profile
userSchema.virtual('profile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt
  };
});

// Pre-save middleware to ensure email is lowercase
userSchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  next();
});

// Instance method to check if user is admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

module.exports = mongoose.model('User', userSchema);`,

  'middleware/auth.js': `const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    let token;

    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token is valid but user no longer exists'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        });
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Middleware to check if user is admin
const adminAuth = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
};

// Middleware to check if user owns the resource or is admin
const ownerOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    const userId = req.user.id;
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (req.user.role === 'admin' || userId === resourceUserId) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }
  };
};

module.exports = auth;
module.exports.adminAuth = adminAuth;
module.exports.ownerOrAdmin = ownerOrAdmin;`,

  'middleware/errorHandler.js': `const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = \`\${field.charAt(0).toUpperCase() + field.slice(1)} already exists\`;
    error = { message, statusCode: 409 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Default error response
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    })
  });
};

module.exports = errorHandler;`,

  '.gitignore': `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage
.grunt

# Bower dependency directory
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons
build/Release

# Dependency directories
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# parcel-bundler cache
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed

# IDE and editor files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Uploads
uploads/
public/uploads/

# SSL certificates
*.pem
*.crt
*.key

# Database files
*.sqlite
*.db

# Backup files
*.backup
*.bak`,

  'README.md': `# {{PROJECT_NAME}}

A modern API built with Bun, Express.js, and MongoDB.

## 🚀 Features

- **Bun Runtime**: Lightning-fast JavaScript runtime
- **Express.js**: Minimal and flexible web framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **Authentication**: JWT-based authentication system
- **Security**: Helmet, CORS, rate limiting
- **Error Handling**: Centralized error handling
- **Validation**: Request validation and sanitization
- **Environment Config**: Environment-based configuration

## 📋 Prerequisites

- [Bun](https://bun.sh/) installed
- [MongoDB](https://www.mongodb.com/) installed and running
- Node.js 16+ (for development tools)

## 🛠️ Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd {{PROJECT_NAME}}
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   bun install
   \`\`\`

3. **Set up environment variables**
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   
   Edit \`.env\` file with your configuration:
   \`\`\`env
   NODE_ENV=development
   PORT=8000
   MONGODB_URI=mongodb://localhost:27017/{{PROJECT_NAME}}
   JWT_SECRET=your-super-secret-jwt-key
   \`\`\`

4. **Start MongoDB**
   \`\`\`bash
   # On macOS with Homebrew
   brew services start mongodb-community
   
   # On Linux
   sudo systemctl start mongod
   
   # On Windows
   net start MongoDB
   \`\`\`

5. **Start the development server**
   \`\`\`bash
   bun run dev
   \`\`\`

## 🏗️ Project Structure

\`\`\`
{{PROJECT_NAME}}/
├── config/
│   └── database.js          # Database connection
├── controllers/
│   └── authController.js    # Authentication logic
├── middleware/
│   ├── auth.js             # Authentication middleware
│   └── errorHandler.js     # Error handling middleware
├── models/
│   └── User.js             # User model
├── routes/
│   ├── index.js            # Main routes
│   └── auth.js             # Authentication routes
├── .env                    # Environment variables
├── .gitignore             # Git ignore rules
├── package.json           # Dependencies and scripts
├── README.md              # Project documentation
└── server.js              # Application entry point
\`\`\`

## 🔌 API Endpoints

### Health Check
- **GET** \`/health\` - Server health status

### General
- **GET** \`/api/\` - Welcome message
- **GET** \`/api/status\` - API status

### Authentication
- **POST** \`/api/auth/register\` - Register new user
- **POST** \`/api/auth/login\` - Login user
- **GET** \`/api/auth/me\` - Get current user (protected)
- **PUT** \`/api/auth/update\` - Update user profile (protected)
- **POST** \`/api/auth/logout\` - Logout user (protected)

## 📝 API Usage Examples

### Register a new user
\`\`\`bash
curl -X POST http://localhost:8000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
\`\`\`

### Login
\`\`\`bash
curl -X POST http://localhost:8000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
\`\`\`

### Get current user (with token)
\`\`\`bash
curl -X GET http://localhost:8000/api/auth/me \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
\`\`\`

## 🚀 Available Scripts

- \`bun run start\` - Start production server
- \`bun run dev\` - Start development server with watch mode
- \`bun run test\` - Run tests (not implemented yet)

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| \`NODE_ENV\` | Environment mode | \`development\` |
| \`PORT\` | Server port | \`8000\` |
| \`MONGODB_URI\` | MongoDB connection string | \`mongodb://localhost:27017/{{PROJECT_NAME}}\` |
| \`JWT_SECRET\` | JWT signing secret | Required |
| \`JWT_EXPIRE\` | JWT expiration time | \`7d\` |
| \`BCRYPT_ROUNDS\` | Bcrypt hashing rounds | \`12\` |
| \`FRONTEND_URL\` | Frontend URL for CORS | \`http://localhost:5000\` |

## 🔒 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request rate limiting
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: Bcrypt password hashing
- **Input Validation**: Request validation and sanitization

## 🛡️ Error Handling

The API includes comprehensive error handling:

- **Validation Errors**: 400 Bad Request
- **Authentication Errors**: 401 Unauthorized
- **Authorization Errors**: 403 Forbidden
- **Not Found Errors**: 404 Not Found
- **Server Errors**: 500 Internal Server Error

## 🧪 Testing

Testing endpoints with curl or tools like Postman:

1. **Health Check**:
   \`\`\`bash
   curl http://localhost:8000/health
   \`\`\`

2. **API Status**:
   \`\`\`bash
   curl http://localhost:8000/api/status
   \`\`\`

## 📚 Next Steps

1. **Add more models**: Create additional models for your application
2. **Implement validation**: Add request validation using libraries like Joi
3. **Add tests**: Implement unit and integration tests
4. **Set up CI/CD**: Configure continuous integration and deployment
5. **Add documentation**: Use tools like Swagger for API documentation
6. **Implement logging**: Add structured logging with Winston or similar
7. **Add caching**: Implement Redis for caching
8. **File uploads**: Add file upload functionality
9. **Email service**: Integrate email service for notifications
10. **Real-time features**: Add WebSocket support for real-time features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you have any questions or need help:

1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information

---

**Happy coding! 🎉**`
};

program
  .name('koti')
  .description('CLI tool to generate Bun API projects with Express and MongoDB')
  .version('1.0.0')

program
  .command('new <project-name>')
  .description('Create a new Bun API project')
  .alias('create')
  .action(async (projectName) => {
    try {
      // Validate project name
      if (!projectName || projectName.trim() === '') {
        console.error(colors.red('❌ Error: Project name is required'));
        process.exit(1);
      }

      // Check for valid project name format
      if (!/^[a-zA-Z0-9-_]+$/.test(projectName)) {
        console.error(colors.red('❌ Error: Project name can only contain letters, numbers, hyphens, and underscores'));
        process.exit(1);
      }

      const projectPath = path.join(process.cwd(), projectName);

      // Check if directory already exists
      if (await fs.pathExists(projectPath)) {
        console.error(colors.red(`❌ Error: Directory "${projectName}" already exists`));
        process.exit(1);
      }

      console.log(colors.blue(`🚀 Creating Bun API project: ${projectName}`));
      console.log(colors.cyan(`📁 Project directory: ${projectPath}`));

      // Create project directory
      await fs.ensureDir(projectPath);

      // Create subdirectories
      const directories = [
        'config',
        'controllers', 
        'middleware',
        'models',
        'routes'
      ];

      for (const dir of directories) {
        await fs.ensureDir(path.join(projectPath, dir));
        console.log(colors.green(`✅ Created directory: ${dir}/`));
      }

      // Create files from templates
      const files = [
        { 
          name: 'package.json', 
          content: JSON.stringify(templates['package.json'], null, 2).replace(/{{PROJECT_NAME}}/g, projectName)
        },
        { 
          name: 'server.js', 
          content: templates['server.js']
        },
        { 
          name: '.env', 
          content: templates['.env'].replace(/{{PROJECT_NAME}}/g, projectName)
        },
        { 
          name: 'config/database.js', 
          content: templates['config/database.js']
        },
        { 
          name: 'routes/index.js', 
          content: templates['routes/index.js'].replace(/{{PROJECT_NAME}}/g, projectName)
        },
        { 
          name: 'routes/auth.js', 
          content: templates['routes/auth.js']
        },
        { 
          name: 'controllers/authController.js', 
          content: templates['controllers/authController.js']
        },
        { 
          name: 'models/User.js', 
          content: templates['models/User.js']
        },
        { 
          name: 'middleware/auth.js', 
          content: templates['middleware/auth.js']
        },
        { 
          name: 'middleware/errorHandler.js', 
          content: templates['middleware/errorHandler.js']
        },
        { 
          name: '.gitignore', 
          content: templates['.gitignore']
        },
        { 
          name: 'README.md', 
          content: templates['README.md'].replace(/{{PROJECT_NAME}}/g, projectName)
        }
      ];

      for (const file of files) {
        const filePath = path.join(projectPath, file.name);
        await fs.writeFile(filePath, file.content);
        console.log(colors.green(`✅ Created file: ${file.name}`));
      }

      // Success message
      console.log('\n' + colors.green('🎉 Project created successfully!'));
      console.log('\n' + colors.yellow('📋 Next steps:'));
      console.log(`   1. cd ${projectName}`);
      console.log('   2. bun install');
      console.log('   3. Update .env file with your MongoDB URI and JWT secret');
      console.log('   4. Start MongoDB server');
      console.log('   5. bun run dev');
      
      console.log('\n' + colors.blue('📚 Useful commands:'));
      console.log('   • bun run start    - Start production server');
      console.log('   • bun run dev      - Start development server with watch mode');
      
      console.log('\n' + colors.cyan('🌐 Default endpoints:'));
      console.log('   • http://localhost:8000/health     - Health check');
      console.log('   • http://localhost:8000/api/       - API welcome');
      console.log('   • http://localhost:8000/api/status - API status');
      
      console.log('\n' + colors.cyan('🔐 Authentication endpoints:'));
      console.log('   • POST /api/auth/register - Register user');
      console.log('   • POST /api/auth/login    - Login user');
      console.log('   • GET  /api/auth/me       - Get current user');
      
      console.log('\n' + colors.yellow('💡 Don\'t forget to:'));
      console.log('   • Set up your MongoDB database');
      console.log('   • Generate a secure JWT secret');
      console.log('   • Configure your environment variables');
      
      console.log('\n' + colors.green('Happy coding! 🚀'));

    } catch (error) {
      console.error(colors.red('❌ Error creating project:'), error.message);
      process.exit(1);
    }
  });

// Model command for interactive model creation
program
  .command('model <model-name>')
  .description('Create a new model with interactive setup')
  .action(async (modelName) => {
    try {
      // Validate model name
      if (!modelName || modelName.trim() === '') {
        console.error(colors.red('❌ Error: Model name is required'));
        process.exit(1);
      }

      // Check for valid model name format
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(modelName)) {
        console.error(colors.red('❌ Error: Model name must start with a letter and contain only letters, numbers, and underscores'));
        process.exit(1);
      }

      await createInteractiveModel(modelName);
    } catch (error) {
      console.error(colors.red('❌ Error creating model:'), error.message);
      process.exit(1);
    }
  });

// Show help if no arguments provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse();
