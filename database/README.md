
# Database Schema untuk Sistem Absensi Karyawan

## Deskripsi
Database ini dirancang untuk mendukung sistem absensi karyawan dengan fitur face recognition menggunakan PostgreSQL.

## Struktur Database

### Tabel Utama

1. **users** - Menyimpan informasi karyawan dan akun login
2. **face_data** - Menyimpan data encoding wajah untuk face recognition
3. **attendance_records** - Menyimpan riwayat absensi karyawan
4. **audit_logs** - Menyimpan log aktivitas sistem
5. **system_settings** - Pengaturan sistem
6. **work_schedules** - Jadwal kerja karyawan
7. **leave_requests** - Permintaan cuti/izin
8. **notifications** - Notifikasi untuk karyawan

### Fitur Database

- **UUID Primary Keys** - Untuk keamanan dan skalabilitas
- **Timestamp Otomatis** - Auto-update timestamp saat record diubah
- **Foreign Key Constraints** - Menjaga integritas data
- **Indexes** - Optimasi performa query
- **Check Constraints** - Validasi data di level database
- **Triggers** - Automasi update timestamp

### Cara Penggunaan

1. **Setup Database**
   ```sql
   -- Jalankan schema.sql untuk membuat struktur database
   psql -U username -d database_name -f schema.sql
   ```

2. **Insert Sample Data**
   ```sql
   -- Jalankan sample_data.sql untuk data testing
   psql -U username -d database_name -f sample_data.sql
   ```

3. **Query Examples**
   ```sql
   -- Gunakan useful_queries.sql untuk contoh query yang berguna
   ```

### Konfigurasi Face Recognition

Data wajah disimpan dalam format:
- **face_encoding**: String encoding wajah (Base64 atau format khusus)
- **face_image_url**: URL file gambar wajah
- **confidence_score**: Tingkat kepercayaan encoding (0-1)

### Security Considerations

1. **Password Hashing**: Gunakan bcrypt atau argon2 untuk hash password
2. **Access Control**: Implementasi role-based access control (RBAC)
3. **Audit Trail**: Semua aktivitas tercatat di audit_logs
4. **Data Encryption**: Pertimbangkan enkripsi untuk data sensitif

### Performance Tips

1. Gunakan connection pooling
2. Implementasi caching untuk query yang sering digunakan
3. Regular maintenance (VACUUM, ANALYZE)
4. Monitor slow queries dan optimasi index

### Backup Strategy

1. Daily full backup
2. Continuous WAL archiving
3. Point-in-time recovery capability
4. Test restore procedures regularly

## Environment Variables

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=attendance_system
DB_USER=your_username
DB_PASSWORD=your_password
DB_SSL=require
```

## Migration Strategy

Untuk perubahan schema di masa depan, gunakan migration files dengan naming convention:
- `001_initial_schema.sql`
- `002_add_leave_requests.sql`
- `003_modify_attendance_indexes.sql`
