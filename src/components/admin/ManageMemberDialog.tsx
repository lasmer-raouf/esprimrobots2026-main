import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ManageMemberDialogProps {
  memberId: string;
  memberName: string;
}

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface Certificate {
  id: string;
  name: string;
  issued_at: string;
}

interface Presence {
  id: string;
  week_date: string;
  present: boolean;
}

export function ManageMemberDialog({ memberId, memberName }: ManageMemberDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newCertificate, setNewCertificate] = useState('');
  const [newPresenceDate, setNewPresenceDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');

  useEffect(() => {
    if (open) {
      loadMemberData();
    }
  }, [open, memberId]);

  const loadMemberData = async () => {
    try {
      // Load tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', memberId);
      
      if (tasksData) setTasks(tasksData);

      // Load certificates
      const { data: certsData } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', memberId);
      
      if (certsData) setCertificates(certsData);

      // Load presences
      const { data: presencesData } = await supabase
        .from('presences')
        .select('*')
        .eq('user_id', memberId)
        .order('week_date', { ascending: false });
      
      if (presencesData) setPresences(presencesData);

      // Load profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('image, description, linkedin_url, instagram_url')
        .eq('id', memberId)
        .single();
      
      if (profile) {
        setImageUrl(profile.image || '');
        setDescription(profile.description || '');
        setLinkedinUrl(profile.linkedin_url || '');
        setInstagramUrl(profile.instagram_url || '');
      }
    } catch (error) {
      console.error('Error loading member data:', error);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .insert({ user_id: memberId, text: newTask, completed: false });

      if (error) throw error;

      toast({ title: 'Task added successfully' });
      setNewTask('');
      loadMemberData();
    } catch (error) {
      toast({ title: 'Error adding task', variant: 'destructive' });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({ title: 'Task deleted successfully' });
      loadMemberData();
    } catch (error) {
      toast({ title: 'Error deleting task', variant: 'destructive' });
    }
  };

  const handleAddCertificate = async () => {
    if (!newCertificate.trim()) return;

    try {
      const { error } = await supabase
        .from('certificates')
        .insert({ user_id: memberId, name: newCertificate });

      if (error) throw error;

      toast({ title: 'Certificate added successfully' });
      setNewCertificate('');
      loadMemberData();
    } catch (error) {
      toast({ title: 'Error adding certificate', variant: 'destructive' });
    }
  };

  const handleDeleteCertificate = async (certId: string) => {
    try {
      const { error } = await supabase
        .from('certificates')
        .delete()
        .eq('id', certId);

      if (error) throw error;

      toast({ title: 'Certificate deleted successfully' });
      loadMemberData();
    } catch (error) {
      toast({ title: 'Error deleting certificate', variant: 'destructive' });
    }
  };

  const handleAddPresence = async () => {
    if (!newPresenceDate) return;

    try {
      const { error } = await supabase
        .from('presences')
        .insert({ user_id: memberId, week_date: newPresenceDate, present: true });

      if (error) throw error;

      toast({ title: 'Presence added successfully' });
      setNewPresenceDate('');
      loadMemberData();
    } catch (error) {
      toast({ title: 'Error adding presence', variant: 'destructive' });
    }
  };

  const handleTogglePresence = async (presenceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('presences')
        .update({ present: !currentStatus })
        .eq('id', presenceId);

      if (error) throw error;

      toast({ title: 'Presence updated successfully' });
      loadMemberData();
    } catch (error) {
      toast({ title: 'Error updating presence', variant: 'destructive' });
    }
  };

  const handleDeletePresence = async (presenceId: string) => {
    try {
      const { error } = await supabase
        .from('presences')
        .delete()
        .eq('id', presenceId);

      if (error) throw error;

      toast({ title: 'Presence deleted successfully' });
      loadMemberData();
    } catch (error) {
      toast({ title: 'Error deleting presence', variant: 'destructive' });
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          image: imageUrl || null,
          description: description || null,
          linkedin_url: linkedinUrl || null,
          instagram_url: instagramUrl || null
        })
        .eq('id', memberId);

      if (error) throw error;

      toast({ title: 'Profile updated successfully' });
    } catch (error) {
      toast({ title: 'Error updating profile', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage {memberName}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="tasks">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="presence">Presence</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add new task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              />
              <Button onClick={handleAddTask}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {tasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={task.completed} disabled />
                      <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                        {task.text}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteTask(task.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {tasks.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No tasks assigned</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="certificates" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add new certificate..."
                value={newCertificate}
                onChange={(e) => setNewCertificate(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCertificate()}
              />
              <Button onClick={handleAddCertificate}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {certificates.map((cert) => (
                <Card key={cert.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{cert.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Issued: {new Date(cert.issued_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCertificate(cert.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {certificates.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No certificates awarded</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="presence" className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="date"
                value={newPresenceDate}
                onChange={(e) => setNewPresenceDate(e.target.value)}
              />
              <Button onClick={handleAddPresence}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {presences.map((presence) => (
                <Card key={presence.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={presence.present}
                        onCheckedChange={() => handleTogglePresence(presence.id, presence.present)}
                      />
                      <div>
                        <p className="font-medium">Week of {new Date(presence.week_date).toLocaleDateString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {presence.present ? 'Present' : 'Absent'}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeletePresence(presence.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {presences.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No presence records</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="image">Profile Image URL</Label>
                <Input
                  id="image"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
              {imageUrl && (
                <div className="flex justify-center">
                  <img src={imageUrl} alt="Preview" className="w-32 h-32 rounded-full object-cover" />
                </div>
              )}
              <div>
                <Label htmlFor="description">Quick Description (For Founder/Executives)</Label>
                <Input
                  id="description"
                  placeholder="Brief description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">This will be displayed on the team page for founder and executives only</p>
              </div>
              <Button onClick={handleUpdateProfile} className="w-full">
                Update Profile
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="linkedin">LinkedIn Profile URL (For Founder/Executives)</Label>
                <Input
                  id="linkedin"
                  placeholder="https://www.linkedin.com/in/username"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="instagram">Instagram Profile URL (For Founder/Executives)</Label>
                <Input
                  id="instagram"
                  placeholder="https://www.instagram.com/username"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">Social links will be displayed on the team page for founder and executives only</p>
              <Button onClick={handleUpdateProfile} className="w-full">
                Update Social Links
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}