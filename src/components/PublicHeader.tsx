import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function PublicHeader() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showApplyBtn, setShowApplyBtn] = useState<boolean>(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Select key/value pairs instead of a single column
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value');

      if (error) {
        console.warn('Settings load error:', error);
        return;
      }

      if (data && Array.isArray(data)) {
        const applySetting = data.find(s => s.key === 'show_apply_btn');
        if (applySetting) setShowApplyBtn(applySetting.value === 'true');
      }
    } catch (err) {
      console.error('Unexpected settings error:', err);
    }
  };

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* LOGO */}
          <button
            onClick={() => navigate('/')}
            className="text-xl font-bold tracking-tight hover:text-primary transition-colors"
          >
            IEEE RAS ESPRIM SBC          </button>

          {/* MOBILE MENU TRIGGER */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>

          {/* NAVIGATION LINKS */}
          <div
            className={`${
              mobileMenuOpen ? 'flex' : 'hidden'
            } md:flex absolute md:relative top-full left-0 right-0 md:top-auto 
              flex-col md:flex-row gap-6 md:gap-8 items-center bg-card 
              md:bg-transparent p-4 md:p-0 border-b md:border-0`}
          >
            {['/', '/team', '/about', '/projects', '/competition', '/events', '/news'].map((path, idx) => {
              const label = ['Home', 'Our Team', 'About Us', 'Projects', 'Competition', 'Events', 'News'][idx];
              return (
                <button
                  key={path}
                  onClick={() => {
                    navigate(path);
                    setMobileMenuOpen(false);
                  }}
                  className="hover:text-primary transition-colors"
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* RIGHT BUTTONS */}
          <div className="hidden md:flex gap-3">
            {showApplyBtn && (
              <Button variant="secondary" onClick={() => navigate('/apply')}>
                Apply Now
              </Button>
            )}
            <Button onClick={() => navigate('/login')}>Login</Button>
          </div>
        </div>
      </nav>
    </header>
  );
}
