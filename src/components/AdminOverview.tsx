import { useEffect, useState } from 'react';
import { Users, Dog, Route, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAdminData } from '@/lib/api';

interface Stats {
  users: number;
  dogs: number;
  trails: number;
}

export function AdminOverview({ onViewChange }: { onViewChange?: (view: string) => void }) {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats>({ users: 0, dogs: 0, trails: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!token) return;
      
      setIsLoading(true);
      
      const [usersRes, dogsRes, trailsRes] = await Promise.all([
        fetchAdminData<unknown[]>('/admin/users', token),
        fetchAdminData<unknown[]>('/admin/dogs', token),
        fetchAdminData<unknown[]>('/admin/trails', token),
      ]);

      setStats({
        users: Array.isArray(usersRes.data) ? usersRes.data.length : 0,
        dogs: Array.isArray(dogsRes.data) ? dogsRes.data.length : 0,
        trails: Array.isArray(trailsRes.data) ? trailsRes.data.length : 0,
      });
      
      setIsLoading(false);
    }
    
    loadStats();
  }, [token]);

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: Users, color: 'text-info' },
    { label: 'Registered Dogs', value: stats.dogs, icon: Dog, color: 'text-warning' },
    { label: 'Trails Created', value: stats.trails, icon: Route, color: 'text-success' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-panel rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-secondary ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel rounded-xl p-6">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction icon={Users} label="View Users" onClick={() => onViewChange?.('users')} />
          <QuickAction icon={Dog} label="View Dogs" onClick={() => onViewChange?.('dogs')} />
          <QuickAction icon={Route} label="View Trails" onClick={() => onViewChange?.('trails')} />
          <QuickAction icon={MapPin} label="Open Map" onClick={() => onViewChange?.('map')} />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Users; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors text-sm">
      <Icon className="w-4 h-4 text-primary" />
      <span>{label}</span>
    </button>
  );
}
