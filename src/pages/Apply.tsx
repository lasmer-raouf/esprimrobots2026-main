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
  major: string;
  reason: string;
};

export default function Apply() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    major: '',
    reason: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { name, email, major, reason } = formData;

    if (!name.trim() || !email.trim() || !major.trim() || !reason.trim()) {
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

    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        major: major.trim(),
        reason: reason.trim(),
      };

      const { data, error } = await supabase
        .from('pending_members')
        .insert([payload])
        .select('id')
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        toast({
          title: 'Submission failed',
          description: error.message ?? 'Failed to submit your application.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Application Submitted!',
        description: 'We received your application and will review it shortly.',
      });

      setTimeout(() => navigate('/'), 900);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: 'Unexpected error',
        description: 'An unexpected error occurred. Please try again later.',
        variant: 'destructive',
      });
    } finally {
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
