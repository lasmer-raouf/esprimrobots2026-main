import { PublicHeader } from '@/components/PublicHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  event_date: string; // stored as ISO string in DB
  location?: string | null;
}

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadEvents = async () => {
      if (!mounted) return;
      setLoading(true);
      setError(null);

      try {
        const { data, error: sbError } = await supabase
          .from<EventItem>('events')
          .select('id, title, description, event_date, location')
          .order('event_date', { ascending: true });

        if (sbError) {
          console.error('Supabase error loading events:', sbError);
          if (!mounted) return;
          setError('Failed to load events from the database.');
          // keep local empty list
          return;
        }

        if (Array.isArray(data) && data.length > 0) {
          if (!mounted) return;
          setEvents(data);
        } else {
          // DB returned empty — keep local empty list
          if (!mounted) return;
          setEvents([]);
        }
      } catch (err) {
        console.error('Unexpected error loading events:', err);
        if (!mounted) return;
        setError('An unexpected error occurred while loading events.');
        // keep local fallback (empty)
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    loadEvents();

    return () => {
      mounted = false;
    };
  }, []);

  const renderDate = (iso?: string) => {
    if (!iso) return 'TBA';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return 'TBA';
    return format(parsed, 'PPP p'); // e.g. Jan 1, 2026 5:00 PM
  };

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">Events & Meetings</h1>
        <p className="text-center text-muted-foreground mb-16 text-lg">
          Stay updated with our upcoming events and meetings
        </p>

        {loading ? (
          <div className="text-center py-12">
            <p>Loading events…</p>
          </div>
        ) : error ? (
          <div className="max-w-2xl mx-auto mb-6">
            <Card>
              <CardContent className="py-6">
                <p className="text-red-600 mb-2">{error}</p>
                <p className="text-sm text-muted-foreground">
                  Showing local fallback events if available.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : events.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="py-8 text-center text-muted-foreground">
              No upcoming events scheduled
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-start gap-2">
                    <Calendar className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <span>{event.title}</span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  {event.description ? (
                    <p className="text-muted-foreground">{event.description}</p>
                  ) : null}

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{renderDate(event.event_date)}</span>
                  </div>

                  {event.location ? (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{event.location}</span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
