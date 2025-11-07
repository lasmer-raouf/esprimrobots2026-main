import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clubDB, saveDatabase } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2 } from 'lucide-react';

export function AdminSettings() {
  const { toast } = useToast();
  const [showApplyBtn, setShowApplyBtn] = useState(clubDB.settings.showApplyBtn);
  const [showInterviewBtn, setShowInterviewBtn] = useState(clubDB.settings.showInterviewBtn);
  const [showResultBtn, setShowResultBtn] = useState(clubDB.settings.showResultBtn);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoType, setVideoType] = useState<'local' | 'youtube' | 'none'>('none');
  const [welcomePopupText, setWelcomePopupText] = useState('');

  useEffect(() => {
    loadVideoSettings();
    loadWelcomePopupText();
  }, []);

  const loadVideoSettings = async () => {
    const { data: urlData } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'video_background_url')
      .maybeSingle();

    const { data: typeData } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'video_background_type')
      .maybeSingle();

    if (urlData?.value) setVideoUrl(urlData.value);
    if (typeData?.value) setVideoType(typeData.value as 'local' | 'youtube' | 'none');
  };

  const loadWelcomePopupText = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'welcome_popup_text')
      .maybeSingle();

    if (data?.value) setWelcomePopupText(data.value);
  };

  const handleSaveSettings = () => {
    clubDB.settings.showApplyBtn = showApplyBtn;
    clubDB.settings.showInterviewBtn = showInterviewBtn;
    clubDB.settings.showResultBtn = showResultBtn;
    saveDatabase();
    
    toast({
      title: 'Settings Saved',
      description: 'Site settings have been updated successfully.',
    });
  };

  const handleAddAnnouncement = () => {
    if (!newAnnouncement.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an announcement message.',
        variant: 'destructive',
      });
      return;
    }

    clubDB.announcements.push({
      id: clubDB.announcements.length + 1,
      content: newAnnouncement,
      date: Date.now(),
    });

    saveDatabase();
    setNewAnnouncement('');

    toast({
      title: 'Announcement Added',
      description: 'New announcement has been posted.',
    });
  };

  const handleDeleteAnnouncement = (id: number) => {
    clubDB.announcements = clubDB.announcements.filter(a => a.id !== id);
    saveDatabase();

    toast({
      title: 'Announcement Deleted',
      description: 'The announcement has been removed.',
    });
  };

  const handleSaveVideoSettings = async () => {
    try {
      await supabase
        .from('site_settings')
        .upsert({ key: 'video_background_url', value: videoUrl }, { onConflict: 'key' });

      await supabase
        .from('site_settings')
        .upsert({ key: 'video_background_type', value: videoType }, { onConflict: 'key' });

      toast({
        title: 'Video Settings Saved',
        description: 'Background video settings have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save video settings.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveWelcomePopup = async () => {
    try {
      await supabase
        .from('site_settings')
        .upsert({ key: 'welcome_popup_text', value: welcomePopupText }, { onConflict: 'key' });

      toast({
        title: 'Welcome Popup Saved',
        description: 'Welcome popup message has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save welcome popup.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Site Settings</h1>
        <p className="text-muted-foreground">Manage website configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hero Buttons Visibility</CardTitle>
          <CardDescription>Control which buttons appear on the home page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="apply-btn" className="flex-1">
              <div>
                <p className="font-medium">Apply Now Button</p>
                <p className="text-sm text-muted-foreground">Show the membership application button</p>
              </div>
            </Label>
            <Switch
              id="apply-btn"
              checked={showApplyBtn}
              onCheckedChange={setShowApplyBtn}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="interview-btn" className="flex-1">
              <div>
                <p className="font-medium">Interview List Button</p>
                <p className="text-sm text-muted-foreground">Show the interview schedule button</p>
              </div>
            </Label>
            <Switch
              id="interview-btn"
              checked={showInterviewBtn}
              onCheckedChange={setShowInterviewBtn}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="result-btn" className="flex-1">
              <div>
                <p className="font-medium">Interview Results Button</p>
                <p className="text-sm text-muted-foreground">Show the interview results button</p>
              </div>
            </Label>
            <Switch
              id="result-btn"
              checked={showResultBtn}
              onCheckedChange={setShowResultBtn}
            />
          </div>

          <Button onClick={handleSaveSettings} className="w-full">
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Announcements</CardTitle>
          <CardDescription>Manage site-wide announcements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {clubDB.announcements.map((announcement) => (
              <div key={announcement.id} className="p-4 bg-muted rounded-lg flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p>{announcement.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(announcement.date).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteAnnouncement(announcement.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Label htmlFor="new-announcement">Add New Announcement</Label>
            <Textarea
              id="new-announcement"
              value={newAnnouncement}
              onChange={(e) => setNewAnnouncement(e.target.value)}
              placeholder="Enter announcement message..."
              rows={3}
            />
            <Button onClick={handleAddAnnouncement}>
              Post Announcement
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Welcome Popup</CardTitle>
          <CardDescription>Set a message that appears when users visit the site for the first time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="welcome-popup">Welcome Message</Label>
            <Textarea
              id="welcome-popup"
              value={welcomePopupText}
              onChange={(e) => setWelcomePopupText(e.target.value)}
              placeholder="Enter your welcome message here..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              This message will be shown in a popup dialog when users visit your site for the first time. Leave empty to disable the popup.
            </p>
          </div>

          <Button onClick={handleSaveWelcomePopup} className="w-full">
            Save Welcome Popup
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Video Background</CardTitle>
          <CardDescription>Set a video background for the home page hero section</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-type">Video Type</Label>
            <Select value={videoType} onValueChange={(value) => setVideoType(value as 'local' | 'youtube' | 'none')}>
              <SelectTrigger id="video-type">
                <SelectValue placeholder="Select video type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Video</SelectItem>
                <SelectItem value="local">Local Video File</SelectItem>
                <SelectItem value="youtube">YouTube Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {videoType !== 'none' && (
            <div className="space-y-2">
              <Label htmlFor="video-url">
                {videoType === 'local' ? 'Video File URL' : 'YouTube Video URL'}
              </Label>
              <Input
                id="video-url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder={
                  videoType === 'local'
                    ? 'https://example.com/video.mp4'
                    : 'https://www.youtube.com/watch?v=...'
                }
              />
              <p className="text-xs text-muted-foreground">
                {videoType === 'local'
                  ? 'Enter the direct URL to your video file (MP4 format recommended)'
                  : 'Paste any YouTube video URL (watch, share, or embed format)'}
              </p>
            </div>
          )}

          <Button onClick={handleSaveVideoSettings} className="w-full">
            Save Video Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
