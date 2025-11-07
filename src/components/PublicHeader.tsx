import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { clubDB } from '@/lib/database';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export function PublicHeader() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/')}
              className="text-xl font-bold tracking-tight hover:text-primary transition-colors"
            >
              ESPRIM ROBOTS
            </button>

            <button 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>

            <div className={`${mobileMenuOpen ? 'flex' : 'hidden'} md:flex absolute md:relative top-full left-0 right-0 md:top-auto flex-col md:flex-row gap-6 md:gap-8 items-center bg-card md:bg-transparent p-4 md:p-0 border-b md:border-0`}>
              <button 
                onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
                className="hover:text-primary transition-colors"
              >
                Home
              </button>
              <button 
                onClick={() => { navigate('/team'); setMobileMenuOpen(false); }}
                className="hover:text-primary transition-colors"
              >
                Our Team
              </button>
              <button 
                onClick={() => { navigate('/about'); setMobileMenuOpen(false); }}
                className="hover:text-primary transition-colors"
              >
                About Us
              </button>
              <button 
                onClick={() => { navigate('/projects'); setMobileMenuOpen(false); }}
                className="hover:text-primary transition-colors"
              >
                Projects
              </button>
              <button 
                onClick={() => { navigate('/competition'); setMobileMenuOpen(false); }}
                className="hover:text-primary transition-colors"
              >
                Competition
              </button>
              <button 
                onClick={() => { navigate('/events'); setMobileMenuOpen(false); }}
                className="hover:text-primary transition-colors"
              >
                Events
              </button>
              <button 
                onClick={() => { navigate('/news'); setMobileMenuOpen(false); }}
                className="hover:text-primary transition-colors"
              >
                News
              </button>
            </div>

            <div className="hidden md:flex gap-3">
              {clubDB.settings.showApplyBtn && (
                <Button 
                  variant="secondary"
                  onClick={() => navigate('/apply')}
                >
                  Apply Now
                </Button>
              )}
              <Button 
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
            </div>
          </div>
        </nav>
      </header>
  );
}
