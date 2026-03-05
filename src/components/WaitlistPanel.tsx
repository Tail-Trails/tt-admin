import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAdminData, createAdminData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface WaitlistItem {
  id?: string;
  name: string;
  email: string;
  createdAt?: string;
}

export function WaitlistPanel() {
  const { token } = useAuth();
  const [items, setItems] = useState<WaitlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    if (!token) return;
    setIsLoading(true);
    // try common admin endpoints then fallback to public /waitlist
    const candidates = ['/admin/waitlist', '/admin/waitlists', '/waitlist'];
    for (const ep of candidates) {
      const res = await fetchAdminData<WaitlistItem[]>(ep, token);
      if (res.data) {
        setItems(res.data);
        setIsLoading(false);
        return;
      }
    }
    setIsLoading(false);
    toast.error('Could not load waitlist (no endpoint)');
  };

  useEffect(() => { load(); }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return toast.error('Name and email are required');
    setIsSubmitting(true);
    try {
      const result = await createAdminData('/waitlist', { name: name.trim(), email: email.trim() }, token);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Added to waitlist');
        setName('');
        setEmail('');
        load();
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Waitlist</h2>
          <p className="text-sm text-muted-foreground">{items.length} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it, idx) => (
              <TableRow key={it.id ?? idx}>
                <TableCell>{it.name}</TableCell>
                <TableCell>{it.email}</TableCell>
                <TableCell>{it.createdAt ? new Date(it.createdAt).toLocaleString() : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default WaitlistPanel;
