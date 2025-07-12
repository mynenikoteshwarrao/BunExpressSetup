# Publishing Koti CLI to npm

This guide will help you publish the Koti CLI tool to npm so users can install it globally with `npm install -g koti`.

## Prerequisites

1. **Node.js and npm**: Ensure you have Node.js 16+ and npm installed
2. **npm account**: Create an account at [npmjs.com](https://www.npmjs.com/)
3. **GitHub repository**: Create a GitHub repository for your project

## Steps to Publish

### 1. Prepare Your Project Structure

Your project should have this structure:
```
koti/
├── koti                    # Main executable file
├── templates/
│   └── index.js           # Template files
├── npm-package.json       # Package configuration
├── README.md              # Documentation
├── LICENSE                # MIT License
└── PUBLISHING_GUIDE.md    # This guide
```

### 2. Update Package Information

Edit `npm-package.json` and update these fields:
- `author.name`: Your name
- `author.email`: Your email
- `repository.url`: Your GitHub repository URL
- `bugs.url`: Your GitHub issues URL
- `homepage`: Your GitHub repository homepage

### 3. Set Up Git Repository

```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit: Koti CLI tool"

# Add remote repository (replace with your GitHub URL)
git remote add origin https://github.com/yourusername/koti.git

# Push to GitHub
git push -u origin main
```

### 4. Prepare for npm Publishing

```bash
# Login to npm (run this once)
npm login

# Copy the package.json file to the correct location
cp npm-package.json package.json

# Test the package locally
npm pack

# This creates a .tgz file you can test with:
npm install -g koti-1.0.0.tgz
```

### 5. Test Your Package

```bash
# Test the global installation
koti --help

# Test creating a project
koti new test-project

# Verify it works, then clean up
rm -rf test-project
```

### 6. Publish to npm

```bash
# Publish to npm
npm publish

# If the package name is taken, you might need to use a scoped package
# npm publish --scope=@yourusername
```

### 7. Verify Publication

```bash
# Uninstall local version
npm uninstall -g koti

# Install from npm
npm install -g koti

# Test again
koti --help
koti new test-project
```

## After Publishing

### Update Documentation

Update your README.md to include the new installation instructions:

```markdown
## Installation

Install globally via npm:

```bash
npm install -g koti
```

## Usage

Create a new Bun API project:

```bash
koti new my-awesome-api
```
```

### Managing Updates

When you make changes:

1. Update version in package.json:
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. Commit and push changes:
   ```bash
   git add .
   git commit -m "Update: description of changes"
   git push
   ```

3. Publish update:
   ```bash
   npm publish
   ```

## Alternative Package Names

If "koti" is taken, consider these alternatives:
- `koti-cli`
- `koti-generator`
- `bun-api-generator`
- `create-bun-api`
- `@yourusername/koti` (scoped package)

## Package.json Key Fields Explained

- `name`: Package name (must be unique on npm)
- `version`: Follow semantic versioning (x.y.z)
- `bin`: Maps command name to executable file
- `files`: Specifies which files to include in the package
- `engines`: Specifies Node.js version requirements
- `keywords`: Helps users find your package

## Troubleshooting

### Common Issues:

1. **Package name taken**: Try a different name or use a scoped package
2. **Permission denied**: Make sure the `koti` file is executable (`chmod +x koti`)
3. **Module not found**: Ensure all dependencies are listed in package.json
4. **Command not found**: Check that `bin` field in package.json is correct

### Testing Locally:

```bash
# Link package locally for testing
npm link

# Test the command
koti --help

# Unlink when done
npm unlink
```

## Success!

Once published, users can install your tool with:

```bash
npm install -g koti
```

And use it with:

```bash
koti new my-project
```

Your CLI tool is now available to developers worldwide!