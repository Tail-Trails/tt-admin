import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAdminData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Feedback {
  id: string;
  message: string;
  createdAt: string;
  user?: Record<string, unknown> | null;
  userDisplay?: string;
}

export function FeedbackPanel() {
  const { token } = useAuth();
  const [items, setItems] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    if (!token) return;
    setIsLoading(true);
    const res = await fetchAdminData<Feedback[]>('/admin/feedback', token);
    if (res.error) {
      toast.error(res.error);
    } else if (res.data) {
      const mapped = res.data.map((it) => {
        const user = it.user as any;
        const name = user?.name ?? '-';
        const email = user?.email ?? '-';
        const img = user?.image ?? '';
        const userDisplay = img ? `${name} <${email}> — ${img}` : `${name} <${email}>`;
        return { ...it, userDisplay };
      });
      setItems(mapped);
    }
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [token]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Feedback</h2>
          <p className="text-sm text-muted-foreground">{items.length} feedback entries</p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">Loading…</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => {
              const user = it.user as any;
              const name = user?.name ?? '-';
              const email = user?.email ?? '-';
              const img = user?.image ?? '';
              const initials = name.split(' ').map((s: string) => s[0]).join('').slice(0,2).toUpperCase();
              return (
                <TableRow key={it.id}>
                  <TableCell className="w-48">{it.id}</TableCell>
                  <TableCell>{it.message}</TableCell>
                  <TableCell>{new Date(it.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        {img ? (
                          <AvatarImage src={String(img)} alt={name} />
                        ) : (
                          <AvatarFallback>{initials}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex flex-col">
                        <div className="font-medium">{name}</div>
                        <div className="text-sm text-muted-foreground">{email}</div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default FeedbackPanel;
