import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminOverview } from '@/components/AdminOverview';
import { UsersPanel } from '@/components/UsersPanel';
import { DogsPanel } from '@/components/DogsPanel';
import { TrailsPanel } from '@/components/TrailsPanel';
import { AdminMapPanel } from '@/components/AdminMapPanel';

const Index = () => {
  const { isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState('overview');

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return <AdminOverview onViewChange={setActiveView} />;
      case 'users':
        return <UsersPanel />;
      case 'dogs':
        return <DogsPanel />;
      case 'trails':
        return <TrailsPanel />;
      case 'map':
        return <AdminMapPanel />;
      default:
        return <AdminOverview />;
    }
  };

  const getTitle = () => {
    const titles: Record<string, { title: string; subtitle: string }> = {
      overview: { title: 'Dashboard', subtitle: 'Overview of your data' },
      users: { title: 'Users', subtitle: 'Manage user accounts' },
      dogs: { title: 'Dogs', subtitle: 'View and edit dog profiles' },
      trails: { title: 'Trails', subtitle: 'Manage recorded trails' },
      map: { title: 'Map', subtitle: 'Visualize trail data' },
    };
    return titles[activeView] || titles.overview;
  };

  const { title, subtitle } = getTitle();

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar activeView={activeView} onViewChange={setActiveView} />
      
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-6 py-4">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </header>
        
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Index;
