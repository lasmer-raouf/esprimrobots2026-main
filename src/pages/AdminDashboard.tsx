import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Home, Users, FolderKanban, Trophy, MessageSquare, Settings, Shield, Info, UserCircle } from 'lucide-react';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminMembers } from '@/components/admin/AdminMembers';
import { AdminProjects } from '@/components/admin/AdminProjects';
import { AdminCompetition } from '@/components/admin/AdminCompetition';
import { AdminChat } from '@/components/admin/AdminChat';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { AdminRoles } from '@/components/admin/AdminRoles';
import { AdminAbout } from '@/components/admin/AdminAbout';

export default function AdminDashboard() {
  const { user, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState('overview');

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user || !isAdmin) {
    navigate('/login');
    return null;
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-card border-r border-border p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-primary">Admin Panel</h2>
          <p className="text-sm text-muted-foreground">Administrator</p>
        </div>

        <nav className="space-y-2">
          <Button
            variant={currentPage === 'overview' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentPage('overview')}
          >
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant={currentPage === 'members' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentPage('members')}
          >
            <Users className="mr-2 h-4 w-4" />
            Members
          </Button>
          <Button
            variant={currentPage === 'projects' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentPage('projects')}
          >
            <FolderKanban className="mr-2 h-4 w-4" />
            Projects
          </Button>
          <Button
            variant={currentPage === 'competition' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentPage('competition')}
          >
            <Trophy className="mr-2 h-4 w-4" />
            Competition
          </Button>
          <Button
            variant={currentPage === 'chat' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentPage('chat')}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Member Chat
          </Button>
          <Button
            variant={currentPage === 'settings' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentPage('settings')}
          >
            <Settings className="mr-2 h-4 w-4" />
            Site Settings
          </Button>
          <Button
            variant={currentPage === 'roles' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentPage('roles')}
          >
            <Shield className="mr-2 h-4 w-4" />
            Role Management
          </Button>
          <Button
            variant={currentPage === 'about' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentPage('about')}
          >
            <Info className="mr-2 h-4 w-4" />
            About Us Page
          </Button>
        </nav>

        <div className="pt-6 border-t border-border space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate('/member')}
          >
            <UserCircle className="mr-2 h-4 w-4" />
            Member View
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate('/')}
          >
            <Home className="mr-2 h-4 w-4" />
            Home Page
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-8 bg-background">
        {currentPage === 'overview' && <AdminOverview />}
        {currentPage === 'members' && <AdminMembers />}
        {currentPage === 'projects' && <AdminProjects />}
        {currentPage === 'competition' && <AdminCompetition />}
        {currentPage === 'chat' && <AdminChat />}
        {currentPage === 'settings' && <AdminSettings />}
        {currentPage === 'roles' && <AdminRoles />}
        {currentPage === 'about' && <AdminAbout />}
      </main>
    </div>
  );
}
