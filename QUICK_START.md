# Quick Start Guide

## For Users (Installing Koti CLI)

Once published to npm, users can install and use Koti CLI with:

```bash
# Install globally
npm install -g koti

# Create a new Bun API project
koti new my-awesome-api

# Navigate to project and start
cd my-awesome-api
bun install
bun run dev

# Create interactive models (inside project directory)
koti model Product
koti model Category
koti model Order
```

### Interactive Model Creation

The `koti model` command provides an interactive experience to:

- **Add custom fields** with various data types (String, Number, Date, Boolean, ObjectId, Array, etc.)
- **Set validation rules** (required, unique, min/max length, etc.)
- **Configure relationships** between models using ObjectId references
- **Auto-generate** complete CRUD operations:
  - Mongoose model with schema validation
  - Service layer with business logic
  - Controller with REST endpoints
  - Express routes with authentication
- **Update server.js** automatically with new routes

#### Example Model Creation Flow:
```bash
$ koti model Product

🏗️  Creating model: Product

Available data types:
  1. String   2. Number   3. Date      4. Boolean   5. ObjectId
  6. Array    7. Mixed    8. Decimal128 9. Map      10. Schema

📝 Add fields to your model (press Enter without field name to finish):

--- Field 1 ---
Field name: title
Data type (1-10): 1
Required? (y/N): y
Unique? (y/N): n
Trim whitespace? (Y/n): y
Minimum length (optional): 3
Maximum length (optional): 100

--- Field 2 ---
Field name: price
Data type (1-10): 2
Required? (y/N): y
Minimum value (optional): 0

--- Field 3 ---
Field name: category
Data type (1-10): 5
Reference model: Category
Required? (y/N): y

✅ Created model: models/Product.js
✅ Created service: services/productService.js  
✅ Created controller: controllers/productController.js
✅ Created routes: routes/product.js
✅ Updated server.js with new routes

🌐 Available endpoints:
   • GET    /api/products           - Get all products
   • GET    /api/products/search    - Search products  
   • GET    /api/products/:id       - Get single product
   • POST   /api/products           - Create new product
   • PUT    /api/products/:id       - Update product
   • DELETE /api/products/:id       - Delete product
```

## For Developers (Publishing to npm)

### 1. Quick Setup
```bash
# Run the setup script
./setup-npm.sh
```

### 2. Manual Setup
```bash
# Copy package configuration
cp npm-package.json package.json

# Make executable
chmod +x koti

# Install dependencies
npm install

# Test locally
npm pack
```

### 3. Publish to npm
```bash
# Login to npm (first time only)
npm login

# Publish package
npm publish
```

## Generated Project Structure

When users run `koti new project-name`, they get:

```
project-name/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   └── authController.js    # Authentication logic
├── middleware/
│   ├── auth.js             # JWT middleware
│   └── errorHandler.js     # Error handling
├── models/
│   └── User.js             # User model
├── routes/
│   ├── auth.js             # Auth routes
│   └── index.js            # API routes
├── .env                    # Environment variables
├── .gitignore             # Git ignore rules
├── package.json           # Project dependencies
├── README.md              # Documentation
└── server.js              # Main server file
```

## Features Included

- **Bun Runtime**: High-performance JavaScript runtime
- **Express.js**: Web framework with security middleware
- **MongoDB**: Database with Mongoose ODM
- **JWT Authentication**: Complete auth system
- **Security**: Helmet, CORS, rate limiting, password hashing
- **Error Handling**: Centralized error management
- **Environment Config**: Comprehensive .env setup

## API Endpoints Generated

- `GET /health` - Health check
- `GET /api/` - API welcome
- `GET /api/status` - API status
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/update` - Update profile (protected)
- `POST /api/auth/logout` - User logout (protected)

## Support

For issues or questions:
1. Check the generated project's README.md
2. Review the PUBLISHING_GUIDE.md for npm publishing
3. Create an issue in the GitHub repository