import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { PublicHeader } from '@/components/PublicHeader';
import { supabase } from '@/integrations/supabase/client';

type Robot = {
  id: number;
  name: string;
  description: string;
  slots: number;
  created_at: string;
  signups: Array<{ id: number; user_id: string }>;
};

export default function Competition() {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load robots and their signups
  const loadRobots = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) fetch robots
      const { data: robotsData, error: robotsError } = await supabase
        .from('competition_robots')
        .select('id, name, description, slots, created_at')
        .order('created_at', { ascending: false });

      if (robotsError) throw robotsError;
      if (!robotsData) {
        setRobots([]);
        return;
      }

      const robotIds = robotsData.map((r) => r.id);

      // 2) fetch signups for these robots
      const { data: signupsData, error: signupsError } = await supabase
        .from('competition_signups')
        .select('id, robot_id, user_id')
        .in('robot_id', robotIds);

      if (signupsError) console.error('Signups load error:', signupsError);

      const signupsByRobot = (signupsData ?? []).reduce((acc, s) => {
        if (!acc[s.robot_id]) acc[s.robot_id] = [];
        acc[s.robot_id].push(s);
        return acc;
      }, {} as Record<number, Array<{ id: number; user_id: string }>>);

      const merged = robotsData.map((r) => ({
        ...r,
        signups: signupsByRobot[r.id] ?? [],
      }));

      setRobots(merged);
    } catch (err: any) {
      console.error('Error loading robots:', err);
      setError(err.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    loadRobots();
  }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('competition_robots_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'competition_robots' },
        (payload) => {
          console.log('Robot realtime change:', payload);
          loadRobots();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'competition_signups' },
        (payload) => {
          console.log('Signup realtime change:', payload);
          loadRobots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Competition Robots</h1>
          <p className="text-lg text-muted-foreground">
            Join our competition teams and showcase your skills
          </p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <p>Loading competition robots…</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-600">
            <p>Failed to load competition robots: {error}</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-slide-in">
          {robots.map((robot) => {
            const availableSlots = Math.max(0, robot.slots - robot.signups.length);
            const isFull = availableSlots === 0;

            return (
              <Card key={robot.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between w-full">
                    <CardTitle className="text-2xl">{robot.name}</CardTitle>
                    {isFull ? (
                      <Badge variant="destructive">Full</Badge>
                    ) : (
                      <Badge variant="secondary">{availableSlots} slots available</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{robot.description}</p>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{robot.signups.length}</span>
                        <span className="text-muted-foreground">/ {robot.slots}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Team Members</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{availableSlots}</div>
                      <p className="text-sm text-muted-foreground">Places Left</p>
                    </div>
                  </div>

                  {!isFull && (
                    <p className="text-sm text-muted-foreground italic">
                      Login as a member to sign up for this team
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!loading && robots.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No competition robots available at the moment
          </div>
        )}
      </main>
    </div>
  );
}
