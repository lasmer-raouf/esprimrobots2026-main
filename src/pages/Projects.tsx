import { PublicHeader } from '@/components/PublicHeader';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Project = {
  id: number;
  title: string;
  description: string;
  status: 'In Progress' | 'Completed';
  image_url?: string;
  created_at?: string;
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: sbError } = await supabase
        .from<Project>('projects')
        .select('id, title, description, status, image_url, created_at')
        .order('created_at', { ascending: false });

      if (sbError) {
        console.error('Supabase error loading projects:', sbError);
        setError(sbError);
        return;
      }

      setProjects(data ?? []);
    } catch (err) {
      console.error('Unexpected error loading projects:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">Our Projects</h1>
        <p className="text-center text-muted-foreground mb-8 text-lg">
          Innovative robotics projects that push the boundaries of technology
        </p>

        {loading ? (
          <div className="text-center py-12">
            <p>Loading projects…</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-2">Failed to load projects from the database.</p>
            <p className="text-sm text-muted-foreground">Please try again later.</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No projects to show yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => (
              <Card key={project.id} className="hover:border-primary transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 w-full">
                    <CardTitle className="text-xl">{project.title}</CardTitle>
                    <Badge variant={project.status === 'Completed' ? 'default' : 'secondary'}>
                      {project.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  {project.image_url && (
                    <img
                      src={project.image_url}
                      alt={project.title}
                      className="w-full h-40 object-cover rounded-md mb-4"
                    />
                  )}
                  <p className="text-muted-foreground">{project.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
