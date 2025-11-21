import { PublicHeader } from '@/components/PublicHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Linkedin, Instagram } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface TeamMember {
  id: string;
  name: string;
  bio?: string;
  major?: string;
  role?: string;
  image?: string;
  description?: string;
  linkedin_url?: string;
  instagram_url?: string;
}

export default function Team() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadTeamMembers();
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  const loadTeamMembers = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, bio, major, image, description, linkedin_url, instagram_url');
      
      if (profiles) {
        // Get all roles for each profile
        const membersWithRoles = await Promise.all(
          profiles.map(async (profile) => {
            const { data: rolesData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', profile.id);
            
            // Determine primary role based on hierarchy
            let primaryRole: 'founder' | 'executive' | 'admin' | 'member' = 'member';
            if (rolesData && rolesData.length > 0) {
              const roles = rolesData.map(r => r.role);
              if (roles.includes('founder')) primaryRole = 'founder';
              else if (roles.includes('admin')) primaryRole = 'admin';
              else if (roles.includes('executive')) primaryRole = 'executive';
              else primaryRole = 'member';
            }
            
            return {
              ...profile,
              role: primaryRole
            };
          })
        );
        
        setTeamMembers(membersWithRoles);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const founder = teamMembers.find(m => m.role === 'founder');
  const executives = teamMembers.filter(m => m.role === 'executive');
  const members = teamMembers.filter(m => m.role !== 'founder' && m.role !== 'executive');

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
            <h1 className="text-4xl font-bold mb-4">Our Team</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Please log in to see our team members
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
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">Our Team</h1>
        <p className="text-center text-muted-foreground mb-16 text-lg">
          Meet the brilliant minds behind IEEE RAS ESPRIM SBC        </p>

        {founder && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">Founder</h2>
            <div className="flex justify-center">
              <div className="flip-card max-w-md w-full h-[350px]">
                <Card className="border-primary hover:shadow-xl hover:shadow-primary/30 transition-all h-full">
                  <div className="flip-card-inner h-full">
                    <CardContent className="flip-card-front p-8 text-center flex flex-col items-center justify-center bg-card rounded-lg">
                      {founder.image ? (
                        <img src={founder.image} alt={founder.name} className="w-24 h-24 rounded-full object-cover mx-auto mb-4 ring-4 ring-primary/20" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center mx-auto mb-4 ring-4 ring-primary/20">
                          <User className="w-12 h-12 text-white" />
                        </div>
                      )}
                      <h3 className="text-2xl font-bold mb-2">{founder.name}</h3>
                      {founder.bio && <p className="text-primary mb-2 font-semibold text-lg">{founder.bio}</p>}
                      {founder.description && <p className="text-sm text-muted-foreground italic mt-2">{founder.description}</p>}
                    </CardContent>
                    <CardContent className="flip-card-back p-8 flex flex-col items-center justify-center bg-card rounded-lg">
                      <h3 className="text-2xl font-bold mb-4">{founder.name}</h3>
                      {founder.major && <p className="text-muted-foreground mb-2"><strong>Major:</strong> {founder.major}</p>}
                      {founder.bio && <p className="text-sm text-muted-foreground mb-4">{founder.bio}</p>}
                      {(founder.linkedin_url || founder.instagram_url) && (
                        <div className="flex gap-4 mt-auto">
                          {founder.linkedin_url && (
                            <a href={founder.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">
                              <Linkedin className="w-6 h-6" />
                            </a>
                          )}
                          {founder.instagram_url && (
                            <a href={founder.instagram_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">
                              <Instagram className="w-6 h-6" />
                            </a>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {executives.length > 0 && (
          <div className="mb-16 relative">
            {founder && (
              <div className="absolute left-1/2 top-0 w-0.5 h-8 bg-gradient-to-b from-primary/50 to-transparent -translate-x-1/2 -mt-4"></div>
            )}
            <h2 className="text-2xl font-bold text-center mb-8">Executive Team</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
              {executives.map((exec) => (
                <div key={exec.id} className="flip-card h-[320px]">
                  <Card className="border-secondary hover:shadow-lg hover:shadow-secondary/20 transition-all h-full">
                    <div className="flip-card-inner h-full">
                      <CardContent className="flip-card-front p-6 text-center flex flex-col items-center justify-center bg-card rounded-lg">
                        {exec.image ? (
                          <img src={exec.image} alt={exec.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-4" />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center mx-auto mb-4">
                            <User className="w-10 h-10 text-white" />
                          </div>
                        )}
                        <h3 className="text-xl font-bold mb-2">{exec.name}</h3>
                        {exec.bio && <p className="text-secondary mb-1 font-medium">{exec.bio}</p>}
                        {exec.description && <p className="text-xs text-muted-foreground italic mt-2 px-2">{exec.description}</p>}
                      </CardContent>
                      <CardContent className="flip-card-back p-6 flex flex-col items-center justify-center bg-card rounded-lg">
                        <h3 className="text-xl font-bold mb-3">{exec.name}</h3>
                        {exec.major && <p className="text-sm text-muted-foreground mb-2"><strong>Major:</strong> {exec.major}</p>}
                        {exec.bio && <p className="text-xs text-muted-foreground mb-3">{exec.bio}</p>}
                        {(exec.linkedin_url || exec.instagram_url) && (
                          <div className="flex gap-3 mt-auto">
                            {exec.linkedin_url && (
                              <a href={exec.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-secondary/80 transition-colors">
                                <Linkedin className="w-5 h-5" />
                              </a>
                            )}
                            {exec.instagram_url && (
                              <a href={exec.instagram_url} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-secondary/80 transition-colors">
                                <Instagram className="w-5 h-5" />
                              </a>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}

        {members.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-center mb-8">Club Members</h2>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {members.map((member) => (
                <div key={member.id} className="flip-card h-[200px]">
                  <Card className="hover:border-primary transition-colors h-full">
                    <div className="flip-card-inner h-full">
                      <CardContent className="flip-card-front p-6 text-center flex flex-col items-center justify-center bg-card rounded-lg">
                        {member.image ? (
                          <img src={member.image} alt={member.name} className="w-16 h-16 rounded-full object-cover mx-auto mb-3" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                            <User className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <h3 className="font-bold mb-1">{member.name}</h3>
                      </CardContent>
                      <CardContent className="flip-card-back p-6 flex flex-col items-center justify-center bg-card rounded-lg">
                        <h3 className="font-bold mb-2">{member.name}</h3>
                        {member.major && <p className="text-sm text-muted-foreground">{member.major}</p>}
                      </CardContent>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
