const express = require('express');
const bodyParser = require('body-parser');
const { loadModels, encodeFace, compareFaces } = require('./faceService');
const cors = require('cors');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const ExcelJS = require("exceljs");
const { sendAttendanceReminder } = require('./emailService');
// geolocation
const OFFICE_LAT = parseFloat(process.env.OFFICE_LAT || '-6.241977 '); // latitude kantor scbd = '-6.22849'
const OFFICE_LON = parseFloat(process.env.OFFICE_LON || '106.978994'); // longitude kantor scbd = '106.80688'
const OFFICE_RADIUS_M = parseFloat(process.env.OFFICE_RADIUS_M || '200'); // radius dalam meter

// Database configuration
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'testing123!@' // Change this to your PostgreSQL password
};

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Database connection
const client = new Client(dbConfig);
client.connect();

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// helper haversine (menghitung radius)
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  function toRad(x){ return x * Math.PI / 180; }
  const R = 6371000; // m
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*
            Math.sin(dLon/2)*Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// helper parse face_encoding dari DB
function parseEncoding(faceEncoding) {
  let storedArr = faceEncoding;

  if (typeof storedArr === 'string') {
    try {
      storedArr = JSON.parse(storedArr);
    } catch (err) {
      console.error("Invalid face_encoding value:", storedArr);
      throw new Error("Corrupted face data in database. Please re-register your face.");
    }
  }

  if (!Array.isArray(storedArr)) {
    console.error("Parsed face_encoding is not an array:", storedArr);
    throw new Error("Corrupted face data in database. Please re-register your face.");
  }

  return new Float32Array(storedArr);
}

// helper format tanggal DD/MM/YYYY
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// helper format jam:menit (HH:mm)
function formatTime(date) {
  if (!date) return null;
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// helper hitung durasi dari checkin ke checkout dalam jam:menit (working hours)
function formatDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null;
  const diffMs = new Date(checkOut) - new Date(checkIn);
  if (diffMs <= 0) return "00:00";
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}


// =========================== Routes AUTH / USER ================================= //

// Authentication
// endpoint login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await client.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // bandingkan password dengan password_hash di db
    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_approved) {
      return res.status(401).json({ error: 'Account not approved' });
    }

    // cek apakah data wajah user di tabel face_data
    const faceRes = await client.query(
      'SELECT id FROM face_data WHERE user_id = $1 LIMIT 1',
      [user.id]
    );
    const faceVerified = faceRes.rows.length > 0;

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isApproved: user.is_approved,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      faceVerified
    };

    res.json({ user: userResponse, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// endpoint register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, fullName, password } = req.body;
    
    // check user existed
    const existingUser = await client.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await client.query(
      `INSERT INTO users (username, email, full_name, password_hash, role, is_approved) 
       VALUES ($1, $2, $3, $4, 'Karyawan', false) RETURNING id`,
      [username, email, fullName, passwordHash]
    );

    res.json({ success: true, message: 'Registration successful. Waiting for approval.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// endpoint user management
app.get('/api/users/pending', authenticateToken, async (req, res) => {
  try {
    const result = await client.query(
      `SELECT id, username, email, full_name, role, created_at 
       FROM users WHERE is_approved = false AND is_active = true`
    );

    const users = result.rows.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      createdAt: user.created_at
    }));

    res.json(users);
  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await client.query(
      'UPDATE users SET is_approved = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// ================================ Routes FACE ============================== //

// endpoint encode wajah
app.post('/api/face/encode', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

    const encoding = await encodeFace(imageBase64);
    if (!encoding) return res.status(404).json({ error: 'No face detected' });

    res.json({ encoding });
  } catch (error) {
    console.error('Encode error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// helper bersihin base64
function cleanBase64(base64String) {
  return base64String.replace(/^data:image\/\w+;base64,/, "");
}

// helper timeout wrapper
async function encodeFaceWithTimeout(imageBase64, timeout = 10000) {
  return Promise.race([
    encodeFace(imageBase64),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Face encoding timeout")), timeout)
    )
  ]);
}

// endpoint verifikasi wajah
app.post('/api/face/verify', async (req, res) => {
  try {
    const { faceImage, storedEncoding, userId } = req.body;  // 🔹 konsisten pakai faceImage
    if (!faceImage) {
      return res.status(400).json({ error: 'Face image required' });
    }

    let storedArr;
    if (storedEncoding) {
      storedArr = storedEncoding;
    } else if (userId) {
      const faceRow = await client.query(
        `SELECT face_encoding 
         FROM face_data 
         WHERE user_id=$1 AND is_active=true 
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      if (faceRow.rows.length === 0) {
        return res.status(404).json({ error: 'Stored encoding not found' });
      }
      storedArr = faceRow.rows[0].face_encoding; // 🔹 kalau jsonb, langsung array
    } else {
      return res.status(400).json({ error: 'storedEncoding or userId required' });
    }

    // bersihin prefix base64
    const cleanImg = cleanBase64(faceImage);

    console.log("Starting face encoding...");
    const newEncoding = await encodeFaceWithTimeout(cleanImg);
    console.log("Encoding result:", newEncoding ? "OK" : "FAILED");

    if (!newEncoding) {
      return res.status(404).json({ error: 'No face detected in input image' });
    }

    const storedEncodingFloat = new Float32Array(storedArr);
    const result = compareFaces(newEncoding, storedEncodingFloat);

    res.json({
      success: true,
      match: result.match,
      distance: result.distance
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// endpoint face verification
// helper bersihin base64 prefix
function cleanBase64(base64String) {
  return base64String.replace(/^data:image\/\w+;base64,/, "");
}

app.post('/api/face/register', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { faceImage, imageData } = req.body;

    const rawImage = faceImage || imageData;
    if (!rawImage) {
      return res.status(400).json({ error: 'Face image is required' });
    }

    const cleanImg = cleanBase64(rawImage);

    // encode wajah
    const encoding = await encodeFace(cleanImg);
    if (!encoding) {
      return res.status(400).json({ error: 'No face detected in image' });
    }

    // biasa untuk disimpan di JSONB
    const encodingArray = Array.from(encoding);

    // nonaktifkan wajah lama
    await client.query(
      `UPDATE face_data SET is_active=false, updated_at=NOW() WHERE user_id=$1 AND is_active=true`,
      [userId]
    );

    // simpan wajah baru
    const result = await client.query(
        `INSERT INTO face_data (
        user_id, face_encoding, face_image_url, is_active, created_at, updated_at
        )
        VALUES ($1, $2::jsonb, $3, true, NOW(), NOW())
        RETURNING id`,
      [userId, JSON.stringify(encodingArray), cleanImg]
    );

    // update status user jadi verified
    await client.query(
      `UPDATE users SET face_verified=true, updated_at=NOW() WHERE id=$1`,
      [userId]
    );

    res.json({
      success: true,
      message: 'Face registered successfully',
      faceId: result.rows[0].id
    });

  } catch (err) {
    console.error("Face registration error:", err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ================================= Routes ATTENDANCE ================================= //

// endpoint absensi hari ini untuk user yang login (cek sudah checkin atau belum)
app.get("/api/attendance/today", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // ambil record absensi hari ini
    const result = await client.query(
      `SELECT *
       FROM attendance_records
       WHERE user_id = $1
       AND DATE(check_in_time) = CURRENT_DATE
       ORDER BY check_in_time DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json(null); // belum absen hari ini
    }

    const record = result.rows[0];

    return res.json({
      id: record.id,
      user_id: record.user_id,
      dateRaw: record.check_in_time ? new Date(record.check_in_time).toISOString() : null,
      date: formatDate(record.check_in_time),  // DD/MM/YYYY
      check_in_time: formatTime(record.check_in_time),   // HH:mm
      check_out_time: formatTime(record.check_out_time), // HH:mm
      working_hours: formatDuration(record.check_in_time, record.check_out_time), // HH:mm
      status: record.status || null,
    });
  } catch (err) {
    console.error("Error fetching today's attendance:", err);
    res.status(500).json({ error: "Failed to fetch today's attendance" });
  }
});

// endpoint attendance history (user sendiri)
app.get("/api/attendance/history", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT *
      FROM attendance_records
      WHERE user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND DATE(check_in_time) >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND DATE(check_in_time) <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ` ORDER BY check_in_time DESC`;

    const result = await client.query(query, params);

    const records = result.rows.map((record) => ({
      id: record.id,
      user_id: record.user_id,
      dateRaw: record.check_in_time ? new Date(record.check_in_time).toISOString() : null,
      date: formatDate(record.check_in_time),  // DD/MM/YYYY
      check_in_time: formatTime(record.check_in_time),   // HH:mm
      check_out_time: formatTime(record.check_out_time), // HH:mm
      working_hours: formatDuration(record.check_in_time, record.check_out_time), // HH:mm
      status: record.status || null,
    }));

    return res.json(records);
  } catch (err) {
    console.error("Error fetching attendance history:", err);
    res.status(500).json({ error: "Failed to fetch attendance history" });
  }
});

// endpoint attendance history (semua user, HR/admin only)
app.get('/api/attendance/all', authenticateToken, async (req, res) => {
  try {
    if (!['Admin', 'HR'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Admin/HR access required' });
    }

    const { startDate, endDate } = req.query;

    let query = `
      SELECT ar.id, ar.attendance_date, ar.check_in_time, ar.check_out_time, 
             ar.work_hours, ar.overtime_hours, ar.status,
             u.full_name, u.username, u.email
      FROM attendance_records ar
      JOIN users u ON ar.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      query += ` AND ar.attendance_date BETWEEN $1 AND $2`;
      params.push(startDate, endDate);
    } else if (startDate) {
      query += ` AND ar.attendance_date >= $1`;
      params.push(startDate);
    } else if (endDate) {
      query += ` AND ar.attendance_date <= $1`;
      params.push(endDate);
    }

    query += ` ORDER BY ar.attendance_date DESC`;

    const result = await client.query(query, params);

    const records = result.rows.map((record) => ({
       ...record,
      working_hours: formatDuration(record.check_in_time, record.check_out_time)
    }));

    return res.json(records);
  } catch (err) {
    console.error("Admin history fetch error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// endpoint attendances checkin
// helper untuk bersihin base64
function cleanBase64(base64String) {
  return base64String.replace(/^data:image\/\w+;base64,/, "");
}

app.post('/api/attendance/checkin', authenticateToken, async (req, res) => {
  try {
    console.log("Checkin API hit");
    const userId = req.user.userId;
    const now = new Date();
    //const today = now.toISOString().split('T')[0];
    const { faceImage, deviceInfo, latitude, longitude } = req.body;

    console.log("Body keys:", Object.keys(req.body));
    console.log("Lat:", latitude, "Lon:", longitude);
    console.log("FaceImage length:", faceImage?.length);

    if (!faceImage) {
      return res.status(400).json({ error: 'Face image is required' });
    }

    const cleanImg = cleanBase64(faceImage);
    //const imgBuffer = Buffer.from(cleanImg, "base64");
    console.log("Cleaned base64 length:", cleanImg.length);

    // encode wajah baru
    const newEncoding = await encodeFace(cleanImg);
    console.log("New face encoding generated:", !!newEncoding);

    if (!newEncoding) {
      return res.status(400).json({ error: 'No face detected in input image' });
    }

    // ambil face encoding tersimpan
    const faceRow = await client.query(
      `SELECT face_encoding FROM face_data 
       WHERE user_id=$1 AND is_active=true 
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    console.log("Face row fetched:", faceRow.rows.length);

    // bandingkan wajah
    const storedEncoding = parseEncoding(faceRow.rows[0].face_encoding);
    const compareRes = compareFaces(newEncoding, storedEncoding);
    console.log("Face compare result:", compareRes);

    if (!compareRes.match) {
      return res.status(401).json({ error: 'Face verification failed', confidence: compareRes.distance });
    }

    const existing = await client.query(
      `SELECT id FROM attendance_records 
      WHERE user_id=$1 AND attendance_date = CURRENT_DATE`,
      [userId]
    );

    console.log("Existing record count:", existing.rows.length);

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    const status = now.getHours() > 9 ? 'Late' : 'Present';

    const result = await client.query(
      `INSERT INTO attendance_records 
      (user_id, check_in_time, attendance_date, status, ip_address_check_in, 
      face_match_confidence_check_in, verified_check_in, device_info, 
      check_in_lat, check_in_lon, geolocation_verified_check_in, created_at, updated_at)
      VALUES ($1, NOW(), CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
      RETURNING id`,
      [userId, status, req.ip, compareRes.distance, true, deviceInfo || 'Unknown', latitude || null, longitude || null]
    );

    console.log("Insert success, recordId:", result.rows[0].id);

    return res.json({
      success: true,
      message: 'Check-in successful',
      recordId: result.rows[0].id,
      confidence: compareRes.distance
    });

  } catch (err) {
    console.error("Check-in error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
});


// endpoint attendance checkout
app.post('/api/attendance/checkout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const { faceImage, deviceInfo, latitude, longitude } = req.body;

    if (!faceImage) {
      return res.status(400).json({ error: 'Face image is required' });
    }

    // ambil face encoding dari DB
    const faceRow = await client.query(
      `SELECT face_encoding FROM face_data 
       WHERE user_id=$1 AND is_active=true 
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (faceRow.rows.length === 0) {
      return res.status(404).json({ error: 'No registered face found.' });
    }

    const storedEncoding = parseEncoding(faceRow.rows[0].face_encoding);

    // encode wajah baru
    const newEncoding = await encodeFace(faceImage);
    if (!newEncoding) {
      return res.status(400).json({ error: 'No face detected in input image' });
    }

    // bandingkan wajah
    const compareRes = compareFaces(newEncoding, storedEncoding);
    if (!compareRes.match) {
      return res.status(401).json({ error: 'Face verification failed on checkout', confidence: compareRes.distance });
    }

    // ambil record check-in hari ini
    const existing = await client.query(
      `SELECT id, check_in_time FROM attendance_records 
       WHERE user_id=$1 AND attendance_date=$2`,
      [userId, today]
    );

    if (existing.rows.length === 0) {
      return res.status(400).json({ error: 'No check-in record found for today' });
    }

    const recordId = existing.rows[0].id;
    const checkInTime = existing.rows[0].check_in_time ? new Date(existing.rows[0].check_in_time) : null;
    let workHours = null;
      if (checkInTime) {
        workHours = formatDuration(checkInTime, now);
      }

    await client.query(
      `UPDATE attendance_records
       SET check_out_time=$1,
           ip_address_check_out=$2,
           device_info_check_out=$3,
           face_match_confidence_check_out=$4,
           verified_check_out=$5,
           check_out_lat=$6,
           check_out_lon=$7,
           geolocation_verified_check_out=true,
           work_hours=$8,
           updated_at=NOW()
       WHERE id=$9`,
      [now, req.ip, deviceInfo || 'Unknown', compareRes.distance, true, latitude || null, longitude || null, workHours, recordId]
    );

    res.json({
      success: true,
      message: 'Check-out successful',
      workHours,
      confidence: compareRes.distance
    });

  } catch (err) {
    console.error("Check-out error:", err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// data riwayat kehadiran karyawan (Header HR)
app.get('/api/attendance/summary', authenticateToken, async (req, res) => {
  try {
    // Total employee
    const totalUsersRes = await client.query(`SELECT COUNT(*) FROM users WHERE is_approved = true`);
    const totalUsers = parseInt(totalUsersRes.rows[0].count, 10);

    // Present today
    const presentRes = await client.query(
      `SELECT COUNT(*) FROM attendance_records 
       WHERE attendance_date = CURRENT_DATE AND status = 'Present'`
    );
    const presentToday = parseInt(presentRes.rows[0].count, 10);

    // Late today
    const lateRes = await client.query(
      `SELECT COUNT(*) FROM attendance_records 
       WHERE attendance_date = CURRENT_DATE AND status = 'Late'`
    );
    const lateToday = parseInt(lateRes.rows[0].count, 10);

    // Absent today = total user - hadir (present+late)
    const absentToday = totalUsers - (presentToday + lateToday);

    return res.json({
      totalEmployees: totalUsers,
      presentToday,
      lateToday,
      absentToday
    });
  } catch (err) {
    console.error("Summary fetch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// endpoint remind absent employees (Admin/HR only)
app.post('/api/attendance/remind-absent', authenticateToken, async (req, res) => {
  try {
    if (!['Admin', 'HR'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Admin/HR access required' });
    }

    // Ambil karyawan yang belum absen hari ini
    const absentUsersRes = await client.query(`
      SELECT id, email, full_name
      FROM users
      WHERE is_approved = true
        AND is_active = true
        AND role = 'Karyawan'
        AND id NOT IN (
          SELECT user_id
          FROM attendance_records
          WHERE attendance_date = CURRENT_DATE
        )
    `);

    const absentUsers = absentUsersRes.rows;

    const results = await Promise.allSettled(absentUsers.map(async (user) => {
      try {
        await sendAttendanceReminder(user.email, user.full_name);
        return { email: user.email, status: 'sent' };
      } catch (emailErr) {
        console.error(`Failed to send email to ${user.email}:`, emailErr);
        return { email: user.email, status: 'failed', error: emailErr.message };
      }
    }));

    const responseDetails = results.map(r => r.value);

    res.json({
      success: true,
      totalReminded: responseDetails.filter(r => r.status === 'sent').length,
      details: responseDetails
    });
  } catch (err) {
    console.error("Remind absent error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// endpoint export to Excel
app.get('/api/attendance/export', authenticateToken, async (req, res) => {
  try {
    if (!['Admin', 'HR'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Admin/HR access required' });
    }

    const result = await client.query(`
      SELECT ar.attendance_date, ar.check_in_time, ar.check_out_time,
             ar.work_hours, ar.status,
             u.full_name
      FROM attendance_records ar
      JOIN users u ON ar.user_id = u.id
      ORDER BY ar.attendance_date DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance Records");

    // Header
    worksheet.columns = [
      { header: "Employee", key: "full_name", width: 25 },
      { header: "Date", key: "attendance_date", width: 15 },
      { header: "Check In", key: "check_in_time", width: 15 },
      { header: "Check Out", key: "check_out_time", width: 15 },
      { header: "Working Hours", key: "work_hours", width: 15 },
      { header: "Status", key: "status", width: 12 },
    ];

    // Isi data
    result.rows.forEach((row) => {
      worksheet.addRow({
        full_name: row.full_name,
        attendance_date: row.attendance_date ? new Date(row.attendance_date).toLocaleDateString("id-ID") : "-",
        check_in_time: row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-",
        check_out_time: row.check_out_time ? new Date(row.check_out_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-",
        work_hours: row.work_hours || "-",
        status: row.status,
      });
    });

    // Set response type
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=attendance_records.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export Excel error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

(async () => {
  try {
    await loadModels(); // pastikan model diload di awal
    app.listen(PORT, () => {
      console.log(`✅ Models loaded & server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error loading models:", err);
  }
})();
