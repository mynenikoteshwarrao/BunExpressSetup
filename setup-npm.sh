#!/bin/bash

# Setup script for publishing Koti CLI to npm
# This script prepares your project for npm publishing

set -e

echo "🚀 Setting up Koti CLI for npm publishing..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ git is not installed. Please install git first."
    exit 1
fi

# Copy npm package.json to the correct location
if [ -f "npm-package.json" ]; then
    echo "📦 Copying npm-package.json to package.json..."
    cp npm-package.json package.json
else
    echo "❌ npm-package.json not found. Please ensure it exists."
    exit 1
fi

# Make koti executable
if [ -f "koti" ]; then
    echo "🔧 Making koti executable..."
    chmod +x koti
else
    echo "❌ koti file not found. Please ensure it exists."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Initialize git repository if not already initialized
if [ ! -d ".git" ]; then
    echo "🔧 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit: Koti CLI tool"
else
    echo "✅ Git repository already initialized."
fi

# Test the package locally
echo "🧪 Testing package locally..."
npm pack

# Get the generated package file
PACKAGE_FILE=$(ls koti-*.tgz | head -n 1)

if [ -f "$PACKAGE_FILE" ]; then
    echo "✅ Package created successfully: $PACKAGE_FILE"
    echo ""
    echo "🎉 Setup complete! Next steps:"
    echo ""
    echo "1. Update package.json with your information:"
    echo "   - author.name: Your name"
    echo "   - author.email: Your email"
    echo "   - repository.url: Your GitHub repository URL"
    echo ""
    echo "2. Create a GitHub repository and push your code:"
    echo "   git remote add origin https://github.com/mynenikoteshwarrao/BunExpressSetup.git"
    echo "   git push -u origin main"
    echo ""
    echo "3. Test the package locally:"
    echo "   npm install -g ./$PACKAGE_FILE"
    echo "   koti --help"
    echo ""
    echo "4. Login to npm and publish:"
    echo "   npm login"
    echo "   npm publish"
    echo ""
    echo "5. After publishing, users can install with:"
    echo "   npm install -g koti"
    echo ""
    echo "📖 See PUBLISHING_GUIDE.md for detailed instructions."
else
    echo "❌ Package creation failed."
    exit 1
fi