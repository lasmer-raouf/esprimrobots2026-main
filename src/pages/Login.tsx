import { PublicHeader } from '@/components/PublicHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const { signIn, user, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);

  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/member');
      }
    }
  }, [user, isAdmin, loading, navigate]);

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberLoading(true);

    const { error } = await signIn(memberEmail, memberPassword);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive',
      });
      setMemberLoading(false);
    } else {
      toast({
        title: 'Welcome back!',
        description: 'Successfully logged in as member',
      });
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);

    const { error } = await signIn(adminEmail, adminPassword);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive',
      });
      setAdminLoading(false);
    } else {
      toast({
        title: 'Verifying admin access...',
        description: 'Logging you in',
      });
    }
  };

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <main className="container mx-auto px-4 py-8 sm:py-16">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">Member Portal</CardTitle>
              <CardDescription className="text-sm">
                Sign in to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="member" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-auto">
                  <TabsTrigger value="member" className="text-xs sm:text-sm py-2">
                    Member
                  </TabsTrigger>
                  <TabsTrigger value="admin" className="text-xs sm:text-sm py-2">
                    Admin
                  </TabsTrigger>
                </TabsList>

                {/* MEMBER LOGIN */}
                <TabsContent value="member">
                  <form onSubmit={handleMemberLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="member-email">Email</Label>
                      <Input
                        id="member-email"
                        type="email"
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="member-password">Password</Label>
                        <Link
                          to="/reset-password"
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot Password?
                        </Link>
                      </div>
                      <Input
                        id="member-password"
                        type="password"
                        value={memberPassword}
                        onChange={(e) => setMemberPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={memberLoading}>
                      {memberLoading ? 'Signing in...' : 'Sign In as Member'}
                    </Button>
                  </form>
                </TabsContent>

                {/* ADMIN LOGIN */}
                <TabsContent value="admin">
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="admin-email">Admin Email</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@email.com"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="admin-password">Admin Password</Label>
                        <Link
                          to="/reset-password"
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot Password?
                        </Link>
                      </div>
                      <Input
                        id="admin-password"
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={adminLoading}>
                      {adminLoading ? 'Signing in...' : 'Sign In as Admin'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
