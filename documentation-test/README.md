# documentation-test

A modern API built with Bun, Express.js, and MongoDB.

## ⚠️ Development Disclaimer

**This project was generated using Koti CLI (Development Version 1.0.3)**

This is an initial development release and may contain errors, bugs, or security vulnerabilities. Please:
- Review all generated code before using in production
- Test thoroughly in development environments
- Update dependencies to latest versions
- Implement proper security measures for production use
- Use at your own discretion and risk

Generated code is provided "as-is" without warranty of any kind.

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
   ```bash
   git clone <repository-url>
   cd documentation-test
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=8000
   MONGODB_URI=mongodb://localhost:27017/documentation-test
   JWT_SECRET=your-super-secret-jwt-key
   ```

4. **Start MongoDB**
   ```bash
   # On macOS with Homebrew
   brew services start mongodb-community
   
   # On Linux
   sudo systemctl start mongod
   
   # On Windows
   net start MongoDB
   ```

5. **Start the development server**
   ```bash
   bun run dev
   ```

## 🏗️ Project Structure

```
documentation-test/
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
```

## 🔌 API Endpoints

### Health Check
- **GET** `/health` - Server health status

### General
- **GET** `/api/` - Welcome message
- **GET** `/api/status` - API status

### Authentication
- **POST** `/api/auth/register` - Register new user
- **POST** `/api/auth/login` - Login user
- **GET** `/api/auth/me` - Get current user (protected)
- **PUT** `/api/auth/update` - Update user profile (protected)
- **POST** `/api/auth/logout` - Logout user (protected)

## 📝 API Usage Examples

### Register a new user
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get current user (with token)
```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🚀 Available Scripts

- `bun run start` - Start production server
- `bun run dev` - Start development server with watch mode
- `bun run test` - Run tests (not implemented yet)

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `8000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/documentation-test` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRE` | JWT expiration time | `7d` |
| `BCRYPT_ROUNDS` | Bcrypt hashing rounds | `12` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5000` |

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
   ```bash
   curl http://localhost:8000/health
   ```

2. **API Status**:
   ```bash
   curl http://localhost:8000/api/status
   ```

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

**Happy coding! 🎉**