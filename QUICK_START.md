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