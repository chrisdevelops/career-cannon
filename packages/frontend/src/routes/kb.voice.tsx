import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { voiceBlueprintApi, type VoiceBlueprint } from '@/lib/api';
import { PageHeader } from '@/components/kb/page-header';
import { SaveIndicator } from '@/components/kb/save-indicator';
import { useDebouncedCallback } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { IconLoader2, IconPlus, IconX } from '@tabler/icons-react';

export const Route = createFileRoute('/kb/voice')({
  component: VoicePage,
});

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type StringField = 'tone' | 'formality' | 'sentenceLength' | 'vocabularyNotes' | 'customPrompt';

type Option = { value: string; label: string };

const TONE_OPTIONS: Option[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'confident', label: 'Confident' },
  { value: 'humble', label: 'Humble' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
  { value: 'authoritative', label: 'Authoritative' },
];

const FORMALITY_OPTIONS: Option[] = [
  { value: 'formal', label: 'Formal' },
  { value: 'semi-formal', label: 'Semi-formal' },
  { value: 'informal', label: 'Informal' },
];

const SENTENCE_LENGTH_OPTIONS: Option[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
  { value: 'varied', label: 'Varied' },
];

function VoicePage() {
  const [data, setData] = useState<Partial<VoiceBlueprint>>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string>();

  // Local state for array inputs
  const [newAvoid, setNewAvoid] = useState('');
  const [newSample, setNewSample] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const blueprint = await voiceBlueprintApi.get();
      setData(blueprint || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voice blueprint');
    } finally {
      setLoading(false);
    }
  };

  const saveBlueprint = useCallback(async (update: Partial<VoiceBlueprint>) => {
    setSaveStatus('saving');
    try {
      // Create a clean object for the API update
      // We need to cast or ensure we only send valid fields if the API is strict
      // But based on patterns, we pass the partial object
      const result = await voiceBlueprintApi.update(update);
      setData(result);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }, []);

  const debouncedSave = useDebouncedCallback(saveBlueprint, 1000);

  const handleChange = (field: StringField, value: string) => {
    const updated = { ...data, [field]: value || null };
    setData(updated);
    debouncedSave(updated);
  };

  const handleArrayAdd = (field: 'avoid' | 'samples', value: string, resetFn: (val: string) => void) => {
    if (!value.trim()) return;
    const currentArray = data[field] || [];
    const updatedArray = [...currentArray, value.trim()];
    const updated = { ...data, [field]: updatedArray };
    setData(updated);
    debouncedSave(updated);
    resetFn('');
  };

  const handleArrayRemove = (field: 'avoid' | 'samples', index: number) => {
    const currentArray = data[field] || [];
    const updatedArray = currentArray.filter((_, i) => i !== index);
    const updated = { ...data, [field]: updatedArray };
    setData(updated);
    debouncedSave(updated);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <IconLoader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <PageHeader
        title="Voice Blueprint"
        description="Define how the AI should sound when generating your content"
        actions={<SaveIndicator status={saveStatus} error={error} />}
      />

      <div className="space-y-8">
        {/* Core Attributes */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tone">Tone</Label>
            <select
              id="tone"
              value={data.tone || ''}
              onChange={(e) => handleChange('tone', e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">(none)</option>
              {TONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">The overall attitude of your writing.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="formality">Formality</Label>
            <select
              id="formality"
              value={data.formality || ''}
              onChange={(e) => handleChange('formality', e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">(none)</option>
              {FORMALITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sentenceLength">Sentence Length</Label>
            <select
              id="sentenceLength"
              value={data.sentenceLength || ''}
              onChange={(e) => handleChange('sentenceLength', e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">(none)</option>
              {SENTENCE_LENGTH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Vocabulary & Prompt */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="vocabularyNotes">Vocabulary Notes</Label>
            <Textarea
              id="vocabularyNotes"
              value={data.vocabularyNotes || ''}
              onChange={(e) => handleChange('vocabularyNotes', e.target.value)}
              placeholder="e.g. Use action verbs, avoid passive voice, use industry-specific terms..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customPrompt">Custom System Prompt</Label>
            <Textarea
              id="customPrompt"
              value={data.customPrompt || ''}
              onChange={(e) => handleChange('customPrompt', e.target.value)}
              placeholder="Additional instructions passed directly to the AI..."
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              These instructions will be appended to the system prompt for generation.
            </p>
          </div>
        </div>

        {/* Avoid List */}
        <div className="space-y-3">
          <Label>Words/Phrases to Avoid</Label>
          <div className="flex gap-2">
            <Input
              value={newAvoid}
              onChange={(e) => setNewAvoid(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleArrayAdd('avoid', newAvoid, setNewAvoid);
                }
              }}
              placeholder="e.g. 'passionate', 'rockstar', 'ninja'"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleArrayAdd('avoid', newAvoid, setNewAvoid)}
              disabled={!newAvoid.trim()}
            >
              <IconPlus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2">
            {data.avoid?.map((item, i) => (
              <div key={i} className="bg-destructive/10 text-destructive text-sm px-3 py-1 rounded-full flex items-center gap-1">
                <span>{item}</span>
                <button
                  onClick={() => handleArrayRemove('avoid', i)}
                  className="hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <IconX className="w-3 h-3" />
                </button>
              </div>
            ))}
            {(!data.avoid || data.avoid.length === 0) && (
              <p className="text-sm text-muted-foreground italic">No items added.</p>
            )}
          </div>
        </div>

        {/* Samples List */}
        <div className="space-y-3">
          <Label>Writing Samples</Label>
          <div className="space-y-2">
            <Textarea
              value={newSample}
              onChange={(e) => setNewSample(e.target.value)}
              placeholder="Paste a paragraph of your writing here to help match your style..."
              className="min-h-[80px]"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleArrayAdd('samples', newSample, setNewSample)}
              disabled={!newSample.trim()}
              className="w-full"
            >
              <IconPlus className="w-4 h-4 mr-2" />
              Add Sample
            </Button>
          </div>
          
          <div className="space-y-3 mt-4">
            {data.samples?.map((sample, i) => (
              <div key={i} className="bg-muted p-3 rounded-md relative group">
                <button
                  onClick={() => handleArrayRemove('samples', i)}
                  className="absolute top-2 right-2 p-1 hover:bg-background rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <IconX className="w-4 h-4" />
                </button>
                <p className="text-sm pr-6 whitespace-pre-wrap">{sample}</p>
              </div>
            ))}
             {(!data.samples || data.samples.length === 0) && (
              <p className="text-sm text-muted-foreground italic">No writing samples provided.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
