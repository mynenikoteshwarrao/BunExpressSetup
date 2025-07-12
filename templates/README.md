# {{PROJECT_NAME}}

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
   ```bash
   git clone <repository-url>
   cd {{PROJECT_NAME}}
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
   MONGODB_URI=mongodb://localhost:27017/{{PROJECT_NAME}}
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

