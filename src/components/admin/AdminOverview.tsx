import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, FolderKanban, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Application {
  id: string;
  name: string;
  major: string;
  status: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

interface CompetitionRobot {
  id: string;
  name: string;
  slots: number;
  signups: any[];
}

export function AdminOverview() {
  const [totalMembers, setTotalMembers] = useState(0);
  const [pendingApplications, setPendingApplications] = useState(0);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [activeProjects, setActiveProjects] = useState(0);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionRobot[]>([]);

  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    await Promise.all([
      loadMembersCount(),
      loadApplications(),
      loadProjects(),
      loadCompetitionTeams(),
    ]);
  };

  // -----------------------------
  // LOAD TOTAL MEMBERS
  // -----------------------------
  const loadMembersCount = async () => {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    setTotalMembers(count || 0);
  };

  // -----------------------------
  // LOAD APPLICATIONS (PENDING + RECENT)
  // -----------------------------
  const loadApplications = async () => {
    const { data } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      const pending = data.filter(a => a.status === 'pending');
      setPendingApplications(pending.length);
      setRecentApplications(pending.slice(0, 5)); // latest 5
    }
  };

  // -----------------------------
  // LOAD PROJECTS
  // -----------------------------
  const loadProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*');

    if (!data) return;

    const active = data.filter(p => p.status === 'In Progress');
    setActiveProjects(active.length);
  };

  // -----------------------------
  // LOAD COMPETITION ROBOTS
  // -----------------------------
  const loadCompetitionTeams = async () => {
    const { data } = await supabase
      .from('competition_robots')
      .select('*');

    setCompetitionTeams(data || []);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of club statistics and activities
        </p>
      </div>

      {/* TOP STATS */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">Active club members</p>
          </CardContent>
        </Card>

        {/* Pending Applications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApplications}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        {/* Competition Teams */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Competition Teams</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{competitionTeams.length}</div>
            <p className="text-xs text-muted-foreground">Active teams</p>
          </CardContent>
        </Card>

      </div>

      {/* BOTTOM: APPLICATIONS + COMPETITION */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Recent Applications */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
          </CardHeader>
          <CardContent>
            {recentApplications.length > 0 ? (
              <div className="space-y-4">
                {recentApplications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{app.name}</p>
                      <p className="text-sm text-muted-foreground">{app.major}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No pending applications</p>
            )}
          </CardContent>
        </Card>

        {/* Competition Sign-ups */}
        <Card>
          <CardHeader>
            <CardTitle>Competition Sign-ups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {competitionTeams.map((robot) => (
                <div key={robot.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{robot.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {robot.signups?.length || 0} / {robot.slots} members
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
