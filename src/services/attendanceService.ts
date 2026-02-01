import apiClient from '@/lib/api';
import { AttendanceRecord } from '@/types/user';

export interface CheckInResponse {
  success: boolean;
  message: string;
}

export interface CheckOutResponse {
  success: boolean;
  message: string;
  workHours?: number;
}

export const attendanceService = {
  // 🔹 Check-in dengan face recognition
  // 🔹 Check-in langsung (biar backend yang handle face verify + geofence)
checkIn: async (imageData: string, latitude: number, longitude: number, deviceInfo?: string) => {
  try {
    const appRes = await apiClient.post("/attendance/checkin", {
      faceImage: imageData,
      latitude,
      longitude,
      deviceInfo: deviceInfo || navigator.userAgent,
    });

    console.log("✅ API response received:", appRes.data);
    return appRes.data;
  } catch (err: any) {
    console.error("❌ Check-in axios error:", err);
    return {
      success: false,
      error: err.response?.data?.error || err.message,
    };
  }
},


// 🔹 Check-out langsung (juga kirim wajah + lokasi)
checkOut: async (imageData: string, latitude: number, longitude: number, deviceInfo?: string) => {
  try {
    const response = await apiClient.post('/attendance/checkout', {
      faceImage: imageData,
      latitude,
      longitude,
      deviceInfo: deviceInfo || navigator.userAgent,
    });
    return response.data;
  } catch (err: any) {
    console.error("Check-out error:", err);
    return {
      success: false,
      error: err.response?.data?.error || err.message,
    };
  }
},

  // 🔹 Ambil data absensi hari ini
  async getTodayAttendance(): Promise<AttendanceRecord | null> {
    const response = await apiClient.get('/attendance/today');
    return response.data;
  },

  // 🔹 Ambil riwayat absensi
  async getAttendanceHistory(startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get(`/attendance/history?${params.toString()}`);
    return response.data;
  },

  async getAllAttendance(startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await apiClient.get(`/attendance/all?${params.toString()}`);

  // 🔹 Mapping backend → frontend
  return response.data.map((r: any) => ({
    id: r.id,
    user_id: r.full_name, // atau pakai r.email / r.full_name sesuai kebutuhan search
    full_name: r.full_name,
    username: r.username,
    email: r.email,
    dateRaw: r.attendance_date,
    date: r.attendance_date,
    check_in_time: r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null,
    check_out_time: r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null,
    working_hours: r.work_hours,
    status: r.status
  }));
},

async getSummary() {
  const response = await apiClient.get('/attendance/summary');
  return response.data;
},

  async exportAttendance() {
    const res = await apiClient.get('/attendance/export', {
      responseType: 'blob', // supaya file binary bisa didownload
    });
    return res.data;
  },

  async sendReminders() {
    const response = await apiClient.post('/attendance/remind-absent');
    return response.data;
  },

  // 🔹 Ambil riwayat absensi per user
  async getUserAttendanceHistory(userId: string, startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get(`/attendance/user/${userId}?${params.toString()}`);
    return response.data;
  }
};

