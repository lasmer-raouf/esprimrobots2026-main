import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, Edit, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';

const newsSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  content: z.string().trim().min(1, 'Content is required').max(5000),
  image_url: z.string().trim().url('Must be a valid URL').or(z.literal('')),
  published: z.boolean(),
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setNews(data);
    setLoading(false);
  };

  const resetForms = () => {
    setEditingId(null);
    setShowAddForm(false);
  };

  // create
  const handleCreate = async (payload: {
    title: string;
    content: string;
    image_url: string;
    published: boolean;
  }) => {
    try {
      newsSchema.parse(payload);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
      }
      return;
    }

    const dbPayload = { ...payload, image_url: payload.image_url || null };

    const { error } = await supabase.from('news').insert([dbPayload]);
    if (error) {
      toast({ title: 'Error', description: 'Failed to create news', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'News created' });
      resetForms();
      loadNews();
    }
  };

  // update
  const handleUpdate = async (
    id: string,
    payload: { title: string; content: string; image_url: string; published: boolean },
  ) => {
    try {
      newsSchema.parse(payload);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
      }
      return;
    }

    const dbPayload = { ...payload, image_url: payload.image_url || null };

    const { error } = await supabase.from('news').update(dbPayload).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update news', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'News updated' });
      resetForms();
      loadNews();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('news').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'News deleted' });
      loadNews();
    }
  };

  // Local-form component: each instance keeps its own state so typing is stable
  const NewsForm = ({
    formKey,
    initial = { title: '', content: '', image_url: '', published: true },
    onCancel,
    onSubmit,
    submitLabel,
  }: {
    formKey: string;
    initial?: { title: string; content: string; image_url: string; published: boolean };
    onCancel: () => void;
    onSubmit: (payload: { title: string; content: string; image_url: string; published: boolean }) => void;
    submitLabel?: string;
  }) => {
    const [title, setTitle] = useState(initial.title);
    const [content, setContent] = useState(initial.content);
    const [image_url, setImageUrl] = useState(initial.image_url);
    const [published, setPublished] = useState<boolean>(initial.published);

    // reset local state if initial changes (e.g., opening edit for a different item)
    useEffect(() => {
      setTitle(initial.title);
      setContent(initial.content);
      setImageUrl(initial.image_url);
      setPublished(initial.published);
    }, [initial.title, initial.content, initial.image_url, initial.published, formKey]);

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ title, content, image_url: image_url || '', published });
        }}
        className="space-y-4"
      >
        <div className="grid gap-2">
          <Label htmlFor={`title-${formKey}`}>Title</Label>
          <Input
            id={`title-${formKey}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`content-${formKey}`}>Content</Label>
          <Textarea
            id={`content-${formKey}`}
            value={content}
            rows={6}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`image_url-${formKey}`}>Image URL</Label>
          <Input
            id={`image_url-${formKey}`}
            type="url"
            value={image_url}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={published} onCheckedChange={(v: boolean) => setPublished(v)} />
          <Label>Published</Label>
        </div>

        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            {submitLabel ?? 'Save'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-1">News Management</h1>
          <p className="text-muted-foreground">Manage all club news</p>
        </div>

        <div>
          <Button
            type="button"
            onClick={() => {
              setShowAddForm((s) => !s);
              setEditingId(null);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add News
          </Button>
        </div>
      </div>

      {/* Add form (inline panel) */}
      {showAddForm && (
        <div className="p-4 border rounded-lg bg-card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Create News</h2>
          </div>
          <NewsForm
            formKey="add"
            onCancel={resetForms}
            onSubmit={async (payload) => {
              await handleCreate(payload);
            }}
            submitLabel="Create News"
          />
        </div>
      )}

      {/* News List */}
      {loading ? (
        <p>Loading...</p>
      ) : news.length === 0 ? (
        <p className="text-center text-muted-foreground py-4">No news yet</p>
      ) : (
        <div className="space-y-4">
          {news.map((item) => (
            <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg">
              {item.image_url && <img src={item.image_url} alt={item.title} className="w-24 h-24 object-cover rounded" />}

              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-2">
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                  <div className="flex gap-1 text-sm text-muted-foreground items-center">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(item.created_at), 'PP')}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>

                <span
                  className={`text-xs px-2 py-1 rounded mt-2 inline-block ${
                    item.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {item.published ? 'Published' : 'Draft'}
                </span>

                {/* Inline edit form */}
                {editingId === item.id && (
                  <div className="mt-4">
                    <NewsForm
                      formKey={item.id}
                      initial={{
                        title: item.title,
                        content: item.content,
                        image_url: item.image_url || '',
                        published: item.published,
                      }}
                      onCancel={resetForms}
                      onSubmit={async (payload) => {
                        await handleUpdate(item.id, payload);
                      }}
                      submitLabel="Update News"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (editingId === item.id) {
                      resetForms();
                    } else {
                      setEditingId(item.id);
                      setShowAddForm(false);
                    }
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>

                <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
