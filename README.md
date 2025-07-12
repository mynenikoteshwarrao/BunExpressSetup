# Koti - Bun API Generator

A CLI tool that generates Bun-based API projects with Express.js and MongoDB setup. This tool creates a complete, production-ready API project structure with authentication, security middleware, and best practices built-in.

## Features

- **Bun Runtime**: Optimized for speed with modern JavaScript runtime
- **Express.js**: Minimal and flexible web framework
- **MongoDB Integration**: Complete setup with Mongoose ODM
- **JWT Authentication**: Ready-to-use authentication system
- **Security First**: Helmet, CORS, rate limiting, and password hashing
- **Error Handling**: Centralized error handling middleware
- **Environment Config**: Comprehensive environment variable setup
- **Standard Structure**: Well-organized folder structure following best practices

## Installation

### Global Installation (Recommended)

Install globally via npm:

```bash
npm install -g koti
```

### Development Setup

For development or local testing:

1. **Clone this repository**:
   ```bash
   git clone <repository-url>
   cd koti
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Make executable**:
   ```bash
   chmod +x koti
   ```

## Usage

Create a new Bun API project:

```bash
koti new my-awesome-api
```

Or use the create alias:

```bash
koti create my-awesome-api
```

## Generated Project Structure

```
my-awesome-api/
├── config/
│   └── database.js          # MongoDB connection setup
├── controllers/
│   └── authController.js    # Authentication controllers
├── middleware/
│   ├── auth.js             # JWT authentication middleware
│   └── errorHandler.js     # Error handling middleware
├── models/
│   └── User.js             # User model with Mongoose
├── routes/
│   ├── auth.js             # Authentication routes
│   └── index.js            # General API routes
├── .env                    # Environment variables
├── .gitignore             # Git ignore rules
├── package.json           # Project dependencies
├── README.md              # Project documentation
└── server.js              # Main server file
```

## Quick Start for Generated Project

1. **Navigate to your project**:
   ```bash
   cd my-awesome-api
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Set up MongoDB**:
   - Install and start MongoDB locally, or
   - Get a MongoDB Atlas connection string

4. **Configure environment**:
   - Update `.env` file with your MongoDB URI
   - Generate a secure JWT secret
   - Adjust other settings as needed

5. **Start development server**:
   ```bash
   bun run dev
   ```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### General API
- `GET /api/` - API welcome message
- `GET /api/status` - Detailed API status

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/update` - Update user profile (protected)
- `POST /api/auth/logout` - User logout (protected)

## Environment Variables

The generated `.env` file includes:

```env
# Server Configuration
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:5000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/your-project-name
DB_NAME=your-project-name

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Security
BCRYPT_ROUNDS=12
```

## Dependencies Included

### Production Dependencies
- **express**: Web framework
- **mongoose**: MongoDB ODM
- **dotenv**: Environment variable management
- **cors**: Cross-origin resource sharing
- **helmet**: Security headers
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT token management
- **express-rate-limit**: Request rate limiting

### Development Dependencies
- **nodemon**: Development server with auto-restart

## Security Features

- **Rate Limiting**: Prevents brute force attacks
- **CORS Configuration**: Secure cross-origin requests
- **Helmet**: Sets various HTTP headers for security
- **Password Hashing**: bcrypt with configurable rounds
- **JWT Authentication**: Stateless authentication
- **Input Validation**: Mongoose schema validation
- **Error Handling**: Prevents information leakage

## Development Commands

```bash
# Start production server
bun run start

# Start development server with hot reload
bun run dev

# Run tests (when implemented)
bun run test
```

## Customization

The generated project is designed to be a starting point. You can:

1. **Add new routes**: Create new files in the `routes/` directory
2. **Add models**: Create new Mongoose models in `models/`
3. **Add middleware**: Extend functionality with custom middleware
4. **Configure database**: Modify `config/database.js` for your needs
5. **Add services**: Create business logic in a `services/` directory

## Requirements

- **Bun**: Latest version recommended
- **MongoDB**: Local installation or cloud instance
- **Node.js**: 16+ (for development tools)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use this tool for personal and commercial projects.

## Support

If you encounter any issues or have questions:

1. Check the generated project's README for specific setup instructions
2. Ensure MongoDB is running and accessible
3. Verify environment variables are properly configured
4. Check that all dependencies are installed

## Changelog

### Version 1.0.0
- Initial release
- Complete Bun API project generation
- Authentication system included
- Security middleware setup
- MongoDB integration
- Comprehensive documentation