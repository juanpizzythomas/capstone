
-- Query-query yang berguna untuk sistem absensi karyawan

-- 1. Melihat semua karyawan dengan status approval
SELECT 
    u.id,
    u.username,
    u.full_name,
    u.email,
    u.role,
    u.is_approved,
    CASE WHEN fd.id IS NOT NULL THEN 'Verified' ELSE 'Not Verified' END as face_verification_status
FROM users u
LEFT JOIN face_data fd ON u.id = fd.user_id AND fd.is_active = true
ORDER BY u.created_at DESC;

-- 2. Laporan absensi harian
SELECT 
    u.full_name,
    u.username,
    ar.attendance_date,
    ar.check_in_time,
    ar.check_out_time,
    ar.status,
    ar.work_hours,
    ar.overtime_hours
FROM attendance_records ar
JOIN users u ON ar.user_id = u.id
WHERE ar.attendance_date = CURRENT_DATE
ORDER BY ar.check_in_time;

-- 3. Laporan absensi bulanan per karyawan
SELECT 
    u.full_name,
    COUNT(*) as total_days,
    COUNT(CASE WHEN ar.status = 'Present' THEN 1 END) as present_days,
    COUNT(CASE WHEN ar.status = 'Late' THEN 1 END) as late_days,
    COUNT(CASE WHEN ar.status = 'Absent' THEN 1 END) as absent_days,
    ROUND(AVG(ar.work_hours), 2) as avg_work_hours,
    SUM(ar.overtime_hours) as total_overtime
FROM users u
LEFT JOIN attendance_records ar ON u.id = ar.user_id 
    AND ar.attendance_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND ar.attendance_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
WHERE u.role = 'Karyawan' AND u.is_approved = true
GROUP BY u.id, u.full_name
ORDER BY u.full_name;

-- 4. Karyawan yang belum check-out hari ini
SELECT 
    u.full_name,
    u.username,
    ar.check_in_time,
    EXTRACT(HOUR FROM (CURRENT_TIMESTAMP - ar.check_in_time)) as hours_worked
FROM attendance_records ar
JOIN users u ON ar.user_id = u.id
WHERE ar.attendance_date = CURRENT_DATE
    AND ar.check_in_time IS NOT NULL
    AND ar.check_out_time IS NULL
ORDER BY ar.check_in_time;

-- 5. Statistik keterlambatan per karyawan (bulan ini)
SELECT 
    u.full_name,
    COUNT(CASE WHEN ar.status = 'Late' THEN 1 END) as late_count,
    COUNT(*) as total_attendance,
    ROUND(
        (COUNT(CASE WHEN ar.status = 'Late' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 
        2
    ) as late_percentage
FROM users u
LEFT JOIN attendance_records ar ON u.id = ar.user_id 
    AND ar.attendance_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND ar.attendance_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
WHERE u.role = 'Karyawan' AND u.is_approved = true
GROUP BY u.id, u.full_name
HAVING COUNT(*) > 0
ORDER BY late_percentage DESC;

-- 6. Karyawan yang belum verifikasi wajah
SELECT 
    u.id,
    u.username,
    u.full_name,
    u.email,
    u.created_at
FROM users u
LEFT JOIN face_data fd ON u.id = fd.user_id AND fd.is_active = true
WHERE u.role = 'Karyawan' 
    AND u.is_approved = true 
    AND fd.id IS NULL
ORDER BY u.created_at;

-- 7. Audit log aktivitas login hari ini
SELECT 
    u.full_name,
    u.username,
    al.action,
    al.ip_address,
    al.timestamp
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.action IN ('login', 'logout')
    AND al.timestamp >= CURRENT_DATE
    AND al.timestamp < CURRENT_DATE + INTERVAL '1 day'
ORDER BY al.timestamp DESC;

-- 8. Performa absensi per departemen/role
SELECT 
    u.role,
    COUNT(DISTINCT u.id) as total_employees,
    COUNT(ar.id) as total_attendances,
    ROUND(AVG(ar.work_hours), 2) as avg_work_hours,
    COUNT(CASE WHEN ar.status = 'Present' THEN 1 END) as present_count,
    COUNT(CASE WHEN ar.status = 'Late' THEN 1 END) as late_count
FROM users u
LEFT JOIN attendance_records ar ON u.id = ar.user_id 
    AND ar.attendance_date >= DATE_TRUNC('month', CURRENT_DATE)
WHERE u.is_approved = true
GROUP BY u.role
ORDER BY u.role;

-- 9. Top 10 karyawan dengan jam kerja terbanyak (bulan ini)
SELECT 
    u.full_name,
    u.username,
    SUM(ar.work_hours) as total_work_hours,
    SUM(ar.overtime_hours) as total_overtime_hours,
    COUNT(ar.id) as attendance_days
FROM users u
JOIN attendance_records ar ON u.id = ar.user_id
WHERE ar.attendance_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND ar.attendance_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    AND u.role = 'Karyawan'
GROUP BY u.id, u.full_name, u.username
ORDER BY total_work_hours DESC
LIMIT 10;

-- 10. Mencari duplikasi absensi (error handling)
SELECT 
    user_id,
    attendance_date,
    COUNT(*) as duplicate_count
FROM attendance_records
GROUP BY user_id, attendance_date
HAVING COUNT(*) > 1;
