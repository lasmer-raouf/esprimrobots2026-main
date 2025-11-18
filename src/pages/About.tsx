import { PublicHeader } from '@/components/PublicHeader';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function About() {
  const [title, setTitle] = useState('About IEEE RAS ESPRIM SB');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAboutContent();
  }, []);

  const loadAboutContent = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['about_us_title', 'about_us_content']);

      if (data) {
        const titleSetting = data.find(s => s.key === 'about_us_title');
        const contentSetting = data.find(s => s.key === 'about_us_content');
        
        if (titleSetting) setTitle(titleSetting.value);
        if (contentSetting) setContent(contentSetting.value);
      }
    } catch (error) {
      console.error('Error loading about content:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <main className="container mx-auto px-4 py-16 text-center">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-8">{title}</h1>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-lg leading-relaxed whitespace-pre-wrap">{content}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
