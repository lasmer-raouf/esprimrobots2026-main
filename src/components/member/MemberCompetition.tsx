import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Trophy, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CompetitionRobot {
  id: number;
  name: string;
  description: string;
  slots: number;
  signups: string[]; // array of user IDs
}

export function MemberCompetition() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [robots, setRobots] = useState<CompetitionRobot[]>([]);
  const [, setUpdate] = useState(0);

  if (!user) return null;

  const loadRobots = async () => {
    const { data, error } = await supabase
      .from('competition_robots')
      .select('*');

    if (error) {
      console.error('Error loading robots:', error);
      return;
    }

    const robotsWithSignups = await Promise.all(
      (data || []).map(async (robot: any) => {
        const { data: signupsData } = await supabase
          .from('competition_signups')
          .select('user_id')
          .eq('robot_id', robot.id);

        return {
          ...robot,
          signups: signupsData?.map((s: any) => s.user_id) || [],
        };
      })
    );

    setRobots(robotsWithSignups);
  };

  useEffect(() => {
    loadRobots();
  }, []);

  const handleSignup = async (robotId: number) => {
    const robot = robots.find(r => r.id === robotId);
    if (!robot) return;

    const isSignedUp = robot.signups.includes(user.id);
    const isFull = robot.signups.length >= robot.slots;

    if (isSignedUp) {
      // Remove signup
      await supabase
        .from('competition_signups')
        .delete()
        .eq('robot_id', robotId)
        .eq('user_id', user.id);

      toast({
        title: 'Slot Released',
        description: `You've left the ${robot.name} team.`,
      });
    } else {
      if (isFull) {
        toast({
          title: 'Slot Full',
          description: 'This robot team is full.',
          variant: 'destructive',
        });
        return;
      }

      await supabase
        .from('competition_signups')
        .insert({ robot_id: robotId, user_id: user.id });

      toast({
        title: 'Successfully Signed Up!',
        description: `You're now part of the ${robot.name} team!`,
      });
    }

    loadRobots();
    setUpdate(prev => prev + 1);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Competition Sign-ups</h1>
        <p className="text-muted-foreground">Join a competition robot team</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {robots.map((robot) => {
          const isSignedUp = robot.signups.includes(user.id);
          const isFull = robot.signups.length >= robot.slots;

          return (
            <Card key={robot.id} className={isSignedUp ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      {robot.name}
                    </CardTitle>
                    <CardDescription className="mt-2">{robot.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{robot.signups.length} / {robot.slots}</span>
                  <span className="text-muted-foreground">slots taken</span>
                </div>

                <div className="space-y-2">
                  {isSignedUp ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSignup(robot.id)}
                    >
                      Leave Team
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      disabled={isFull}
                      onClick={() => handleSignup(robot.id)}
                    >
                      {isFull ? 'Team Full' : 'Join Team'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
