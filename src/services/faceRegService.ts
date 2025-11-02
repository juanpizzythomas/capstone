
import apiClient from '@/lib/api';
import { AttendanceRecord, faceRegisterData } from '@/types/user';

export interface CheckInResponse {
  success: boolean;
  message: string;
}

export interface CheckOutResponse {
  success: boolean;
  message: string;
  workHours?: number;
}

export const faceRecogService = {
  faceRegister: async (payload: {
    user_id: string;
    face_image_url: string;  // ini masih dipakai di komponen
    confidence_score?: number;
    is_active?: boolean;
  }) => {
    try {
      const response = await apiClient.post("/face/register", {
        faceImage: payload.face_image_url, // 👈 backend expect "faceImage"
      });
      return response.data;
    } catch (err: any) {
      console.error("Face registration error:", err);
      return {
        success: false,
        error: err.response?.data?.message || err.message,
      };
    }
  },
};
