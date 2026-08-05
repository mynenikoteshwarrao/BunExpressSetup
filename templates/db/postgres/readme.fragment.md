4. **Start PostgreSQL and create the database**
   ```bash
   # On macOS with Homebrew
   brew services start postgresql@16

   # On Linux
   sudo systemctl start postgresql

   createdb {{PROJECT_NAME}}
   ```

   Then apply the migrations:
   ```bash
   npm run db:migrate
   ```
