// AdminCompetition.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CompetitionRobot {
  // Accept either form because Supabase may serialize numbers as strings
  id: number | string;
  name: string;
  description: string;
  slots: number;
}

export function AdminCompetition() {
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRobot, setEditingRobot] = useState<CompetitionRobot | null>(null);
  const [robots, setRobots] = useState<CompetitionRobot[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slots: 3,
  });

  useEffect(() => {
    loadRobots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRobots = async () => {
    const { data, error } = await supabase.from('competition_robots').select('*').order('id', { ascending: true });

    if (error) {
      console.error('loadRobots error', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    console.debug('Robots from DB:', data);
    setRobots((data ?? []) as CompetitionRobot[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: 'Missing name', description: 'Robot must have a name.', variant: 'destructive' });
      return;
    }

    let slots = formData.slots;
    if (isNaN(slots) || slots < 1) slots = 1;

    try {
      if (editingRobot) {
        const { error } = await supabase
          .from('competition_robots')
          .update({ name: formData.name, description: formData.description, slots })
          .eq('id', editingRobot.id)
          .select();

        if (error) {
          console.error('update error', error);
          toast({ title: 'Error updating robot', description: error.message, variant: 'destructive' });
          return;
        }

        toast({ title: 'Robot Updated', description: 'Competition robot has been updated.' });
      } else {
        const { error } = await supabase.from('competition_robots').insert([
          { name: formData.name, description: formData.description, slots },
        ]);

        if (error) {
          console.error('create error', error);
          toast({ title: 'Error creating robot', description: error.message, variant: 'destructive' });
          return;
        }

        toast({ title: 'Robot Created', description: 'New competition robot has been added.' });
      }

      setDialogOpen(false);
      resetForm();
      await loadRobots();
    } catch (err: any) {
      console.error('handleSubmit unexpected', err);
      toast({ title: 'Error', description: err?.message ?? 'Unexpected error', variant: 'destructive' });
    }
  };

  const handleEdit = (robot: CompetitionRobot) => {
    setEditingRobot(robot);
    setFormData({ name: robot.name, description: robot.description, slots: robot.slots });
    setDialogOpen(true);
  };

  /**
   * Robust delete:
   * 1) Confirm
   * 2) Log id & typeof
   * 3) Try existence check using numeric, then string forms
   * 4) Delete using the matching form and request deleted rows back (.select())
   * 5) If nothing deleted, try .match() fallback and print everything to console
   */
  const handleDelete = async (id: number | string) => {
    const ok = window.confirm('Are you sure you want to delete this competition robot? This action cannot be undone.');
    if (!ok) return;

    console.log('Deleting ID:', id, 'typeof:', typeof id);

    try {
      // normalize forms we'll try
      const idNum = Number(id);
      const idStr = String(id);

      // 1) existence check using numeric equality
      let found: any[] | null = null;
      let findErr: any = null;

      try {
        const res = await supabase.from('competition_robots').select('id').eq('id', idNum).limit(1);
        found = res.data as any[] | null;
        findErr = res.error;
        console.debug('existence check (numeric) ->', { idNum, found, findErr });
      } catch (e) {
        console.debug('existence check (numeric) threw', e);
      }

      // 2) if not found, try string equality (some drivers return ids as strings)
      if (!found || found.length === 0) {
        try {
          const res2 = await supabase.from('competition_robots').select('id').eq('id', idStr).limit(1);
          console.debug('existence check (string) ->', { idStr, data: res2.data, error: res2.error });
          if (res2.data && res2.data.length > 0) {
            found = res2.data;
            findErr = res2.error;
          }
        } catch (e) {
          console.debug('existence check (string) threw', e);
        }
      }

      // If still nothing found, bail with a helpful message
      if (!found || found.length === 0) {
        console.warn('No matching row was found for delete attempt', { id, idNum, idStr });
        toast({
          title: 'Delete not applied',
          description:
            'No matching item found to delete. This usually means the item does not exist, the id type does not match, or you do not have permission (RLS). Check console for details.',
          variant: 'destructive',
        });
        // reload to be sure UI is in sync
        await loadRobots();
        return;
      }

      // Use the matched id value returned from DB (best to use DB-returned form)
      const matchBy = found[0].id;
      console.debug('Proceeding to delete by matched id:', matchBy, 'typeof matched:', typeof matchBy);

      // Attempt delete and request deleted rows back
      const delResp = await supabase.from('competition_robots').delete().eq('id', matchBy).select();
      console.debug('delete response (eq):', delResp);

      if (delResp.error) {
        console.error('delete returned error', delResp.error);
        toast({ title: 'Delete failed', description: delResp.error.message || 'Unknown error', variant: 'destructive' });
        return;
      }

      if (!delResp.data || (Array.isArray(delResp.data) && delResp.data.length === 0)) {
        // fallback: try .match()
        console.debug('delete returned no rows, trying fallback .match() with matchBy:', matchBy);
        const fallback = await supabase.from('competition_robots').delete().match({ id: matchBy }).select();
        console.debug('delete response (match fallback):', fallback);

        if (fallback.error) {
          console.error('fallback delete error', fallback.error);
          toast({ title: 'Delete failed', description: fallback.error.message || 'Unknown error', variant: 'destructive' });
          return;
        }

        if (!fallback.data || (Array.isArray(fallback.data) && fallback.data.length === 0)) {
          console.warn('Delete attempt returned zero rows even after fallback', { id, matchBy });
          toast({
            title: 'Delete not applied',
            description:
              'No rows were deleted. This usually means permission (RLS) blocked the operation or the id didn’t match. See console for debug details.',
            variant: 'destructive',
          });
          await loadRobots();
          return;
        }

        // fallback succeeded
        const deletedId = fallback.data[0].id;
        setRobots((prev) => prev.filter((r) => String(r.id) !== String(deletedId)));
        toast({ title: 'Robot Deleted', description: 'Competition robot has been removed.' });
        return;
      }

      // Success: delResp.data contains deleted row(s)
      const deletedId = delResp.data[0].id;
      console.debug('Deleted rows:', delResp.data);
      setRobots((prev) => prev.filter((r) => String(r.id) !== String(deletedId)));
      toast({ title: 'Robot Deleted', description: 'Competition robot has been removed.' });
    } catch (err: any) {
      console.error('Unexpected delete error', err);
      toast({ title: 'Delete failed', description: err?.message ?? 'Unexpected error', variant: 'destructive' });
      await loadRobots();
    }
  };

  const resetForm = () => {
    setEditingRobot(null);
    setFormData({ name: '', description: '', slots: 3 });
  };

  const myKey = (r: CompetitionRobot) => String(r.id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Competition Management</h1>
          <p className="text-muted-foreground">Manage competition robots</p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>Add Competition Robot</Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRobot ? 'Edit Robot' : 'New Competition Robot'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Robot Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>

              <div>
                <Label>Team Slots</Label>
                <Input type="number" min={1} max={10} value={formData.slots} onChange={(e) => setFormData({ ...formData, slots: parseInt(e.target.value) || 1 })} required />
              </div>

              <Button type="submit" className="w-full">{editingRobot ? 'Update' : 'Create'} Robot</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {robots.map((robot) => (
          <Card key={myKey(robot)}>
            <CardHeader>
              <CardTitle className="text-lg">{robot.name}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{robot.description}</p>
              <p className="text-sm font-medium">{robot.slots} team slots</p>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(robot)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>

                <Button variant="outline" size="sm" onClick={() => handleDelete(robot.id)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default AdminCompetition;
