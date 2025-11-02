
# Implementasi Database PostgreSQL dengan Website

## Step-by-Step Implementation

### 1. Setup Database PostgreSQL

#### Install PostgreSQL (jika belum terinstall):
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS dengan Homebrew
brew install postgresql

# Windows: Download dari https://www.postgresql.org/download/
```

#### Setup Database:
```bash
# Masuk ke PostgreSQL
sudo -u postgres psql

# Atau langsung jalankan script setup
node scripts/setup-database.js
```

### 2. Install Dependencies Backend

```bash
# Install backend dependencies
npm install express cors pg bcrypt jsonwebtoken
npm install -D nodemon

# Dependencies sudah ditambahkan untuk frontend:
# - pg, @types/pg, axios
```

### 3. Konfigurasi Database

Edit file `scripts/setup-database.js` dan ubah konfigurasi sesuai setup PostgreSQL Anda:

```javascript
const config = {
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'YOUR_POSTGRES_PASSWORD' // Ganti dengan password Anda
};
```

### 4. Jalankan Setup Database

```bash
node scripts/setup-database.js
```

### 5. Setup Backend Server

```bash
# Masuk ke folder server
cd server

# Install dependencies
npm init -y
npm install express cors pg bcrypt jsonwebtoken
npm install -D nodemon

# Jalankan server
node index.js
# atau dengan nodemon untuk development
npx nodemon index.js
```

### 6. Update Konfigurasi Frontend

Edit file `src/config/environment.ts` sesuai dengan setup database Anda.

### 7. Testing Koneksi

1. **Start Backend Server:**
   ```bash
   cd server
   node index.js
   ```

2. **Start Frontend:**
   ```bash
   npm run dev
   ```

3. **Test Login:**
   - Buat user baru melalui register
   - Login dengan admin/hr untuk approve user
   - Test attendance check-in/check-out

### 8. Demo Accounts Setup

Untuk demo, buat beberapa user langsung di database:

```sql
INSERT INTO users (username, email, full_name, password_hash, role, is_approved) VALUES
('admin', 'admin@company.com', 'Super Administrator', '$2b$10$hash', 'Super Admin', true),
('hr001', 'hr@company.com', 'HR Manager', '$2b$10$hash', 'HR', true),
('karyawan001', 'john@company.com', 'John Doe', '$2b$10$hash', 'Karyawan', true);
```

### 9. Features yang Terintegrasi

✅ **Sudah Terintegrasi:**
- Login/Register dengan database
- User approval system
- Attendance check-in/check-out
- Role-based access control

🔄 **Next Steps:**
- Face recognition integration
- Real-time notifications
- Advanced reporting
- File upload for face images

### 10. Environment Variables

Buat file `.env.local` untuk konfigurasi:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=attendance_system
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-secret-key
```

### 11. Production Deployment

Untuk production:
1. Setup PostgreSQL server
2. Deploy backend ke cloud (Heroku, AWS, etc.)
3. Update API_BASE_URL di frontend
4. Setup proper environment variables
5. Enable SSL untuk database connection
```
