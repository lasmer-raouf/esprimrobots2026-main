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
  id: number;
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

  // Load robots
  useEffect(() => {
    loadRobots();
  }, []);

  const loadRobots = async () => {
    const { data, error } = await supabase.from('competition_robots').select('*');

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    setRobots(data ?? []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: 'Missing name', description: 'Robot must have a name.', variant: 'destructive' });
      return;
    }

    let slots = formData.slots;
    if (isNaN(slots) || slots < 1) slots = 1;

    if (editingRobot) {
      // Update
      const { error } = await supabase
        .from('competition_robots')
        .update({
          name: formData.name,
          description: formData.description,
          slots: slots,
        })
        .eq('id', editingRobot.id)
        .select();

      if (error) {
        toast({ title: 'Error updating robot', description: error.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Robot Updated', description: 'Competition robot has been updated.' });
    } else {
      // Create
      const { error } = await supabase.from('competition_robots').insert([
        {
          name: formData.name,
          description: formData.description,
          slots: slots,
        },
      ]);

      if (error) {
        toast({ title: 'Error creating robot', description: error.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Robot Created', description: 'New competition robot has been added.' });
    }

    setDialogOpen(false);
    resetForm();
    loadRobots();
  };

  const handleEdit = (robot: CompetitionRobot) => {
    setEditingRobot(robot);
    setFormData({
      name: robot.name,
      description: robot.description,
      slots: robot.slots,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from('competition_robots').delete().eq('id', id);

    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Robot Deleted', description: 'Competition robot has been removed.' });
    loadRobots();
  };

  const resetForm = () => {
    setEditingRobot(null);
    setFormData({ name: '', description: '', slots: 3 });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
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
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label>Team Slots</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.slots}
                  onChange={(e) =>
                    setFormData({ ...formData, slots: parseInt(e.target.value) || 1 })
                  }
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                {editingRobot ? 'Update' : 'Create'} Robot
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Robots */}
      <div className="grid md:grid-cols-2 gap-6">
        {robots.map((robot) => (
          <Card key={robot.id}>
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
