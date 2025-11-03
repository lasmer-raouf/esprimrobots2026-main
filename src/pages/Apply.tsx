import { PublicHeader } from '@/components/PublicHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { clubDB, saveDatabase } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function Apply() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    major: '',
    reason: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.major || !formData.reason) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    const newId = clubDB.pendingMembers.length > 0 
      ? Math.max(...clubDB.pendingMembers.map(m => m.id)) + 1 
      : 1;

    clubDB.pendingMembers.push({
      id: newId,
      ...formData,
    });

    saveDatabase();

    toast({
      title: 'Application Submitted!',
      description: 'We will review your application and get back to you soon.',
    });

    setTimeout(() => navigate('/'), 2000);
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
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="major">Major / Field of Study</Label>
                  <Input
                    id="major"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    placeholder="Robotics Engineering"
                  />
                </div>

                <div>
                  <Label htmlFor="reason">Why do you want to join ESPRIM ROBOTS?</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Tell us about your interest in robotics..."
                    rows={5}
                  />
                </div>

                <Button type="submit" className="w-full" size="lg">
                  Submit Application
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
