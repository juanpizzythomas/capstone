
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, UserX } from 'lucide-react';
import { userService } from '@/services/userService';
import { User } from '@/types/user';

const AccessManagement: React.FC = () => {
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      const users = await userService.getPendingUsers();
      setPendingUsers(users);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load pending users",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId: string, userName: string) => {
    try {
      await userService.approveUser(userId);
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      toast({
        title: "User Approved",
        description: `${userName} has been approved and can now login.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (userId: string, userName: string) => {
    try {
      await userService.rejectUser(userId);
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      toast({
        title: "User Rejected",
        description: `${userName}'s registration has been rejected.`,
        variant: "destructive"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject user",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading pending users...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Access Management</h1>
        <p className="text-gray-600 mt-1">Review and approve new user registrations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pending Approvals</span>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              {pendingUsers.length} Pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Approvals</h3>
              <p className="text-gray-600">All user registrations have been processed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div key={user.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{user.fullName}</h3>
                          <p className="text-sm text-gray-600">@{user.username}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{user.role}</Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            Requested: {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => handleApprove(user.id, user.fullName)}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(user.id, user.fullName)}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">Approval Guidelines:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Verify that the email domain matches company policy</li>
          <li>• Ensure the full name matches HR records</li>
          <li>• Check for duplicate registrations</li>
          <li>• Approved users will receive login credentials via email</li>
        </ul>
      </div>
    </div>
  );
};

export default AccessManagement;
