import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface ApplicationView {
  application_status: string;
  application_interview_date?: string | null;
  application_interview_location?: string | null;
  application_reason?: string | null; // applicant-provided reason
  application_notes?: string | null;  // admin/internal notes (not shown by default)
}

export function ApplicationStatus() {
  const { user } = useAuth();
  const [application, setApplication] = useState<ApplicationView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // load when user changes
    if (!user?.id) {
      setApplication(null);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        // Query merged application fields from profiles (applications table removed)
        const { data, error } = await supabase
          .from('profiles')
          .select(
            `application_status,
             application_interview_date,
             application_interview_location,
             application_reason,
             application_notes`
          )
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading application status from profiles:', error);
          setApplication(null);
        } else if (!data) {
          setApplication(null);
        } else {
          setApplication(data as ApplicationView);
        }
      } catch (err) {
        console.error('Unexpected error loading application:', err);
        setApplication(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  if (loading) return null;
  if (!application) return null;

  const status = application.application_status ?? 'pending';

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'accepted':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusMessage = (s: string) => {
    switch (s) {
      case 'accepted':
        return 'Congratulations! Your application has been accepted.';
      case 'rejected':
        return 'Unfortunately, your application has been rejected.';
      default:
        return 'Your application is currently being reviewed.';
    }
  };

  // Safe format helper
  const formatDate = (iso?: string | null) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return null;
      return format(d, 'PPP p');
    } catch {
      return null;
    }
  };

  const interviewFormatted = formatDate(application.application_interview_date);

  return (
    <Card className="mb-6 border-primary">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Application Status
          <Badge className={getStatusColor(status)}>
            {String(status).toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{getStatusMessage(status)}</p>

        {/* Interview details (shown when accepted and interview info exists) */}
        {status === 'accepted' && interviewFormatted && (
          <div className="bg-accent p-4 rounded-lg space-y-3">
            <h4 className="font-semibold">Interview Details</h4>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{interviewFormatted}</span>
            </div>

            {application.application_interview_location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{application.application_interview_location}</span>
              </div>
            )}
          </div>
        )}

        {/* Applicant-provided reason */}
        {application.application_reason && (
          <div>
            <h4 className="font-semibold mb-2">Why you applied</h4>
            <p className="text-sm text-muted-foreground">{application.application_reason}</p>
          </div>
        )}

        {/* (Optional) Admin/internal notes — not shown by default, uncomment if you want */}
        {/*
        {application.application_notes && (
          <div>
            <h4 className="font-semibold mb-2">Admin Notes</h4>
            <p className="text-sm text-muted-foreground">{application.application_notes}</p>
          </div>
        )}
        */}
      </CardContent>
    </Card>
  );
}
