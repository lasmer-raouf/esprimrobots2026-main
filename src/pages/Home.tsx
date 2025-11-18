import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { PublicHeader } from '@/components/PublicHeader';
import { WelcomePopup } from '@/components/WelcomePopup';
import { VideoBackground } from '@/components/VideoBackground';
import { supabase } from '@/integrations/supabase/client';

const typingTexts = ['Innovators.', 'Builders.', 'Engineers.', 'IEEE RAS ESPRIM SB.'];

type Announcement = { id: number; content: string };

export default function Home() {
  const navigate = useNavigate();
  const [typingText, setTypingText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const [videoUrl, setVideoUrl] = useState('');
  const [videoType, setVideoType] = useState<'local' | 'youtube' | 'none'>('none');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [showApplyBtn, setShowApplyBtn] = useState(false);
  const [showInterviewBtn, setShowInterviewBtn] = useState(false);
  const [showResultBtn, setShowResultBtn] = useState(false);

  useEffect(() => {
    loadSettings();
    loadAnnouncements();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('key, value');
      if (error) throw error;
      if (!data) return;

      data.forEach(setting => {
        switch (setting.key) {
          case 'video_background_url':
            // prepend /videos/ for local files
            setVideoUrl(setting.value ? `/videos/${setting.value}` : '');
            break;
          case 'video_background_type':
            setVideoType(setting.value as 'local' | 'youtube' | 'none');
            break;
          case 'show_apply_btn':
            setShowApplyBtn(setting.value === 'true');
            break;
          case 'show_interview_btn':
            setShowInterviewBtn(setting.value === 'true');
            break;
          case 'show_result_btn':
            setShowResultBtn(setting.value === 'true');
            break;
        }
      });
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, content')
        .order('id', { ascending: false });
      if (error) throw error;
      if (data) setAnnouncements(data);
    } catch (err) {
      console.error('Error loading announcements:', err);
    }
  };

  // Typing effect
  useEffect(() => {
    const currentText = typingTexts[textIndex];
    const getTypingSpeed = () => {
      if (isDeleting) return 30 + Math.random() * 20;
      const baseSpeed = 80 + Math.random() * 70;
      if (['.', ',', '!', '?'].includes(currentText[typingText.length])) return baseSpeed * 2;
      if (currentText[typingText.length - 1] === ' ') return baseSpeed * 1.5;
      return baseSpeed;
    };

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setTypingText(currentText.slice(0, typingText.length + 1));
        if (typingText === currentText) setTimeout(() => setIsDeleting(true), 2000 + Math.random() * 1000);
      } else {
        setTypingText(currentText.slice(0, typingText.length - 1));
        if (typingText === '') {
          setIsDeleting(false);
          setTextIndex((textIndex + 1) % typingTexts.length);
        }
      }
    }, getTypingSpeed());

    return () => clearTimeout(timeout);
  }, [typingText, isDeleting, textIndex]);

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <WelcomePopup />

      {announcements.length > 0 && (
        <div className="announcement-bar bg-primary/10 border-b border-primary/20 py-3 relative">
          <div className="marquee inline-block">
            <span className="text-primary font-semibold text-lg px-8">
              {announcements.map(a => (
                <span key={a.id} className="mr-16">
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
              <span className="inline-block w-1 h-[1em] bg-primary ml-1 animate-[blink_1s_step-end_infinite]" />
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Building the future of robotics, one innovation at a time
            </p>

            <div className="flex flex-col gap-4 justify-center items-center px-4">
              {showApplyBtn && (
                <Button 
                  size="lg" 
                  className="text-lg px-8 animate-glow w-full sm:w-auto"
                  onClick={() => navigate('/apply')}
                >
                  Apply Now
                </Button>
              )}
              {showInterviewBtn && (
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="text-lg px-8 w-full sm:w-auto"
                >
                  Interview List
                </Button>
              )}
              {showResultBtn && (
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
