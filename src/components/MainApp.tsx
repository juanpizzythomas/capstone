
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Sidebar from './layout/Sidebar';
import Dashboard from './dashboard/Dashboard';
import ProfilePage from './profile/ProfilePage';
import AttendanceHistory from './attendance/AttendanceHistory';
import AccessManagement from './management/AccessManagement';
import RoleManagement from './management/RoleManagement';
import EmployeeAttendance from './attendance/EmployeeAttendance';

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'profile':
        return <ProfilePage />;
      case 'attendance-history':
        return <AttendanceHistory />;
      case 'access-management':
        return <AccessManagement />;
      case 'role-management':
        return <RoleManagement />;
      case 'employee-attendance':
        return <EmployeeAttendance />;
      default:
        return <Dashboard />;
    }
  };

  if (!user?.isApproved) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Account Pending Approval</h1>
          <p className="text-gray-600 mb-4">
            Your account is waiting for approval from HR. You will be notified once your account is activated.
          </p>
          <p className="text-sm text-gray-500">
            Contact HR if you have any questions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
};

export default MainApp;
