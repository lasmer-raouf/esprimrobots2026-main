import { useState, useEffect } from 'react';
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
  const [currentPage, setCurrentPage] = useState<'overview' | 'groups' | 'competition' | 'chat'>(
    'overview'
  );
  const [signingOut, setSigningOut] = useState(false);

  // Redirect to login if we finished loading and there's no user
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [loading, user, navigate]);

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Sign out error', err);
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) return null;

  // Show pending approval screen for non-approved users
  if (!isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground">
              Your application is pending review. Once approved you'll be able to access your member
              dashboard and community features.
            </p>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleLogout}
                className="w-full"
                disabled={signingOut}
                aria-label="Logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full"
                aria-label="Return to Home"
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

  // Determine pending status. Replace if your app uses a different field for pending.
  const isPending = profile?.application_status === 'pending';

  // If user becomes pending while on a disabled page, force them back to overview.
  useEffect(() => {
    if (isPending && (currentPage === 'groups' || currentPage === 'competition' || currentPage === 'chat')) {
      setCurrentPage('overview');
    }
  }, [isPending, currentPage]);

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="w-64 bg-card border-r border-border p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-1">{profile?.name ?? 'Member'}</h2>
          <p className="text-sm text-muted-foreground">{profile?.major ?? 'Club Member'}</p>
        </div>

        <nav className="space-y-2">
          <Button
            variant={currentPage === 'overview' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentPage('overview')}
            aria-pressed={currentPage === 'overview'}
            aria-label="Dashboard"
          >
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>

          <Button
            variant={currentPage === 'groups' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              if (!isPending) setCurrentPage('groups');
            }}
            aria-pressed={currentPage === 'groups'}
            aria-label="Groups and Tasks"
            disabled={isPending}
            aria-disabled={isPending}
            title={isPending ? 'Disabled while your account is pending' : undefined}
          >
            <Users className="mr-2 h-4 w-4" />
            Groups & Tasks
          </Button>

          <Button
            variant={currentPage === 'competition' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              if (!isPending) setCurrentPage('competition');
            }}
            aria-pressed={currentPage === 'competition'}
            aria-label="Competition"
            disabled={isPending}
            aria-disabled={isPending}
            title={isPending ? 'Disabled while your account is pending' : undefined}
          >
            <Trophy className="mr-2 h-4 w-4" />
            Competition
          </Button>

          <Button
            variant={currentPage === 'chat' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              if (!isPending) setCurrentPage('chat');
            }}
            aria-pressed={currentPage === 'chat'}
            aria-label="Chat with Admin"
            disabled={isPending}
            aria-disabled={isPending}
            title={isPending ? 'Disabled while your account is pending' : undefined}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat with Admin
          </Button>
        </nav>

        {isPending && (
          <div className="text-sm text-muted-foreground">
            Your account is currently pending — Groups, Competition and Chat are disabled until approval.
          </div>
        )}

        <div className="pt-6 border-t border-border space-y-2">
          {isAdmin && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/admin')}
              aria-label="Admin Panel"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin Panel
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate('/')}
            aria-label="Go to Home"
          >
            <Home className="mr-2 h-4 w-4" />
            Home Page
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
            disabled={signingOut}
            aria-label="Logout"
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
