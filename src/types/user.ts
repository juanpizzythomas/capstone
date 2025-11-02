
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  isApproved: boolean;
  faceVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'Karyawan' | 'HR' | 'IT' | 'Admin' | 'Super Admin';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  full_name?: string;
  username?: string;
  email?: string;

  // 🔹 tanggal yang sudah diformat di backend (DD/MM/YYYY)
  date: string;

  // 🔹 jam check-in / check-out (ISO string dari backend)
  check_in_time: string | null;
  check_out_time: string | null;
  working_hours: string | null; 

  // 🔹 status absensi (On Time, Late, dll)
  status: string | null;

  // 🔹 opsional, tambahan data dari backend
  face_match_confidence_check_in?: number | null;
  face_match_confidence_check_out?: number | null;
  verified_check_in?: boolean;
  verified_check_out?: boolean;
  check_in_lat?: number | null;
  check_in_lon?: number | null;
  check_out_lat?: number | null;
  check_out_lon?: number | null;
}


export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  fullName: string;
  password: string;
}

export interface faceRegisterData {
  user_id: string,
  face_encoding: string,
  face_image_url: string, // Dalam implementasi nyata, upload ke cloud storage
  confidence_score: any, // Simulasi confidence score
  is_active: boolean
}
