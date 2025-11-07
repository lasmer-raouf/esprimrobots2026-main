import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface Application {
  status: string;
  interview_date?: string;
  interview_location?: string;
  notes?: string;
}

export function ApplicationStatus() {
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadApplication();
    }
  }, [user]);

  const loadApplication = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    setApplication(data);
    setLoading(false);
  };

  if (loading) {
    return null;
  }

  if (!application) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Congratulations! Your application has been accepted.';
      case 'rejected':
        return 'Unfortunately, your application has been rejected.';
      default:
        return 'Your application is currently being reviewed.';
    }
  };

  return (
    <Card className="mb-6 border-primary">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Application Status
          <Badge className={getStatusColor(application.status)}>
            {application.status.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{getStatusMessage(application.status)}</p>
        
        {application.status === 'accepted' && application.interview_date && (
          <div className="bg-accent p-4 rounded-lg space-y-3">
            <h4 className="font-semibold">Interview Details</h4>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{format(new Date(application.interview_date), 'PPP p')}</span>
            </div>
            {application.interview_location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{application.interview_location}</span>
              </div>
            )}
          </div>
        )}
        
        {application.notes && (
          <div>
            <h4 className="font-semibold mb-2">Additional Notes</h4>
            <p className="text-sm text-muted-foreground">{application.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
