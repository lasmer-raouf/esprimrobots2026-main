import { PublicHeader } from '@/components/PublicHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Group {
  id: string;
  name: string;
  description?: string;
}

interface Member {
  id: string;
  name: string;
  major?: string;
  image?: string;
}

interface GroupWithMembers extends Group {
  members: Member[];
}

export default function GroupMembers() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      loadGroups();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadGroups = async () => {
    try {
      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')
        .order('name');

      if (groupsData) {
        const groupsWithMembers = await Promise.all(
          groupsData.map(async (group) => {
            const { data: memberGroups } = await supabase
              .from('member_groups')
              .select('user_id')
              .eq('group_id', group.id);

            if (memberGroups) {
              const memberIds = memberGroups.map(mg => mg.user_id);
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id, name, major, image')
                .in('id', memberIds);

              return {
                ...group,
                members: profiles || []
              };
            }

            return {
              ...group,
              members: []
            };
          })
        );

        setGroups(groupsWithMembers);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <main className="container mx-auto px-4 py-16 text-center">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <main className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-md mx-auto space-y-6">
            <h1 className="text-4xl font-bold mb-4">Group Members</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Please log in to see group members
            </p>
            <Button onClick={() => navigate('/login')} size="lg">
              Log In
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />
      
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">Group Members</h1>
        <p className="text-center text-muted-foreground mb-16 text-lg">
          Explore our groups and their members
        </p>

        {groups.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="py-8 text-center text-muted-foreground">
              No groups created yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Users className="w-6 h-6 text-primary" />
                    {group.name}
                  </CardTitle>
                  {group.description && (
                    <p className="text-muted-foreground mt-2">{group.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {group.members.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No members in this group yet</p>
                  ) : (
                    <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {group.members.map((member) => (
                        <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors">
                          {member.image ? (
                            <img src={member.image} alt={member.name} className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{member.name}</p>
                            {member.major && (
                              <p className="text-sm text-muted-foreground truncate">{member.major}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
