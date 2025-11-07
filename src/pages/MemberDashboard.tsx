import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Home, Users, Trophy, MessageSquare, ShieldCheck } from 'lucide-react';
import { MemberOverview } from '@/components/member/MemberOverview';
import { MemberGroupsTasks } from '@/components/member/MemberGroupsTasks';
import { MemberCompetition } from '@/components/member/MemberCompetition';
import { MemberChat } from '@/components/member/MemberChat';
import { ApplicationStatus } from '@/components/member/ApplicationStatus';

export default function MemberDashboard() {
  const { user, profile, isApproved, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState('overview');

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  if (!isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground">
              Wait until your application gets approved and become one of us then you can connect to your space
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleLogout}
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full"
              >
                <Home className="mr-2 h-4 w-4" />
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-card border-r border-border p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-2">{profile?.name || 'Member'}</h2>
          <p className="text-sm text-muted-foreground">{profile?.major || 'Club Member'}</p>
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
            variant={currentPage === 'groups' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentPage('groups')}
          >
            <Users className="mr-2 h-4 w-4" />
            Groups & Tasks
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
            Chat with Admin
          </Button>
        </nav>

        <div className="pt-6 border-t border-border space-y-2">
          {isAdmin && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/admin')}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin Panel
            </Button>
          )}
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

      <main className="flex-1 p-8">
        <ApplicationStatus />
        {currentPage === 'overview' && <MemberOverview />}
        {currentPage === 'groups' && <MemberGroupsTasks />}
        {currentPage === 'competition' && <MemberCompetition />}
        {currentPage === 'chat' && <MemberChat />}
      </main>
    </div>
  );
}
