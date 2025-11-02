export interface Employee {
  id: string;
  name: string;
  email: string;
  employee_id: string;
  face_descriptor?: Float32Array;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  check_in_time?: string;
  check_out_time?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  face_match_confidence?: number;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface FaceDetectionResult {
  detection: any;
  descriptor: Float32Array;
  confidence: number;
}

export type AttendanceStatus = 'checked_in' | 'checked_out' | 'none';

export interface AttendanceStats {
  total_employees: number;
  present_today: number;
  late_today: number;
  absent_today: number;
}