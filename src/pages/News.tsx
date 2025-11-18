import { PublicHeader } from '@/components/PublicHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
}

export default function News() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const { data } = await supabase
        .from('news')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
      
      if (data) {
        setNews(data);
      }
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <PublicHeader />
      
      <main className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Newspaper className="w-10 h-10 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold text-center">Club News</h1>
        </div>
        <p className="text-center text-muted-foreground mb-16 text-lg">
          Stay updated with the latest news and announcements from IEEE RAS ESPRIM SB
        </p>

        {loading ? (
          <div className="text-center">Loading news...</div>
        ) : news.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="py-8 text-center text-muted-foreground">
              No news available at the moment
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8">
            {news.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-2xl flex-1">{item.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(item.created_at), 'PPP')}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {item.image_url && (
                    <img 
                      src={item.image_url} 
                      alt={item.title} 
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  )}
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {item.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
