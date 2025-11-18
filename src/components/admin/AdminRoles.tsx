import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, Save } from 'lucide-react';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'member' | string; // DB could have other values, but UI will only show admin/member
  created_at: string;
  profiles?: {
    name: string;
    email: string;
  };
}

interface Profile {
  id: string;
  name: string;
  email: string;
}

export function AdminRoles() {
  const { toast } = useToast();

  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // per-row role state (maps user_roles.id => role string)
  const [rowRoles, setRowRoles] = useState<Record<string, string>>({});

  // allowed roles — only admin and member per request
  const allowedRoles = ['admin', 'member'] as const;
  const roleLabels: Record<string, string> = { admin: 'Admin', member: 'Member' };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      await loadRolesAndProfiles();
      if (mounted) setLoading(false);
    };
    init();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRolesAndProfiles = async () => {
    try {
      setLoading(true);
      const { data: rolesData, error: rolesErr } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesErr) throw rolesErr;

      const rolesList = (rolesData || []) as any[];

      // FILTER: only keep roles that are admin or member
      const filteredRolesList = rolesList.filter((r) => allowedRoles.includes(r.role));

      const userIds = Array.from(new Set(filteredRolesList.map((r) => r.user_id))).filter(Boolean);

      let profilesForRoles: Profile[] = [];
      if (userIds.length > 0) {
        const { data: pData, error: pErr } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);
        if (pErr) {
          console.warn('Could not fetch profiles for roles', pErr);
        } else {
          profilesForRoles = (pData || []) as Profile[];
        }
      }

      const profileById = Object.fromEntries(profilesForRoles.map((p) => [p.id, p]));

      const rolesWithProfiles: UserRole[] = filteredRolesList.map((r: any) => ({
        ...r,
        profiles: profileById[r.user_id] || { name: 'Unknown', email: 'Unknown' },
      }));

      setUserRoles(rolesWithProfiles);

      // initialize per-row roles object
      const initialRowRoles: Record<string, string> = {};
      rolesWithProfiles.forEach((r) => { initialRowRoles[r.id] = r.role; });
      setRowRoles(initialRowRoles);

      // fetch all profiles for Add selector
      const { data: allProfiles, error: allProfilesErr } = await supabase
        .from('profiles')
        .select('id, name, email')
        .order('name');

      if (allProfilesErr) throw allProfilesErr;

      const allProfilesList = (allProfiles || []) as Profile[];
      setProfiles(allProfilesList);

      const usedIds = new Set(rolesWithProfiles.map((r) => r.user_id));
      const avail = allProfilesList.filter((p) => !usedIds.has(p.id));
      setAvailableProfiles(avail);
    } catch (err: any) {
      console.error('Failed to load roles/profiles', err);
      toast({
        title: 'Error',
        description: (err && err.message) ? err.message : 'Failed to fetch data',
        variant: 'destructive',
      });
      setUserRoles([]);
      setProfiles([]);
      setAvailableProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    await loadRolesAndProfiles();
    setLoading(false);
  };

  const countAdmins = () => userRoles.filter((r) => r.role === 'admin').length;

  const handleAddRole = async () => {
    if (!selectedUser || selectedUser === '__none' || !selectedRole) {
      toast({ title: 'Error', description: 'Please select both a user and a role', variant: 'destructive' });
      return;
    }

    if (!allowedRoles.includes(selectedRole as any)) {
      toast({ title: 'Error', description: 'Invalid role selected', variant: 'destructive' });
      return;
    }

    if (userRoles.some((ur) => ur.user_id === selectedUser)) {
      toast({ title: 'Error', description: 'Selected user already has a role', variant: 'destructive' });
      await refresh();
      return;
    }

    try {
      const { error } = await supabase.from('user_roles').insert([{ user_id: selectedUser, role: selectedRole as any }]);
      if (error) throw error;
      toast({ title: 'Success', description: 'Role added successfully' });
      setSelectedUser('');
      setSelectedRole('');
      await refresh();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to add role', variant: 'destructive' });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const roleToDelete = userRoles.find((r) => r.id === roleId);
    if (!roleToDelete) {
      toast({ title: 'Error', description: 'Role not found', variant: 'destructive' });
      return;
    }

    // Prevent deleting last admin
    if (roleToDelete.role === 'admin' && countAdmins() <= 1) {
      toast({ title: 'Action denied', description: 'Cannot remove the last admin', variant: 'destructive' });
      return;
    }

    const ok = window.confirm('Remove this role?');
    if (!ok) return;

    try {
      const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Role removed successfully' });
      await refresh();
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to delete role', variant: 'destructive' });
    }
  };

  const handleUpdateRole = async (roleId: string) => {
    const newRole = rowRoles[roleId];
    if (!newRole) {
      toast({ title: 'Error', description: 'Please select a role', variant: 'destructive' });
      return;
    }
    if (!allowedRoles.includes(newRole as any)) {
      toast({ title: 'Error', description: 'Invalid role', variant: 'destructive' });
      return;
    }

    const current = userRoles.find((r) => r.id === roleId);
    if (!current) {
      toast({ title: 'Error', description: 'Role not found', variant: 'destructive' });
      return;
    }

    // If trying to change last admin to member, prevent it
    if (current.role === 'admin' && newRole !== 'admin' && countAdmins() <= 1) {
      toast({ title: 'Action denied', description: 'Cannot change the last admin to a non-admin role', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('id', roleId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Role updated' });
      await refresh();
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
    }
  };

  const setRowRole = (roleId: string, roleValue: string) => {
    setRowRoles((prev) => ({ ...prev, [roleId]: roleValue }));
  };

  if (loading) return <div>Loading roles...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Role Management</h1>
        <p className="text-muted-foreground mt-2">Manage user roles (admin & member only)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Role</CardTitle>
          <CardDescription>Assign a role to a user who does not already have any role</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="user">Select User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>

                  <SelectContent>
                    {availableProfiles.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No users available
                      </SelectItem>
                    ) : (
                      availableProfiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name} ({profile.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="role">Select Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleLabels[role] ?? role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleAddRole} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current User Roles</CardTitle>
          <CardDescription>All assigned roles in the system — change or remove them</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {userRoles.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No roles assigned yet</p>
            ) : (
              userRoles.map((userRole) => (
                <div key={userRole.id} className="flex items-center justify-between p-4 border border-border rounded-lg gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium truncate">{userRole.profiles?.name || 'Unknown User'}</p>
                        <p className="text-sm text-muted-foreground truncate">{userRole.profiles?.email}</p>
                      </div>

                      {/* Role badge */}
                      <div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            userRole.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {roleLabels[userRole.role] ?? userRole.role}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 md:flex md:items-center gap-3">
                      <div className="min-w-[300px]">
                        <Label>Role</Label>




                        

                        <div className="flex gap-2 mt-2 md:mt-0">
                          <Select value={rowRoles[userRole.id] ?? userRole.role} onValueChange={(val) => setRowRole(userRole.id, val)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {allowedRoles.map((r) => (
                              <SelectItem key={r} value={r}>
                                {roleLabels[r] ?? r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={() => handleUpdateRole(userRole.id)} title="Save role">
                          <Save className="mr-2 h-4 w-4" /> Save
                        </Button>
                        <Button
                          variant="destructive"
                          
                          onClick={() => handleDeleteRole(userRole.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      </div>

                      
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
