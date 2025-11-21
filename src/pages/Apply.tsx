import { PublicHeader } from '@/components/PublicHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

type FormData = {
  name: string;
  email: string;
  password: string;
  major: string;
  reason: string;
};

export default function Apply() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    major: '',
    reason: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password: string) => password.length >= 6;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { name, email, password, major, reason } = formData;

    if (!name.trim() || !email.trim() || !password.trim() || !major.trim() || !reason.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please provide a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    if (!validatePassword(password)) {
      toast({
        title: 'Weak password',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        major: major.trim(),
        reason: reason.trim(),
      };

      const signupMeta = {
        name: payload.name,
        major: payload.major,
        application_major: payload.major,
        application_reason: payload.reason,
        application_notes: payload.reason,
        reason: payload.reason,
      };

      // sign up user (v2-style). cast to any for tolerance across client versions
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: payload.email,
        password,
        options: { data: signupMeta },
      } as any);

      if (signUpError) {
        console.error('SignUp error:', signUpError);
        if (/already registered|duplicate|user exists/i.test(signUpError.message || '')) {
          toast({
            title: 'Email already in use',
            description:
              'This email is already registered. If this is you, please sign in or use password reset.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Sign up failed',
            description: signUpError.message ?? 'Failed to create account.',
            variant: 'destructive',
          });
        }
        setSubmitting(false);
        return;
      }

      // Normalize signUp response for user & session extraction
      let user: any = null;
      let session: any = null;

      if ((signUpData as any)?.user) {
        user = (signUpData as any).user;
      } else if ((signUpData as any)?.data?.user) {
        user = (signUpData as any).data.user;
      } else if ((signUpData as any)?.data) {
        user = (signUpData as any).data;
      } else {
        user = signUpData as any;
      }

      // try to find session in signUpData as well (some client versions return it)
      session = (signUpData as any)?.session ?? (signUpData as any)?.data?.session ?? null;

      // as fallback, ask supabase client for current session
      try {
        const sessionResp = await supabase.auth.getSession();
        if (sessionResp?.data?.session) {
          session = sessionResp.data.session;
        }
      } catch (e) {
        // ignore — we'll handle absence of session below
      }

      // Try to get user id (some flows return user, others require getUser)
      const userId =
        user?.id ?? (await supabase.auth.getUser()).data?.user?.id ?? null;

      // If there's no userId, inform the user and exit
      if (!userId) {
        toast({
          title: 'Application received — verify your email',
          description:
            'We created an account for you. Please check your email and confirm the address to complete your application.',
        });
        setSubmitting(false);
        navigate('/');
        return;
      }

      // If no active session, **do not** attempt protected DB writes from the client
      // (they will fail due to RLS / anon user). Rely on the DB trigger to create profile.
      if (!session) {
        toast({
          title: 'Verify your email',
          description:
            'We created an account for you. Please confirm your email address — once confirmed your profile will be finalized and you can sign in.',
        });
        setSubmitting(false);
        navigate('/');
        return;
      }

      // From here: there's an active session (user is signed in). Safe to call protected endpoints.

      // Upsert profile so major & application_reason appear immediately in UI
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            name: payload.name,
            email: payload.email,
            major: payload.major,
            application_status: 'pending',
            application_notes: payload.reason,
            application_reason: payload.reason,
            application_submitted_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (upsertError) {
        // not fatal - log and continue
        console.warn('Profile upsert error (non-fatal):', upsertError);
      }

      // Assign member role using upsert (avoid duplicates)
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert(
          [
            {
              user_id: userId,
              role: 'member',
            },
          ],
          { onConflict: 'user_id,role' }
        );

      if (roleError) {
        console.error('Role assignment error:', roleError);
        toast({
          title: 'Role assignment failed',
          description:
            roleError.message ?? 'We could not assign the member role. An admin can assign it later.',
          variant: 'destructive',
        });
        // continue — application stored.
      }

      toast({
        title: 'Application Submitted!',
        description:
          'Your account was created and your application was submitted. We will review it shortly.',
      });

      setSubmitting(false);
      navigate('/');
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: 'Unexpected error',
        description: 'An unexpected error occurred. Please try again later.',
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  const update = (key: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">Apply to Join</h1>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Become part of our innovative robotics community
          </p>

          <Card>
            <CardHeader>
              <CardTitle>Membership Application</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6" aria-live="polite">
                
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="John Doe"
                    required
                    aria-required="true"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="john@example.com"
                    required
                    aria-required="true"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder="Create a password (min 6 characters)"
                    required
                    aria-required="true"
                    minLength={6}
                  />
                </div>

                <div>
                  <Label htmlFor="major">Major / Field of Study</Label>
                  <Input
                    id="major"
                    value={formData.major}
                    onChange={(e) => update('major', e.target.value)}
                    placeholder="Robotics Engineering"
                    required
                    aria-required="true"
                  />
                </div>

                <div>
                  <Label htmlFor="reason">Why do you want to join ESPRIM ROBOTS?</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => update('reason', e.target.value)}
                    placeholder="Tell us about your interest in robotics..."
                    rows={5}
                    required
                    aria-required="true"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={submitting}
                  aria-disabled={submitting}
                >
                  {submitting ? 'Submitting…' : 'Submit Application'}
                </Button>

              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
