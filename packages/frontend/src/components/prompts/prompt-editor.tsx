import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { promptsApi, type PromptRecord } from '@/lib/api';

type PromptItem = PromptRecord & { readOnly?: boolean };

const VOICE_PROMPT: PromptItem = {
  key: 'voice-blueprint',
  title: 'Voice Blueprint',
  description: 'Managed via Knowledge Base > Voice Blueprint.',
  defaultText: `The Voice Blueprint instructions are dynamically generated based on your settings in the Knowledge Base.

They include:
- Tone (e.g., "Professional", "Casual")
- Formality level
- Sentence length preferences
- Vocabulary notes
- Custom writing samples to emulate

Visit the Voice Blueprint section to customize these settings.`,
  overrideText: null,
  effectiveText: `The Voice Blueprint instructions are dynamically generated based on your settings in the Knowledge Base.

They include:
- Tone (e.g., "Professional", "Casual")
- Formality level
- Sentence length preferences
- Vocabulary notes
- Custom writing samples to emulate

Visit the Voice Blueprint section to customize these settings.`,
  updatedAt: null,
  readOnly: true,
};

interface PromptEditorProps {
  promptKey: string;
}

export function PromptEditor({ promptKey }: PromptEditorProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<PromptItem | null>(null);
  const [currentText, setCurrentText] = useState('');

  // Track if text has been modified from the saved version
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (promptKey === 'voice-blueprint') {
          setPrompt(VOICE_PROMPT);
          setCurrentText(VOICE_PROMPT.effectiveText);
          setIsDirty(false);
        } else {
          const data = await promptsApi.list();
          const found = data.find(p => p.key === promptKey);
          if (found) {
            setPrompt(found);
            setCurrentText(found.effectiveText ?? found.defaultText);
            setIsDirty(false);
          } else {
            setError('Prompt not found');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load prompt');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [promptKey]);

  const handleTextChange = (value: string) => {
    setCurrentText(value);
    if (prompt) {
        setIsDirty(value !== prompt.effectiveText);
    }
  };

  const handleReset = async () => {
    if (!prompt || prompt.readOnly) return;

    try {
      const result = await promptsApi.reset(prompt.key);
      const updatedPrompt = { ...prompt, overrideText: null, effectiveText: result.effectiveText };
      setPrompt(updatedPrompt);
      setCurrentText(updatedPrompt.effectiveText);
      setIsDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset prompt');
    }
  };

  const handleSave = async () => {
    if (!prompt || prompt.readOnly) return;

    try {
      const result = await promptsApi.update(prompt.key, currentText);
      const updatedPrompt = {
        ...prompt,
        overrideText: result.overrideText ?? currentText,
        effectiveText: result.effectiveText ?? currentText,
        updatedAt: result.updatedAt,
      };
      setPrompt(updatedPrompt);
      setIsDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading prompt...</div>;
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
        {error}
      </div>
    );
  }

  if (!prompt) {
    return <div>Prompt not found</div>;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{prompt.title}</CardTitle>
            <CardDescription>{prompt.description}</CardDescription>
          </div>
          {isDirty && !prompt.readOnly && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              Modified
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Textarea
          value={currentText}
          onChange={(e) => handleTextChange(e.target.value)}
          readOnly={prompt.readOnly}
          className={`min-h-[300px] w-full resize-y rounded-none border-0 p-6 font-mono text-sm leading-relaxed focus-visible:ring-0 ${
            prompt.readOnly ? 'bg-muted/5 text-muted-foreground' : ''
          }`}
          spellCheck={false}
        />
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-muted/30 py-3 px-6 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={!isDirty || prompt.readOnly}
          className="text-muted-foreground hover:text-foreground"
        >
          Restore default
        </Button>

        {!prompt.readOnly && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty}
          >
            Save Changes
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
