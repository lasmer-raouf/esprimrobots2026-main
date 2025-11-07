import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shuffle, Trash2, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { z } from 'zod';

const groupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional()
});

interface Group {
  id: string;
  name: string;
  description?: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
}

export function AdminGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [shuffleCount, setShuffleCount] = useState(2);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadGroups();
    loadMembers();
  }, []);

  const loadGroups = async () => {
    const { data } = await supabase
      .from('groups')
      .select('*')
      .order('name');
    
    if (data) setGroups(data);
  };

  const loadMembers = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email');
    
    if (profiles) {
      const membersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);
          
          return {
            ...profile,
            hasRole: rolesData && rolesData.length > 0
          };
        })
      );
      
      setMembers(membersWithRoles.filter(m => m.hasRole));
    }
  };

  const handleAddToGroup = async () => {
    if (!selectedGroup || !selectedMember) {
      toast({
        title: 'Error',
        description: 'Please select both a group and a member',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('member_groups')
      .insert([{ group_id: selectedGroup, user_id: selectedMember }]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add member to group',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Member added to group',
      });
      setSelectedMember('');
    }
  };

  const handleShuffleGroups = async () => {
    if (groups.length < 2 || members.length < 2) {
      toast({
        title: 'Error',
        description: 'Need at least 2 groups and 2 members to shuffle',
        variant: 'destructive',
      });
      return;
    }

    // Clear existing group assignments
    await supabase.from('member_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Shuffle members
    const shuffledMembers = [...members].sort(() => Math.random() - 0.5);
    
    // Distribute members evenly across groups
    const assignments = shuffledMembers.map((member, index) => ({
      user_id: member.id,
      group_id: groups[index % shuffleCount].id
    }));

    const { error } = await supabase
      .from('member_groups')
      .insert(assignments);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to shuffle groups',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Members shuffled into ${shuffleCount} groups`,
      });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const { error } = await supabase
      .from('member_groups')
      .delete()
      .eq('user_id', userId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove member from groups',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Member removed from all groups',
      });
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      groupSchema.parse(newGroupData);
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: 'Please check your input values',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('groups')
      .insert([newGroupData]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create group',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Group created successfully',
      });
      setShowCreateForm(false);
      setNewGroupData({ name: '', description: '' });
      loadGroups();
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    // First delete all member assignments
    await supabase.from('member_groups').delete().eq('group_id', groupId);
    
    // Then delete the group
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete group',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Group deleted successfully',
      });
      loadGroups();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Groups Management</h1>
          <p className="text-muted-foreground">Manage group assignments and shuffle members</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showCreateForm ? 'Cancel' : 'Create Group'}
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Group</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="group_name">Group Name</Label>
                <Input
                  id="group_name"
                  maxLength={100}
                  value={newGroupData.name}
                  onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="group_description">Description</Label>
                <Textarea
                  id="group_description"
                  maxLength={500}
                  value={newGroupData.description}
                  onChange={(e) => setNewGroupData({ ...newGroupData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full">Create Group</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Shuffle Members into Groups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Number of Groups to Use</Label>
            <Select
              value={shuffleCount.toString()}
              onValueChange={(value) => setShuffleCount(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groups.map((_, index) => (
                  <SelectItem key={index + 1} value={(index + 1).toString()}>
                    {index + 1} Groups
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleShuffleGroups} className="w-full">
            <Shuffle className="mr-2 h-4 w-4" />
            Shuffle Members into Groups
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Member to Group</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Select Group</Label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Select Member</Label>
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddToGroup} className="w-full">
            Add to Group
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {groups.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No groups created yet</p>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{group.name}</p>
                    {group.description && (
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteGroup(group.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveMember(member.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
