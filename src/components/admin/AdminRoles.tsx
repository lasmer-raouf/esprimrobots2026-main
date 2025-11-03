import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus } from 'lucide-react';

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: {
    name: string;
    email: string;
  };
}

export function AdminRoles() {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const { toast } = useToast();

  const roles = ['admin', 'moderator', 'user', 'founder', 'executive'];

  useEffect(() => {
    fetchUserRoles();
    fetchProfiles();
  }, []);

  const fetchUserRoles = async () => {
    const { data: rolesData, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch user roles',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Fetch profile data for each user_id
    const rolesWithProfiles = await Promise.all(
      (rolesData || []).map(async (role) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', role.user_id)
          .single();

        return {
          ...role,
          profiles: profile || { name: 'Unknown', email: 'Unknown' }
        };
      })
    );

    setUserRoles(rolesWithProfiles as UserRole[]);
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch profiles',
        variant: 'destructive',
      });
    } else {
      setProfiles(data || []);
    }
  };

  const handleAddRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast({
        title: 'Error',
        description: 'Please select both a user and a role',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .insert([{ user_id: selectedUser, role: selectedRole as any }]);

    if (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add role',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Role added successfully',
      });
      setSelectedUser('');
      setSelectedRole('');
      fetchUserRoles();
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', roleId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete role',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Role removed successfully',
      });
      fetchUserRoles();
    }
  };

  if (loading) {
    return <div>Loading roles...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Role Management</h1>
        <p className="text-muted-foreground mt-2">Manage user roles and permissions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Role</CardTitle>
          <CardDescription>Assign a role to a user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="user">Select User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name} ({profile.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Select Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <CardDescription>All assigned roles in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userRoles.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No roles assigned yet</p>
            ) : (
              userRoles.map((userRole) => (
                <div
                  key={userRole.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{userRole.profiles?.name || 'Unknown User'}</p>
                    <p className="text-sm text-muted-foreground">{userRole.profiles?.email}</p>
                    <p className="text-sm text-primary font-medium mt-1">
                      {userRole.role.charAt(0).toUpperCase() + userRole.role.slice(1)}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRole(userRole.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
