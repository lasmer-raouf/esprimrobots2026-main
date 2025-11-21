import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Announcement {
  id: number;
  content: string;
  date: string;
}

export function AdminSettings() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [showApplyBtn, setShowApplyBtn] = useState(false);
  const [showInterviewBtn, setShowInterviewBtn] = useState(false);
  const [showResultBtn, setShowResultBtn] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoType, setVideoType] = useState<'local' | 'youtube' | 'none'>('none');
  const [welcomePopupText, setWelcomePopupText] = useState('');

  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);

  useEffect(() => {
    // run admin check and load basic settings regardless
    checkAdmin().finally(() => {
      loadSettings();
      loadAnnouncements();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // --- Check whether current user has an 'admin' role ---
  const checkAdmin = async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        // If SELECT on user_roles fails, assume not admin but do not crash
        console.error('checkAdmin error', error);
        setIsAdmin(false);
        return;
      }
      setIsAdmin(Array.isArray(data) && data.some((r: any) => r.role === 'admin'));
    } catch (err) {
      console.error('checkAdmin unexpected', err);
      setIsAdmin(false);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('*');
      if (error) {
        console.error('loadSettings error', error);
        return;
      }
      if (data) {
        setShowApplyBtn(data.find((s: any) => s.key === 'show_apply_btn')?.value === 'true');
        setShowInterviewBtn(data.find((s: any) => s.key === 'show_interview_btn')?.value === 'true');
        setShowResultBtn(data.find((s: any) => s.key === 'show_result_btn')?.value === 'true');
        setVideoUrl(data.find((s: any) => s.key === 'video_background_url')?.value || '');
        setVideoType((data.find((s: any) => s.key === 'video_background_type')?.value as any) || 'none');
        setWelcomePopupText(data.find((s: any) => s.key === 'welcome_popup_text')?.value || '');
      }
    } catch (err) {
      console.error('loadSettings unexpected', err);
    }
  };

  const loadAnnouncements = async () => {
    setLoadingAnnouncements(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        // likely a 403 / RLS issue — handle gracefully
        console.error('loadAnnouncements error', error);
        // Give a helpful message (don't spam toasts)
        if ((error as any).status === 403 || (error as any).message?.toLowerCase().includes('row-level security')) {
          toast({ title: 'Permission denied', description: 'You are not allowed to view announcements.', variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: 'Failed to load announcements.', variant: 'destructive' });
        }
        setAnnouncements([]);
        return;
      }

      setAnnouncements((data || []) as Announcement[]);
    } catch (err) {
      console.error('loadAnnouncements unexpected', err);
      setAnnouncements([]);
      toast({ title: 'Error', description: 'Unexpected error while loading announcements.', variant: 'destructive' });
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      await supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' });
    } catch (err) {
      console.error('saveSetting error', err);
      toast({ title: 'Error', description: `Failed saving ${key}`, variant: 'destructive' });
    }
  };

  const handleSaveSettings = async () => {
    await saveSetting('show_apply_btn', showApplyBtn.toString());
    await saveSetting('show_interview_btn', showInterviewBtn.toString());
    await saveSetting('show_result_btn', showResultBtn.toString());
    toast({ title: 'Settings Saved', description: 'Site settings have been updated successfully.' });
  };

  // --- Only admins can add announcements client-side; enforce that check before insert ---
  const handleAddAnnouncement = async () => {
    if (!isAdmin) {
      toast({ title: 'Not authorized', description: 'Only admins may add announcements.', variant: 'destructive' });
      return;
    }
    if (!newAnnouncement.trim()) {
      toast({ title: 'Error', description: 'Please enter an announcement message.', variant: 'destructive' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert([{ content: newAnnouncement.trim(), date: new Date().toISOString() }])
        .select();

      if (error) {
        console.error('Add announcement error', error);
        if ((error as any).status === 403 || (error as any).message?.toLowerCase().includes('row-level security')) {
          toast({ title: 'Permission denied', description: 'You are not allowed to add announcements.', variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: 'Failed to add announcement.', variant: 'destructive' });
        }
        return;
      }

      if (data && data.length > 0) {
        setAnnouncements(prev => [data[0], ...prev]);
        setNewAnnouncement('');
        toast({ title: 'Announcement Added', description: 'New announcement has been posted.' });
      }
    } catch (err) {
      console.error('handleAddAnnouncement unexpected', err);
      toast({ title: 'Error', description: 'Unexpected error while posting announcement.', variant: 'destructive' });
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!isAdmin) {
      toast({ title: 'Not authorized', description: 'Only admins may delete announcements.', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) {
        console.error('delete announcement error', error);
        if ((error as any).status === 403 || (error as any).message?.toLowerCase().includes('row-level security')) {
          toast({ title: 'Permission denied', description: 'You are not allowed to delete announcements.', variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: 'Failed to delete announcement.', variant: 'destructive' });
        }
        return;
      }
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Announcement Deleted', description: 'The announcement has been removed.' });
    } catch (err) {
      console.error('handleDeleteAnnouncement unexpected', err);
      toast({ title: 'Error', description: 'Unexpected error while deleting announcement.', variant: 'destructive' });
    }
  };

  const handleSaveVideoSettings = async () => {
    await saveSetting('video_background_url', videoUrl);
    await saveSetting('video_background_type', videoType);
    toast({ title: 'Video Settings Saved', description: 'Background video settings have been updated.' });
  };

  const handleSaveWelcomePopup = async () => {
    await saveSetting('welcome_popup_text', welcomePopupText);
    toast({ title: 'Welcome Popup Saved', description: 'Welcome popup message has been updated.' });
  };

  return (
    <div className="space-y-8">
      {/* Hero Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Buttons Visibility</CardTitle>
          <CardDescription>Control which buttons appear on the home page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            { label: 'Apply Now Button', desc: 'Show the membership application button', state: showApplyBtn, setState: setShowApplyBtn },
            { label: 'Interview List Button', desc: 'Show the interview schedule button', state: showInterviewBtn, setState: setShowInterviewBtn },
            { label: 'Interview Results Button', desc: 'Show the interview results button', state: showResultBtn, setState: setShowResultBtn },
          ].map((btn, i) => (
            <div key={i} className="flex items-center justify-between">
              <Label className="flex-1">
                <div>
                  <p className="font-medium">{btn.label}</p>
                  <p className="text-sm text-muted-foreground">{btn.desc}</p>
                </div>
              </Label>
              <Switch checked={btn.state} onCheckedChange={btn.setState} />
            </div>
          ))}
          <Button onClick={handleSaveSettings} className="w-full">Save Settings</Button>
        </CardContent>
      </Card>

      {/* Announcements */}
      <Card>
        <CardHeader>
          <CardTitle>Announcements</CardTitle>
          <CardDescription>Manage site-wide announcements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingAnnouncements && <p className="text-sm text-muted-foreground">Loading announcements...</p>}

          {/* If user is not admin and announcements were blocked by RLS, we show a helpful message */}
          {!isAdmin && !loadingAnnouncements && announcements.length === 0 && (
            <p className="text-sm text-muted-foreground">Announcements are not visible to your account. If you think this is an error, ask an administrator to review RLS policies.</p>
          )}

          {announcements.map((a) => (
            <div key={a.id} className="p-4 bg-muted rounded-lg flex items-start justify-between gap-4">
              <div className="flex-1">
                <p>{a.content}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(a.date).toLocaleDateString()}</p>
              </div>
              {isAdmin ? (
                <Button variant="ghost" size="icon" onClick={() => handleDeleteAnnouncement(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}

          {/* Add Announcement (only visible/enabled to admins) */}
          <div className="space-y-4">
            <Label htmlFor="new-announcement">Add New Announcement</Label>
            <Textarea
              id="new-announcement"
              value={newAnnouncement}
              onChange={(e) => setNewAnnouncement(e.target.value)}
              rows={3}
              disabled={!isAdmin}
            />
            <Button onClick={handleAddAnnouncement} disabled={!isAdmin}>Post Announcement</Button>
            {!isAdmin && <p className="text-sm text-muted-foreground">You must be an admin to post announcements.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Welcome Popup */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome Popup</CardTitle>
          <CardDescription>Set a message that appears when users visit the site for the first time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={welcomePopupText}
            onChange={(e) => setWelcomePopupText(e.target.value)}
            rows={5}
            placeholder="Enter your welcome message here..."
          />
          <Button onClick={handleSaveWelcomePopup} className="w-full">Save Welcome Popup</Button>
        </CardContent>
      </Card>

      {/* Video Background */}
      <Card>
        <CardHeader>
          <CardTitle>Video Background</CardTitle>
          <CardDescription>Set a video background for the home page hero section</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={videoType} onValueChange={(v) => setVideoType(v as 'local' | 'youtube' | 'none')}>
            <SelectTrigger>
              <SelectValue placeholder="Select video type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Video</SelectItem>
              <SelectItem value="local">Local Video File</SelectItem>
              <SelectItem value="youtube">YouTube Video</SelectItem>
            </SelectContent>
          </Select>

          {videoType !== 'none' && (
            <>
              <Label>{videoType === 'local' ? 'Video File URL' : 'YouTube Video URL'}</Label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={videoType === 'local' ? 'https://example.com/video.mp4' : 'https://www.youtube.com/watch?v=...'} />
            </>
          )}

          <Button onClick={handleSaveVideoSettings} className="w-full">Save Video Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
