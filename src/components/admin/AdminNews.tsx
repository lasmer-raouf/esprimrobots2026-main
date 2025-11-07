import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Plus, Edit, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';

const newsSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().trim().min(1, 'Content is required').max(5000, 'Content must be less than 5000 characters'),
  image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  published: z.boolean()
});

interface NewsItem {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  published: boolean;
  created_at: string;
}

export function AdminNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: '',
    published: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    const { data } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setNews(data);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      image_url: '',
      published: true
    });
    setEditingNews(null);
  };

  const handleOpenEdit = (item: NewsItem) => {
    setEditingNews(item);
    setFormData({
      title: item.title,
      content: item.content,
      image_url: item.image_url || '',
      published: item.published
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      newsSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      }
      return;
    }

    const newsData = {
      ...formData,
      image_url: formData.image_url || null
    };

    if (editingNews) {
      const { error } = await supabase
        .from('news')
        .update(newsData)
        .eq('id', editingNews.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update news',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'News updated successfully',
        });
        setEditingNews(null);
        loadNews();
      }
    } else {
      const { error } = await supabase
        .from('news')
        .insert([newsData]);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create news',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'News created successfully',
        });
        setShowAddDialog(false);
        resetForm();
        loadNews();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('news')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete news',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'News deleted successfully',
      });
      loadNews();
    }
  };

  const NewsForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          maxLength={200}
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          maxLength={5000}
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={6}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="image_url">Image URL (optional)</Label>
        <Input
          id="image_url"
          type="url"
          value={formData.image_url}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          placeholder="https://example.com/image.jpg"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="published"
          checked={formData.published}
          onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
        />
        <Label htmlFor="published">Published</Label>
      </div>
      <Button type="submit" className="w-full">
        {editingNews ? 'Update News' : 'Create News'}
      </Button>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">News Management</h1>
          <p className="text-muted-foreground">Create and manage club news and announcements</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add News
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New News</DialogTitle>
            </DialogHeader>
            <NewsForm />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All News</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading news...</p>
          ) : news.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No news created yet</p>
          ) : (
            <div className="space-y-4">
              {news.map((item) => (
                <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg">
                  {item.image_url && (
                    <img 
                      src={item.image_url} 
                      alt={item.title} 
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{item.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(item.created_at), 'PP')}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {item.content}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${item.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {item.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={editingNews?.id === item.id} onOpenChange={(open) => {
                      if (!open) resetForm();
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit News</DialogTitle>
                        </DialogHeader>
                        <NewsForm />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
