import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface Group {
  id: string;
  name: string;
}

export function MemberGroupsTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [certificates, setCertificates] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);
      
      if (tasksData) setTasks(tasksData);

      // Load groups
      const { data: groupsData } = await supabase
        .from('member_groups')
        .select('group_id, groups(id, name)')
        .eq('user_id', user.id);
      
      if (groupsData) {
        const groupsList = groupsData
          .map(mg => mg.groups)
          .filter(g => g !== null) as Group[];
        setGroups(groupsList);
      }

      // Load certificates
      const { data: certsData } = await supabase
        .from('certificates')
        .select('name')
        .eq('user_id', user.id);
      
      if (certsData) {
        setCertificates(certsData.map(c => c.name));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleTaskToggle = async (taskId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !currentStatus })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, completed: !currentStatus } : t
      ));

      toast({
        title: !currentStatus ? 'Task completed!' : 'Task marked incomplete',
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Groups & Tasks</h1>
        <p className="text-muted-foreground">Manage your group memberships and assigned tasks</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Groups</CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {groups.map((group) => (
                <Badge key={group.id} variant="secondary" className="text-sm py-1 px-3">
                  {group.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">You haven't been assigned to any groups yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => handleTaskToggle(task.id, task.completed)}
                  />
                  <p className={task.completed ? 'text-muted-foreground line-through' : ''}>
                    {task.text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No tasks assigned yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Certificates</CardTitle>
        </CardHeader>
        <CardContent>
          {certificates.length > 0 ? (
            <div className="space-y-2">
              {certificates.map((cert, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge className="bg-primary">🏆</Badge>
                  <p>{cert}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No certificates earned yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
