import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, FolderKanban, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RecentApplication {
  id: string;
  name: string;
  major?: string | null;
  application_status?: string | null;
  application_submitted_at?: string | null;
}

interface CompetitionRobot {
  id: number;
  name: string;
  slots: number;
  signups: Array<{ id: number; user_id: string | null }>;
}

export function AdminOverview() {
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [pendingApplications, setPendingApplications] = useState<number>(0);
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [activeProjects, setActiveProjects] = useState<number>(0);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionRobot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllStats = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMembersCount(),
        loadApplications(),
        loadProjects(),
        loadCompetitionTeams(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // LOAD TOTAL MEMBERS (profiles count)
  // -----------------------------
  const loadMembersCount = async () => {
    try {
      // use head+count to get exact count without returning rows
      const res: any = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (res.error) {
        console.error('Error counting profiles:', res.error);
        setTotalMembers(0);
        return;
      }

      // supabase client may place count on res.count
      setTotalMembers(Number(res.count ?? 0));
    } catch (err) {
      console.error('Unexpected error counting profiles:', err);
      setTotalMembers(0);
    }
  };

  // -----------------------------
  // LOAD APPLICATIONS (pending + recent)
  // -----------------------------
  const loadApplications = async () => {
    try {
      // Count pending applications
      const pendingCountRes: any = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('application_status', 'pending');

      if (pendingCountRes.error) {
        console.error('Error counting pending applications:', pendingCountRes.error);
        setPendingApplications(0);
      } else {
        setPendingApplications(Number(pendingCountRes.count ?? 0));
      }

      // Fetch recent pending applications (latest 5)
      const recentRes: any = await supabase
        .from('profiles')
        .select('id, name, major, application_status, application_submitted_at')
        .eq('application_status', 'pending')
        .order('application_submitted_at', { ascending: false })
        .limit(5);

      if (recentRes.error) {
        console.error('Error fetching recent pending applications:', recentRes.error);
        setRecentApplications([]);
      } else {
        setRecentApplications(recentRes.data ?? []);
      }
    } catch (err) {
      console.error('Unexpected error loading applications:', err);
      setPendingApplications(0);
      setRecentApplications([]);
    }
  };

  // -----------------------------
  // LOAD PROJECTS (count In Progress)
  // -----------------------------
  const loadProjects = async () => {
    try {
      // We only need counts; fetch rows then compute
      const res: any = await supabase.from('projects').select('title, status');

      if (res.error) {
        console.error('Error loading projects:', res.error);
        setActiveProjects(0);
        return;
      }

      const rows = res.data ?? [];
      const active = rows.filter((p: any) => p.status === 'In Progress').length;
      setActiveProjects(active);
    } catch (err) {
      console.error('Unexpected error loading projects:', err);
      setActiveProjects(0);
    }
  };

  // -----------------------------
  // LOAD COMPETITION ROBOTS (with signups)
  // -----------------------------
  const loadCompetitionTeams = async () => {
    try {
      // Use a nested select to fetch signups for each robot
      // Result shape: [{ id, name, slots, competition_signups: [ {id, user_id}, ... ] }, ...]
      const res: any = await supabase
        .from('competition_robots')
        .select('id, name, slots, competition_signups(id, user_id)');

      if (res.error) {
        console.error('Error loading competition robots:', res.error);
        setCompetitionTeams([]);
        return;
      }

      const rows = (res.data ?? []).map((r: any) => ({
        id: Number(r.id),
        name: r.name,
        slots: Number(r.slots ?? 0),
        signups: Array.isArray(r.competition_signups) ? r.competition_signups : [],
      })) as CompetitionRobot[];

      setCompetitionTeams(rows);
    } catch (err) {
      console.error('Unexpected error loading competition teams:', err);
      setCompetitionTeams([]);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of club statistics and activities</p>
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
            <div className="text-2xl font-bold">{loading ? '—' : totalMembers}</div>
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
            <div className="text-2xl font-bold">{loading ? '—' : pendingApplications}</div>
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
            <div className="text-2xl font-bold">{loading ? '—' : activeProjects}</div>
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
            <div className="text-2xl font-bold">{loading ? '—' : competitionTeams.length}</div>
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
                      <p className="text-sm text-muted-foreground">{app.major ?? '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                {loading ? 'Loading…' : 'No pending applications'}
              </p>
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
              {competitionTeams.length > 0 ? (
                competitionTeams.map((robot) => (
                  <div key={robot.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{robot.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {robot.signups?.length ?? 0} / {robot.slots} members
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">{loading ? 'Loading…' : 'No competition teams'}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
