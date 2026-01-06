import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAdminData, updateAdminData, deleteAdminData } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Trail {
  id: string;
  name: string;
  distance: number;
  duration: number;
  user_id: string;
  created_at: string;
  [key: string]: unknown;
}

export function TrailsPanel() {
  const { token } = useAuth();
  const [trails, setTrails] = useState<Trail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTrails = async () => {
    if (!token) return;
    setIsLoading(true);
    const result = await fetchAdminData<Trail[]>('/admin/trails', token);
    if (result.data) {
      setTrails(result.data);
    } else if (result.error) {
      toast.error(result.error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadTrails();
  }, [token]);

  const handleUpdate = async (id: string, data: Partial<Trail>) => {
    if (!token) return;
  const result = await updateAdminData(`/admin/trails/${id}`, data, token);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Trail updated');
      loadTrails();
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    const result = await deleteAdminData(`/admin/trails/${id}`, token);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Trail deleted');
      loadTrails();
    }
  };

  const columns = [
    { key: 'id' as const, label: 'ID' },
    { key: 'name' as const, label: 'Name', editable: true },
    { key: 'distance' as const, label: 'Distance (m)' },
    { key: 'duration' as const, label: 'Duration (s)' },
    { key: 'user_id' as const, label: 'User ID' },
    { key: 'created_at' as const, label: 'Created' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Trails</h2>
          <p className="text-sm text-muted-foreground">{trails.length} trails recorded</p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadTrails}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <DataTable
        data={trails}
        columns={columns}
        idKey="id"
        isLoading={isLoading}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
