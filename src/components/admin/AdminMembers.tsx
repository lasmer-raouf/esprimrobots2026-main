import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { clubDB } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { AddMemberDialog } from './AddMemberDialog';
import { AddAdminDialog } from './AddAdminDialog';
import { ManageMemberDialog } from './ManageMemberDialog';
import { supabase } from '@/integrations/supabase/client';

interface Member {
  id: string;
  name: string;
  email: string;
  major?: string;
  roles: string[];
}

export function AdminMembers() {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*');
      
      if (profiles) {
        // Get all roles for each profile
        const membersWithRoles = await Promise.all(
          profiles.map(async (profile) => {
            const { data: rolesData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', profile.id);
            
            const roles = rolesData?.map(r => r.role) || [];
            
            return {
              ...profile,
              roles: roles.length > 0 ? roles : ['No role assigned']
            };
          })
        );
        
        setMembers(membersWithRoles);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptApplication = async (id: number) => {
    const pending = clubDB.pendingMembers.find(m => m.id === id);
    if (!pending) return;

    toast({
      title: 'Application Accepted',
      description: `${pending.name} has been added as a member. An admin should create their account using the "Add Member" button.`,
    });
  };

  const handleRejectApplication = async (id: number) => {
    clubDB.pendingMembers = clubDB.pendingMembers.filter(m => m.id !== id);
    toast({
      title: 'Application Rejected',
      description: 'The application has been removed.',
    });
  };

  const handleAcceptRealApplication = async (appId: string, userId: string) => {
    // Assign member role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role: 'member' }]);

    if (roleError) {
      toast({
        title: 'Error',
        description: 'Failed to accept application',
        variant: 'destructive',
      });
      return;
    }

    // Update application status
    await supabase
      .from('applications')
      .update({ status: 'accepted' })
      .eq('id', appId);

    toast({
      title: 'Success',
      description: 'Application accepted! User is now a member.',
    });
    
    loadMembers();
  };

  const handleRejectRealApplication = async (appId: string, userId: string) => {
    // Delete the application
    const { error: appError } = await supabase
      .from('applications')
      .delete()
      .eq('id', appId);

    if (appError) {
      toast({
        title: 'Error',
        description: 'Failed to reject application',
        variant: 'destructive',
      });
      return;
    }

    // Delete user roles if any
    await supabase.from('user_roles').delete().eq('user_id', userId);
    
    // Delete from groups
    await supabase.from('member_groups').delete().eq('user_id', userId);

    // Delete the user account (admin API call needed)
    // Note: This requires admin privileges, handled via edge function would be better
    // For now, we just remove the application and roles

    toast({
      title: 'Success',
      description: 'Application rejected and user removed.',
    });
    
    loadMembers();
  };

  const handleDeleteMember = async (userId: string) => {
    // Delete user roles
    await supabase.from('user_roles').delete().eq('user_id', userId);
    
    // Delete from groups
    await supabase.from('member_groups').delete().eq('user_id', userId);
    
    // Delete application if exists
    await supabase.from('applications').delete().eq('user_id', userId);

    toast({
      title: 'Success',
      description: 'Member removed successfully',
    });
    
    loadMembers();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Member Management</h1>
          <p className="text-muted-foreground">Manage club members and applications</p>
        </div>
        <div className="flex gap-2">
          <AddAdminDialog onSuccess={loadMembers} />
          <AddMemberDialog onSuccess={loadMembers} />
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Current Members</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Applications ({clubDB.pendingMembers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {loading ? (
            <p>Loading members...</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <Card key={member.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{member.name}</CardTitle>
                        <div className="flex flex-wrap gap-1">
                          {member.roles.map((role, idx) => (
                            <Badge key={idx} variant="secondary">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <ManageMemberDialog memberId={member.id} memberName={member.name} />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <p className="text-sm text-muted-foreground">{member.major}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {clubDB.pendingMembers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending applications
              </CardContent>
            </Card>
          ) : (
            clubDB.pendingMembers.map((member) => (
              <Card key={member.id}>
                <CardHeader>
                  <CardTitle>{member.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <p><strong>Email:</strong> {member.email}</p>
                    <p><strong>Major:</strong> {member.major}</p>
                    <div>
                      <strong>Why they want to join:</strong>
                      <p className="text-muted-foreground mt-1">{member.reason}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleAcceptApplication(member.id)}>
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRejectApplication(member.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
