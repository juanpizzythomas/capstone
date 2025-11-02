
-- Sample Data untuk Testing Sistem Absensi Karyawan

-- Insert data admin/super admin pertama (password: admin123)
INSERT INTO users (id, username, email, full_name, password_hash, role, is_approved, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin', 'admin@company.com', 'Super Administrator', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LuWxuKq.E4i9tAOK6', 'Super Admin', TRUE, TRUE),
('550e8400-e29b-41d4-a716-446655440001', 'hr001', 'hr@company.com', 'HR Manager', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LuWxuKq.E4i9tAOK6', 'HR', TRUE, TRUE),
('550e8400-e29b-41d4-a716-446655440002', 'it001', 'it@company.com', 'IT Support', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LuWxuKq.E4i9tAOK6', 'IT', TRUE, TRUE),
('550e8400-e29b-41d4-a716-446655440003', 'karyawan001', 'john@company.com', 'John Doe', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LuWxuKq.E4i9tAOK6', 'Karyawan', TRUE, TRUE),
('550e8400-e29b-41d4-a716-446655440004', 'karyawan002', 'jane@company.com', 'Jane Smith', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LuWxuKq.E4i9tAOK6', 'Karyawan', TRUE, TRUE);

-- Insert sample face data untuk beberapa karyawan
INSERT INTO face_data (user_id, face_encoding, face_image_url, confidence_score) VALUES
('550e8400-e29b-41d4-a716-446655440003', 'base64_encoded_face_data_john_doe', '/uploads/faces/john_doe.jpg', 0.95),
('550e8400-e29b-41d4-a716-446655440004', 'base64_encoded_face_data_jane_smith', '/uploads/faces/jane_smith.jpg', 0.93);

-- Insert sample work schedules (Senin-Jumat, 08:00-17:00)
INSERT INTO work_schedules (user_id, day_of_week, start_time, end_time, break_start_time, break_end_time, effective_from) VALUES
-- John Doe schedule
('550e8400-e29b-41d4-a716-446655440003', 1, '08:00:00', '17:00:00', '12:00:00', '13:00:00', '2024-01-01'),
('550e8400-e29b-41d4-a716-446655440003', 2, '08:00:00', '17:00:00', '12:00:00', '13:00:00', '2024-01-01'),
('550e8400-e29b-41d4-a716-446655440003', 3, '08:00:00', '17:00:00', '12:00:00', '13:00:00', '2024-01-01'),
('550e8400-e29b-41d4-a716-446655440003', 4, '08:00:00', '17:00:00', '12:00:00', '13:00:00', '2024-01-01'),
('550e8400-e29b-41d4-a716-446655440003', 5, '08:00:00', '17:00:00', '12:00:00', '13:00:00', '2024-01-01'),
-- Jane Smith schedule
('550e8400-e29b-41d4-a716-446655440004', 1, '08:00:00', '17:00:00', '12:00:00', '13:00:00', '2024-01-01'),
('550e8400-e29b-41d4-a716-446655440004', 2, '08:00:00', '17:00:00', '12:00:00', '13:00:00', '2024-01-01'),
('550e8400-e29b-41d4-a716-446655440004', 3, '08:00:00', '17:00:00', '12:00:00', '13:00:00', '2024-01-01'),
('550e8400-e29b-41d4-a716-446655440004', 4, '08:00:00', '17:00:00', '12:00:00', '13:00:00', '2024-01-01'),
('550e8400-e29b-41d4-a716-446655440004', 5, '08:00:00', '17:00:00', '12:00:00', '13:00:00', '2024-01-01');

-- Insert sample attendance records
INSERT INTO attendance_records (user_id, check_in_time, check_out_time, attendance_date, status, work_hours, face_match_confidence, ip_address_check_in) VALUES
('550e8400-e29b-41d4-a716-446655440003', '2024-06-03 08:15:00+07', '2024-06-03 17:30:00+07', '2024-06-03', 'Present', 8.25, 0.94, '192.168.1.100'),
('550e8400-e29b-41d4-a716-446655440003', '2024-06-04 08:05:00+07', '2024-06-04 17:15:00+07', '2024-06-04', 'Present', 8.17, 0.96, '192.168.1.100'),
('550e8400-e29b-41d4-a716-446655440004', '2024-06-03 08:30:00+07', '2024-06-03 17:45:00+07', '2024-06-03', 'Late', 8.25, 0.92, '192.168.1.101'),
('550e8400-e29b-41d4-a716-446655440004', '2024-06-04 08:00:00+07', '2024-06-04 17:00:00+07', '2024-06-04', 'Present', 8.00, 0.95, '192.168.1.101');

-- Insert sample system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('working_hours_per_day', '8', 'number', 'Jam kerja standar per hari'),
('late_tolerance_minutes', '15', 'number', 'Toleransi keterlambatan dalam menit'),
('face_match_threshold', '0.85', 'number', 'Threshold minimum untuk pencocokan wajah'),
('overtime_rate', '1.5', 'number', 'Rate overtime (1.5x gaji normal)'),
('company_name', 'PT. Contoh Perusahaan', 'string', 'Nama perusahaan'),
('timezone', 'Asia/Jakarta', 'string', 'Timezone yang digunakan'),
('max_daily_work_hours', '12', 'number', 'Maksimal jam kerja per hari'),
('weekend_days', '[6,7]', 'json', 'Hari libur (6=Sabtu, 7=Minggu)');

-- Insert sample notifications
INSERT INTO notifications (user_id, title, message, type) VALUES
('550e8400-e29b-41d4-a716-446655440003', 'Welcome!', 'Selamat datang di sistem absensi karyawan. Pastikan Anda sudah melakukan verifikasi wajah.', 'info'),
('550e8400-e29b-41d4-a716-446655440004', 'Face Verification Required', 'Silakan lengkapi verifikasi wajah Anda untuk dapat melakukan absensi.', 'warning');
