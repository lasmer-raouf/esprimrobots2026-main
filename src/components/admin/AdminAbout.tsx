import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

export function AdminAbout() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
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
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load About Us settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update title
      await supabase
        .from('site_settings')
        .update({ value: title, updated_at: new Date().toISOString() })
        .eq('key', 'about_us_title');

      // Update content
      await supabase
        .from('site_settings')
        .update({ value: content, updated_at: new Date().toISOString() })
        .eq('key', 'about_us_content');

      toast({
        title: 'Success',
        description: 'About Us page updated successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">About Us Page</h1>
        <p className="text-muted-foreground mt-2">Manage the About Us page content</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Page Content</CardTitle>
          <CardDescription>Edit the title and content displayed on the About Us page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Page Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="About IEEE RAS ESPRIM SB"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Page Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the about us content..."
              rows={12}
              className="resize-none"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
