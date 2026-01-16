import { createFileRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { PageContent, PageHeaderBar } from '@/components/layout/page-shell';
import { PageTitleBar } from '@/components/layout/page-title-bar';
import { useEffect, useState, useCallback } from 'react';
import { IconFileUpload, IconLoader2, IconAlertTriangle, IconFileText } from '@tabler/icons-react';
import { aiApi, ApiRequestError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppLayout } from '@/components/app-layout';

export const Route = createFileRoute('/import')({
  component: ImportLayout,
});

function ImportLayout() {
  const location = useLocation();

  if (location.pathname === '/import' || location.pathname === '/import/') {
    return (
      <AppLayout>
        <ImportResumePage />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
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
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const detectFormat = (filename: string): 'text' | 'markdown' => {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'md' || ext === 'markdown') return 'markdown';
    return 'text';
  };

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setError(null);

    const ext = file.name.toLowerCase().split('.').pop();
    if (!['txt', 'md', 'markdown', 'pdf'].includes(ext || '')) {
      setError('Unsupported file type. Please upload .txt, .md, or .pdf files.');
      setSelectedFile(null);
      return;
    }

    // Auto-detect format
    const detectedFormat = detectFormat(file.name);
    setFormat(detectedFormat);

    // Read file content for preview (skip for PDFs as they're binary)
    if (ext !== 'pdf') {
      try {
        const fileContent = await readFileContent(file);
        setContent(fileContent);
      } catch (err) {
        setError('Failed to read file content');
        setSelectedFile(null);
      }
    } else {
      // For PDFs, just clear the preview
      setContent('');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // If using file upload, validate file is selected
    if (selectedFile) {
      // File upload path - no content validation needed
    } else {
      // Paste path - validate content
      if (content.trim().length < 50) {
        setError('Resume content must be at least 50 characters.');
        return;
      }
    }

    setLoading(true);
    try {
      let result;
      
      // If file is selected, use file upload API
      if (selectedFile) {
        result = await aiApi.parseResumeFile(selectedFile);
      } else {
        // Otherwise use paste API
        result = await aiApi.parseResume({ content, format });
      }
      
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
    <>
      <PageHeaderBar>
        <PageTitleBar
          title="Import Resume"
          subtitle="Upload or paste your resume and let AI extract structured entries for your Knowledge Base."
        />
      </PageHeaderBar>

      <PageContent>
        <div className="max-w-3xl mx-auto">
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

            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">
                  <IconFileUpload className="w-4 h-4 mr-2" />
                  Upload File
                </TabsTrigger>
                <TabsTrigger value="paste">
                  <IconFileText className="w-4 h-4 mr-2" />
                  Paste Text
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4 mt-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 p-4 rounded-lg mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>PDF Support:</strong> We can extract text from standard text-based PDFs. 
                    Complex layouts (multi-column, tables), scanned documents, or image-based PDFs 
                    may have reduced accuracy. For best results, use .txt or .md files.
                  </p>
                </div>

                <div
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <IconFileUpload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Drop your resume here</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Supports .txt, .md, and .pdf files
                  </p>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".txt,.md,.markdown,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={loading}
                  >
                    Browse Files
                  </Button>
                </div>

                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm">
                    <IconFileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <span className="text-muted-foreground">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                )}

                {selectedFile && selectedFile.name.toLowerCase().endsWith('.pdf') ? (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="bg-muted p-4 rounded-md text-center text-muted-foreground">
                      <p className="text-sm">PDF preview not available</p>
                      <p className="text-xs mt-1">Click "Parse Resume" to extract text from the PDF</p>
                    </div>
                  </div>
                ) : content && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="bg-muted p-4 rounded-md max-h-[200px] overflow-y-auto font-mono text-xs whitespace-pre-wrap">
                      {content.slice(0, 500)}
                      {content.length > 500 && '...'}
                    </div>
                    <p className="text-xs text-muted-foreground">{content.length} characters</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="paste" className="space-y-4 mt-4">
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
                  <p className="text-xs text-muted-foreground">
                    Select the format of your pasted content
                  </p>
                </div>
              </TabsContent>
            </Tabs>

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
                disabled={
                  (selectedFile ? false : content.trim().length < 50) || 
                  loading || 
                  aiConfigured === false
                }
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
      </PageContent>
    </>
  );
}
