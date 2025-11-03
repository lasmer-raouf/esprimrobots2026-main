import { PublicHeader } from '@/components/PublicHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { clubDB } from '@/lib/database';
import { Users, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Competition() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Competition Robots
            </h1>
            <p className="text-lg text-muted-foreground">
              Join our competition teams and showcase your skills
            </p>
          </div>

          <div className="grid gap-6 animate-slide-in">
            {clubDB.competitionRobots.map((robot) => {
              const availableSlots = robot.slots - robot.signups.length;
              const isFull = availableSlots === 0;

              return (
                <Card key={robot.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
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

          {clubDB.competitionRobots.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No competition robots available at the moment
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
