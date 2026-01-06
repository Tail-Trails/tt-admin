import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAdminData, updateAdminData, deleteAdminData } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface User {
  id: string;
  email: string;
  created_at: string;
  [key: string]: unknown;
}

export function UsersPanel() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = async () => {
    if (!token) return;
    setIsLoading(true);
    const result = await fetchAdminData<User[]>('/admin/users', token);
    if (result.data) {
      setUsers(result.data);
    } else if (result.error) {
      toast.error(result.error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, [token]);

  const handleUpdate = async (id: string, data: Partial<User>) => {
    if (!token) return;
  const result = await updateAdminData(`/admin/users/${id}`, data, token);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('User updated');
      loadUsers();
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    const result = await deleteAdminData(`/admin/users/${id}`, token);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('User deleted');
      loadUsers();
    }
  };

  const columns = [
    { key: 'id' as const, label: 'ID' },
    { key: 'email' as const, label: 'Email', editable: true },
    { key: 'created_at' as const, label: 'Created' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">{users.length} total users</p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadUsers}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <DataTable
        data={users}
        columns={columns}
        idKey="id"
        isLoading={isLoading}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
