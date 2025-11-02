
import apiClient from '@/lib/api';
import { User, LoginCredentials, RegisterData } from '@/types/user';

export interface LoginResponse {
  user: User;
  token: string;
}

export const userService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  async register(data: RegisterData): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  async getPendingUsers(): Promise<User[]> {
    const response = await apiClient.get('/users/pending');
    return response.data;
  },

  async approveUser(userId: string): Promise<{ success: boolean }> {
    const response = await apiClient.put(`/users/${userId}/approve`);
    return response.data;
  },

  async rejectUser(userId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/users/${userId}/reject`);
    return response.data;
  },

  async getAllUsers(): Promise<User[]> {
    const response = await apiClient.get('/users');
    return response.data;
  },

  async updateUserRole(userId: string, role: string): Promise<{ success: boolean }> {
    const response = await apiClient.put(`/users/${userId}/role`, { role });
    return response.data;
  }
};
