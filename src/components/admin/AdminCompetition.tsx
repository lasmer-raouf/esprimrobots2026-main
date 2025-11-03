import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { clubDB, saveDatabase, CompetitionRobot } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Edit, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function AdminCompetition() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRobot, setEditingRobot] = useState<CompetitionRobot | null>(null);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slots: 3,
  });

  useEffect(() => {
    loadMemberNames();
  }, []);

  const loadMemberNames = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name');
      
      if (profiles) {
        const names: Record<string, string> = {};
        profiles.forEach(p => {
          names[p.id] = p.name;
        });
        setMemberNames(names);
      }
    } catch (error) {
      console.error('Error loading member names:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingRobot) {
      const robot = clubDB.competitionRobots.find(r => r.id === editingRobot.id);
      if (robot) {
        robot.name = formData.name;
        robot.description = formData.description;
        robot.slots = formData.slots;
      }
      toast({ title: 'Robot Updated', description: 'Competition robot has been updated.' });
    } else {
      const newRobot: CompetitionRobot = {
        id: clubDB.competitionRobots.length + 1,
        ...formData,
        signups: [],
      };
      clubDB.competitionRobots.push(newRobot);
      toast({ title: 'Robot Created', description: 'New competition robot has been added.' });
    }

    saveDatabase();
    setDialogOpen(false);
    resetForm();
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

  const handleDelete = (id: number) => {
    clubDB.competitionRobots = clubDB.competitionRobots.filter(r => r.id !== id);
    saveDatabase();
    toast({ title: 'Robot Deleted', description: 'Competition robot has been removed.' });
  };

  const resetForm = () => {
    setEditingRobot(null);
    setFormData({
      name: '',
      description: '',
      slots: 3,
    });
  };

  const getMemberName = (memberId: string | number) => {
    return memberNames[memberId.toString()] || 'Unknown';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Competition Management</h1>
          <p className="text-muted-foreground">Manage competition robots and team sign-ups</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>Add Competition Robot</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRobot ? 'Edit Robot' : 'New Competition Robot'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Robot Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>
              <div>
                <Label htmlFor="slots">Team Slots</Label>
                <Input
                  id="slots"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.slots}
                  onChange={(e) => setFormData({ ...formData, slots: parseInt(e.target.value) })}
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

      <div className="grid md:grid-cols-2 gap-6">
        {clubDB.competitionRobots.map((robot) => (
          <Card key={robot.id}>
            <CardHeader>
              <CardTitle className="text-lg">{robot.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{robot.description}</p>
              
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{robot.signups.length} / {robot.slots}</span>
                <span className="text-muted-foreground">slots filled</span>
              </div>

              {robot.signups.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Team Members:</p>
                  <div className="space-y-1">
                    {robot.signups.map((memberId, index) => (
                      <p key={index} className="text-sm text-muted-foreground">
                        • {getMemberName(memberId)}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(robot)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(robot.id)}
                >
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
