import { createFileRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { IconFileUpload, IconLoader2, IconAlertTriangle } from '@tabler/icons-react';
import { aiApi, ApiRequestError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const Route = createFileRoute('/import')({
  component: ImportLayout,
});

function ImportLayout() {
  const location = useLocation();

  if (location.pathname === '/import' || location.pathname === '/import/') {
    return <ImportResumePage />;
  }

  return <Outlet />;
}

const STORAGE_KEY = 'career-cannon:parse-resume';

function ImportResumePage() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<'text' | 'markdown'>('text');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [statusCheckFailed, setStatusCheckFailed] = useState(false);

  useEffect(() => {
    aiApi
      .status()
      .then((res) => {
        setAiConfigured(res.configured);
      })
      .catch(() => {
        setStatusCheckFailed(true);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (content.trim().length < 50) {
      setError('Resume content must be at least 50 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await aiApi.parseResume({ content, format });
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      navigate({ to: '/import/review' });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to parse resume. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <IconFileUpload className="w-7 h-7 text-primary" />
              <h1 className="text-3xl font-bold">Import Resume</h1>
            </div>
            <p className="text-muted-foreground">
              Paste your resume and let AI extract structured entries for your Knowledge Base.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
            {aiConfigured === false && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 p-4 rounded-lg flex gap-3 text-yellow-800 dark:text-yellow-200">
                <IconAlertTriangle className="w-5 h-5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">AI Backend Not Configured</p>
                  <p className="mt-1 opacity-90">
                    Parsing resumes requires a configured LLM provider. Please check your backend{' '}
                    <code>.env</code> file and ensure <code>OPENAI_API_KEY</code> is set.
                  </p>
                </div>
              </div>
            )}

            {statusCheckFailed && (
              <div className="bg-muted border p-4 rounded-lg flex gap-3">
                <IconAlertTriangle className="w-5 h-5 shrink-0 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  <p>
                    Could not verify AI status. You can try to parse, but it may fail if the backend
                    is not configured.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as 'text' | 'markdown')}>
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Plain Text</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Resume Content *</Label>
              <Textarea
                id="content"
                placeholder="Paste your resume here..."
                className="min-h-[420px] font-mono text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">{content.length} characters (min 50)</p>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: '/kb' })}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={content.trim().length < 50 || loading || aiConfigured === false}
                className="min-w-[140px]"
              >
                {loading ? (
                  <>
                    <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  'Parse Resume'
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-sm text-muted-foreground">
            Note: parsing requires the backend AI provider to be configured.
          </div>
        </div>
      </div>
    </div>
  );
}
