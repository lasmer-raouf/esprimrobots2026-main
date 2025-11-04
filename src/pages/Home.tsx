import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { clubDB } from '@/lib/database';
import { PublicHeader } from '@/components/PublicHeader';
import { VideoBackground } from '@/components/VideoBackground';
import { supabase } from '@/integrations/supabase/client';

const typingTexts = ['Innovators.', 'Builders.', 'Engineers.', 'ESPRIM ROBOTS.'];

export default function Home() {
  const navigate = useNavigate();
  const [typingText, setTypingText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoType, setVideoType] = useState<'local' | 'youtube' | 'none'>('none');
  const [announcements, setAnnouncements] = useState<Array<{ content: string }>>([]);

  useEffect(() => {
    loadVideoSettings();
    loadAnnouncements();
  }, []);

  const loadVideoSettings = async () => {
    const { data: urlData } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'video_background_url')
      .single();

    const { data: typeData } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'video_background_type')
      .single();

    if (urlData?.value) {
      setVideoUrl(urlData.value);
    } else {
      // No custom video set in the admin settings — fall back to the local default
      const defaultFile = clubDB.settings.videoFilename || '16_10.mp4';
      // Ensure the file is served from the public root
      setVideoUrl(defaultFile.startsWith('/') ? defaultFile : `/${defaultFile}`);
      // If admin hasn't set a type, default to a local video
      if (!typeData?.value) setVideoType('local');
    }

    if (typeData?.value) setVideoType(typeData.value as 'local' | 'youtube' | 'none');
  };

  const loadAnnouncements = async () => {
    setAnnouncements(clubDB.announcements.map(a => ({ content: a.content })));
  };

  useEffect(() => {
    const currentText = typingTexts[textIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setTypingText(currentText.slice(0, typingText.length + 1));
        if (typingText === currentText) {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        setTypingText(currentText.slice(0, typingText.length - 1));
        if (typingText === '') {
          setIsDeleting(false);
          setTextIndex((textIndex + 1) % typingTexts.length);
        }
      }
    }, isDeleting ? 50 : 100);

    return () => clearTimeout(timeout);
  }, [typingText, isDeleting, textIndex]);

  return (
    <div className="min-h-screen">
      <PublicHeader />
      
      {announcements.length > 0 && (
        <div className="announcement-bar bg-primary/10 border-b border-primary/20 py-3 relative">
          <div className="marquee inline-block">
            <span className="text-primary font-semibold text-lg px-8">
              {announcements.map((a, idx) => (
                <span key={idx} className="mr-16">
                  🔔 {a.content}
                </span>
              ))}
            </span>
          </div>
        </div>
      )}
      
      <main>
        <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
          <VideoBackground videoUrl={videoUrl} type={videoType} />
          
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/50 to-background z-10" />
          
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
          
          <div className="relative z-20 text-center px-4 animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              We are <span className="text-primary">{typingText}</span>
              <span className="animate-pulse text-primary">|</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Building the future of robotics, one innovation at a time
            </p>

            <div className="flex flex-col gap-4 justify-center items-center px-4">
              {clubDB.settings.showApplyBtn && (
                <Button 
                  size="lg" 
                  className="text-lg px-8 animate-glow w-full sm:w-auto"
                  onClick={() => navigate('/apply')}
                >
                  Apply Now
                </Button>
              )}
              {clubDB.settings.showInterviewBtn && (
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="text-lg px-8 w-full sm:w-auto"
                >
                  Interview List
                </Button>
              )}
              {clubDB.settings.showResultBtn && (
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="text-lg px-8 w-full sm:w-auto"
                >
                  Interview Results
                </Button>
              )}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
        </section>

        <section className="py-20 px-4">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card border border-border rounded-lg p-8 hover:border-primary transition-colors">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-2xl font-bold mb-3">Innovation</h3>
                <p className="text-muted-foreground">
                  Pushing the boundaries of robotics with cutting-edge technology and creative solutions
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-8 hover:border-secondary transition-colors">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-2xl font-bold mb-3">Competition</h3>
                <p className="text-muted-foreground">
                  Competing at national and international robotics competitions
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-8 hover:border-primary transition-colors">
                <div className="text-4xl mb-4">🎓</div>
                <h3 className="text-2xl font-bold mb-3">Learning</h3>
                <p className="text-muted-foreground">
                  Hands-on workshops and mentorship to develop technical skills
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
