import { PublicHeader } from '@/components/PublicHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });
      
      if (data) {
        setEvents(data);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
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
          <div className="text-center">Loading events...</div>
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
                  {event.description && (
                    <p className="text-muted-foreground">{event.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{format(new Date(event.event_date), 'PPP p')}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
