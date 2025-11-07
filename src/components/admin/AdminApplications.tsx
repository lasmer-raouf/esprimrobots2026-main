import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, CheckCircle, XCircle } from 'lucide-react';
import { z } from 'zod';

const applicationSchema = z.object({
  user_id: z.string().uuid(),
  status: z.enum(['pending', 'accepted', 'rejected']),
  interview_date: z.string().optional(),
  interview_location: z.string().max(500).optional(),
  notes: z.string().max(2000).optional()
});

interface Application {
  id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  interview_date?: string;
  interview_location?: string;
  notes?: string;
  profiles?: {
    name: string;
    email: string;
  };
}

export function AdminApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    status: '',
    interview_date: '',
    interview_location: '',
    notes: ''
  });
  const [newAppData, setNewAppData] = useState({
    user_id: '',
    status: 'pending',
    interview_date: '',
    interview_location: '',
    notes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadApplications();
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name');
    
    if (profiles) {
      setAllUsers(profiles);
    }
  };

  const loadApplications = async () => {
    const { data } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      const appsWithProfiles = await Promise.all(
        data.map(async (app) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', app.user_id)
            .single();

          return {
            ...app,
            profiles: profile || { name: 'Unknown', email: 'Unknown' }
          };
        })
      );

      setApplications(appsWithProfiles as Application[]);
    }
    setLoading(false);
  };

  const handleOpenDialog = (app: Application) => {
    setSelectedApp(app);
    setFormData({
      status: app.status,
      interview_date: app.interview_date || '',
      interview_location: app.interview_location || '',
      notes: app.notes || ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    try {
      applicationSchema.parse({
        user_id: selectedApp.user_id,
        ...formData
      });
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: 'Please check your input values',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('applications')
      .update(formData)
      .eq('id', selectedApp.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update application',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Application updated successfully',
      });
      loadApplications();
      setSelectedApp(null);
    }
  };

  const handleAddApplication = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      applicationSchema.parse(newAppData);
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: 'Please check your input values',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('applications')
      .insert([newAppData]);

    if (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add application',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Application added successfully',
      });
      setShowAddDialog(false);
      setNewAppData({
        user_id: '',
        status: 'pending',
        interview_date: '',
        interview_location: '',
        notes: ''
      });
      loadApplications();
    }
  };

  const handleDeleteApplication = async (id: string, userId: string) => {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete application',
        variant: 'destructive',
      });
    } else {
      // Also remove from groups if they were in any
      await supabase.from('member_groups').delete().eq('user_id', userId);
      
      toast({
        title: 'Success',
        description: 'Application deleted successfully',
      });
      loadApplications();
    }
  };

  const handleAcceptApplication = async (appId: string, userId: string) => {
    // First check if user already has a role
    const { data: existingRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (existingRoles && existingRoles.length > 0) {
      // User already has a role, just update application status
      const { error } = await supabase
        .from('applications')
        .update({ status: 'accepted' })
        .eq('id', appId);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to accept application',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Application accepted!',
        });
        loadApplications();
      }
      return;
    }

    // Assign member role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role: 'member' }]);

    if (roleError) {
      toast({
        title: 'Error',
        description: 'Failed to assign member role',
        variant: 'destructive',
      });
      return;
    }

    // Update application status
    const { error: updateError } = await supabase
      .from('applications')
      .update({ status: 'accepted' })
      .eq('id', appId);

    if (updateError) {
      toast({
        title: 'Error',
        description: 'Failed to update application',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Application accepted! User is now a member.',
      });
      loadApplications();
    }
  };

  const handleRejectApplication = async (appId: string, userId: string) => {
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

    toast({
      title: 'Success',
      description: 'Application rejected and user access removed.',
    });
    
    loadApplications();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Applications Management</h1>
          <p className="text-muted-foreground">Manage member applications and interviews</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Application
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Application</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddApplication} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="new_user">Select User</Label>
                <Select
                  value={newAppData.user_id}
                  onValueChange={(value) => setNewAppData({ ...newAppData, user_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new_status">Status</Label>
                <Select
                  value={newAppData.status}
                  onValueChange={(value) => setNewAppData({ ...newAppData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new_interview_date">Interview Date & Time</Label>
                <Input
                  id="new_interview_date"
                  type="datetime-local"
                  value={newAppData.interview_date}
                  onChange={(e) => setNewAppData({ ...newAppData, interview_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new_interview_location">Interview Location</Label>
                <Input
                  id="new_interview_location"
                  maxLength={500}
                  value={newAppData.interview_location}
                  onChange={(e) => setNewAppData({ ...newAppData, interview_location: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new_notes">Notes</Label>
                <Textarea
                  id="new_notes"
                  maxLength={2000}
                  value={newAppData.notes}
                  onChange={(e) => setNewAppData({ ...newAppData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full">Add Application</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading applications...</p>
          ) : applications.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No applications found</p>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{app.profiles?.name}</h3>
                      {getStatusBadge(app.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{app.profiles?.email}</p>
                    {app.interview_date && (
                      <p className="text-sm mt-2">
                        <strong>Interview:</strong> {new Date(app.interview_date).toLocaleString()}
                        {app.interview_location && ` at ${app.interview_location}`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {app.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptApplication(app.id, app.user_id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRejectApplication(app.id, app.user_id)}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Dialog>
                    <DialogTrigger asChild>
                      <Button onClick={() => handleOpenDialog(app)}>Manage</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Manage Application - {app.profiles?.name}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="interview_date">Interview Date & Time</Label>
                          <Input
                            id="interview_date"
                            type="datetime-local"
                            value={formData.interview_date}
                            onChange={(e) => setFormData({ ...formData, interview_date: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="interview_location">Interview Location</Label>
                          <Input
                            id="interview_location"
                            maxLength={500}
                            value={formData.interview_location}
                            onChange={(e) => setFormData({ ...formData, interview_location: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            maxLength={2000}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <Button type="submit" className="w-full">Update Application</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteApplication(app.id, app.user_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
