import { PublicHeader } from '@/components/PublicHeader';
import { clubDB } from '@/lib/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Projects() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">Our Projects</h1>
        <p className="text-center text-muted-foreground mb-16 text-lg">
          Innovative robotics projects that push the boundaries of technology
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {clubDB.projects.map((project) => (
            <Card key={project.id} className="hover:border-primary transition-all hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-xl">{project.title}</CardTitle>
                  <Badge variant={project.status === 'Completed' ? 'default' : 'secondary'}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{project.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
