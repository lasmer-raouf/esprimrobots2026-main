import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [welcomeText, setWelcomeText] = useState('');

  useEffect(() => {
    loadWelcomePopup();
  }, []);

  const loadWelcomePopup = async () => {
    // Check if user has already seen the popup
    const hasSeenPopup = localStorage.getItem('hasSeenWelcomePopup');
    
    if (hasSeenPopup) {
      return;
    }

    // Load welcome text from database
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'welcome_popup_text')
      .maybeSingle();

    if (data?.value && data.value.trim()) {
      setWelcomeText(data.value);
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    localStorage.setItem('hasSeenWelcomePopup', 'true');
    setIsOpen(false);
  };

  if (!welcomeText) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to IEEE RAS ESPRIM SB!</DialogTitle>
          <DialogDescription className="text-base pt-4 whitespace-pre-line">
            {welcomeText}
          </DialogDescription>
        </DialogHeader>
        <Button onClick={handleClose} className="w-full">
          Got it!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
