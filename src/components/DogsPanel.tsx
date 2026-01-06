import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAdminData, updateAdminData, deleteAdminData } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Dog {
  id: string;
  name: string;
  breed: string;
  owner_id: string;
  created_at: string;
  [key: string]: unknown;
}

export function DogsPanel() {
  const { token } = useAuth();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDogs = async () => {
    if (!token) return;
    setIsLoading(true);
    const result = await fetchAdminData<Dog[]>('/admin/dogs', token);
    if (result.data) {
      setDogs(result.data);
    } else if (result.error) {
      toast.error(result.error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDogs();
  }, [token]);

  const handleUpdate = async (id: string, data: Partial<Dog>) => {
    if (!token) return;
  const result = await updateAdminData(`/admin/dogs/${id}`, data, token);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Dog updated');
      loadDogs();
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    const result = await deleteAdminData(`/admin/dogs/${id}`, token);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Dog deleted');
      loadDogs();
    }
  };

  const columns = [
    { key: 'id' as const, label: 'ID' },
    { key: 'name' as const, label: 'Name', editable: true },
    { key: 'breed' as const, label: 'Breed', editable: true },
    { key: 'owner_id' as const, label: 'Owner ID' },
    { key: 'created_at' as const, label: 'Created' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dogs</h2>
          <p className="text-sm text-muted-foreground">{dogs.length} registered dogs</p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadDogs}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <DataTable
        data={dogs}
        columns={columns}
        idKey="id"
        isLoading={isLoading}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
