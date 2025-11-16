import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  major?: string | null;
  roles: string[];
}

interface PendingMember {
  id: number; // BIGSERIAL in DB -> number
  name: string;
  email: string;
  major?: string | null;
  reason?: string | null;
  status?: string | null;
}

export function AdminMembers() {
  const { toast } = useToast();

  const [members, setMembers] = useState<Member[]>([]);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadMembers(), loadPendingMembers()]);
    setLoading(false);
  };

  // --------------------------
  // Load Current Members
  // --------------------------
  const loadMembers = async () => {
    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, name, email, major');

    if (profilesErr) {
      console.error('Error fetching members:', profilesErr);
      toast({
        title: 'Error',
        description: 'Failed to load members.',
        variant: 'destructive',
      });
      setMembers([]);
      return;
    }

    if (!profiles) {
      setMembers([]);
      return;
    }

    const membersWithRoles = await Promise.all(
      profiles.map(async (profile: any) => {
        const { data: roles, error: rolesErr } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id);

        if (rolesErr) {
          console.error('Error fetching roles for', profile.id, rolesErr);
        }

        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          major: profile.major ?? null,
          roles: roles?.map((r: any) => r.role) ?? ['No role assigned'],
        } as Member;
      })
    );

    setMembers(membersWithRoles);
  };

  // --------------------------
  // Load Pending Members
  // --------------------------
  const loadPendingMembers = async () => {
    const { data, error } = await supabase
      .from('pending_members')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending members.',
        variant: 'destructive',
      });
      setPendingMembers([]);
      return;
    }

    setPendingMembers((data as PendingMember[]) ?? []);
  };

  // --------------------------
  // Accept Pending Member
  // --------------------------
  const handleAcceptPendingMember = async (member: PendingMember) => {
    const ok = window.confirm(`Accept ${member.name} as a member?`);
    if (!ok) return;

    // Update pending_members.status => 'approved'
    const { error } = await supabase
      .from('pending_members')
      .update({ status: 'approved' })
      .eq('id', member.id);

    if (error) {
      console.error('Error accepting pending member:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept member.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: `${member.name} has been approved.`,
    });

    loadAll();
  };

  // --------------------------
  // Reject Pending Member
  // --------------------------
  const handleRejectPendingMember = async (member: PendingMember) => {
    const ok = window.confirm(`Reject ${member.name}'s application?`);
    if (!ok) return;

    // Update pending_members.status => 'rejected'
    const { error } = await supabase
      .from('pending_members')
      .update({ status: 'rejected' })
      .eq('id', member.id);

    if (error) {
      console.error('Error rejecting pending member:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject pending member.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: `${member.name}'s application has been rejected.`,
    });

    loadAll();
  };

  // --------------------------
  // Remove Member
  // --------------------------
  const handleDeleteMember = async (userId: string) => {
    const ok = window.confirm('Are you sure you want to remove this member? This will delete their profile and roles.');
    if (!ok) return;

    const { error: roleErr } = await supabase.from('user_roles').delete().eq('user_id', userId);
    if (roleErr) {
      console.error('Error deleting roles:', roleErr);
      toast({ title: 'Error', description: 'Failed to delete member roles.', variant: 'destructive' });
      return;
    }

    const { error: profileErr } = await supabase.from('profiles').delete().eq('id', userId);
    if (profileErr) {
      console.error('Error deleting profile:', profileErr);
      toast({ title: 'Error', description: 'Failed to delete member profile.', variant: 'destructive' });
      return;
    }

    toast({
      title: 'Success',
      description: 'Member removed.',
    });

    loadAll();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Member Management</h1>
          <p className="text-muted-foreground">Manage club members and pending applications</p>
        </div>

        <div className="flex gap-2">
          <AddAdminDialog onSuccess={loadAll} />
          <AddMemberDialog onSuccess={loadAll} />
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Current Members</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Applications ({pendingMembers.length})
          </TabsTrigger>
        </TabsList>

        {/* ---------------------- Members Tab ---------------------- */}
        <TabsContent value="members" className="space-y-4">
          {loading ? (
            <p>Loading members...</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <Card key={member.id}>
                  <CardHeader>
                    <div className="flex justify-between w-full">
                      <div>
                        <CardTitle className="text-lg">{member.name}</CardTitle>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {member.roles.map((role, i) => (
                            <Badge key={`${role}-${i}`} variant="secondary">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <ManageMemberDialog memberId={member.id} memberName={member.name} onSuccess={loadAll} />
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

                  <CardContent>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <p className="text-sm text-muted-foreground">{member.major}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------------- Pending Members Tab ---------------------- */}
        <TabsContent value="pending" className="space-y-4">
          {pendingMembers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending members
              </CardContent>
            </Card>
          ) : (
            pendingMembers.map((member) => (
              <Card key={member.id}>
                <CardHeader>
                  <CardTitle>{member.name}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p><strong>Email:</strong> {member.email}</p>
                  <p><strong>Major:</strong> {member.major ?? '—'}</p>
                  <div>
                    <strong>Reason:</strong>
                    <p className="text-muted-foreground mt-1">{member.reason ?? '—'}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => handleAcceptPendingMember(member)}>
                      Accept
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleRejectPendingMember(member)}
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
