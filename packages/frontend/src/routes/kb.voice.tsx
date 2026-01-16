import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { voiceBlueprintApi, type VoiceBlueprint, type VoiceSamplePair } from '@/lib/api';
import { PageContent, PageHeaderBar } from '@/components/layout/page-shell';
import { PageTitleBar } from '@/components/layout/page-title-bar';
import { SaveIndicator } from '@/components/kb/save-indicator';
import { useDebouncedCallback } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { IconLoader2, IconPlus, IconX, IconWand, IconBook, IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { Separator } from '@/components/ui/separator';

const getSliderValue = (prompt: string | undefined | null, id: string): number => {
  if (!prompt) return 50;
  const match = prompt.match(new RegExp(`\\[tone-slider: ${id}=(\\d+)\\]`));
  return match ? parseInt(match[1], 10) : 50;
};

const setSliderValue = (prompt: string | undefined | null, id: string, value: number): string => {
  const safePrompt = prompt || '';
  const tag = `[tone-slider: ${id}=${value}]`;
  const regex = new RegExp(`\\[tone-slider: ${id}=\\d+\\]`);
  
  if (regex.test(safePrompt)) {
    return safePrompt.replace(regex, tag);
  } else {
    return safePrompt.trim() ? (safePrompt.trim() + '\n' + tag) : tag;
  }
};

export const Route = createFileRoute('/kb/voice')({
  component: VoicePage,
});

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type StringField =
  | 'tone'
  | 'formality'
  | 'sentenceLength'
  | 'vocabularyNotes'
  | 'customPrompt'
  | 'audience'
  | 'pointOfView'
  | 'energy'
  | 'confidence'
  | 'pacing'
  | 'structureStyle'
  | 'emphasis'
  | 'grammarNotes'
  | 'punctuationStyle';

type ArrayField = 'avoid' | 'samples' | 'preferredVerbs' | 'preferredPhrases' | 'bannedPhrases';

type Option = { value: string; label: string };

// --- Options Definitions ---

const TONE_OPTIONS: Option[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'confident', label: 'Confident' },
  { value: 'humble', label: 'Humble' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'empathetic', label: 'Empathetic' },
  { value: 'direct', label: 'Direct' },
  { value: 'storyteller', label: 'Storyteller' },
];

const FORMALITY_OPTIONS: Option[] = [
  { value: 'formal', label: 'Formal' },
  { value: 'semi-formal', label: 'Semi-formal' },
  { value: 'informal', label: 'Informal' },
];

const SENTENCE_LENGTH_OPTIONS: Option[] = [
  { value: 'short', label: 'Short & Punchy' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long & Flowing' },
  { value: 'varied', label: 'Varied (Natural)' },
];

const AUDIENCE_OPTIONS: Option[] = [
  { value: 'recruiters', label: 'Recruiters & Hiring Managers' },
  { value: 'peers', label: 'Industry Peers' },
  { value: 'clients', label: 'Potential Clients' },
  { value: 'general', label: 'General Public' },
  { value: 'technical', label: 'Technical Audience' },
];

const POV_OPTIONS: Option[] = [
  { value: 'first_person', label: 'First Person (I, me)' },
  { value: 'third_person', label: 'Third Person (He, She, They)' },
];

const ENERGY_OPTIONS: Option[] = [
  { value: 'high', label: 'High Energy' },
  { value: 'calm', label: 'Calm & Composed' },
  { value: 'neutral', label: 'Neutral' },
];

const CONFIDENCE_OPTIONS: Option[] = [
  { value: 'bold', label: 'Bold & Assertive' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'modest', label: 'Modest' },
];

const PACING_OPTIONS: Option[] = [
  { value: 'fast', label: 'Fast-paced' },
  { value: 'steady', label: 'Steady' },
  { value: 'deliberate', label: 'Deliberate & Slow' },
];

const STRUCTURE_STYLE_OPTIONS: Option[] = [
  { value: 'logical', label: 'Logical & Linear' },
  { value: 'narrative', label: 'Narrative & Story-driven' },
  { value: 'bulleted', label: 'Heavy on Bullets/Lists' },
];

const EMPHASIS_OPTIONS: Option[] = [
  { value: 'facts', label: 'Focus on Facts/Data' },
  { value: 'impact', label: 'Focus on Impact/Results' },
  { value: 'process', label: 'Focus on Process/Method' },
  { value: 'values', label: 'Focus on Values/Philosophy' },
];

const PUNCTUATION_STYLE_OPTIONS: Option[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'expressive', label: 'Expressive (! ?)' },
];

// --- Guided Prompts ---

const GUIDED_PROMPTS = [
  {
    id: 'proud_project',
    text: 'Describe a project you are proud of.',
    helper: 'Focus on your role, the challenge, and the outcome. Write as you naturally would on LinkedIn or in a cover letter.',
  },
  {
    id: 'career_pivot',
    text: 'Explain a career pivot or a major professional decision.',
    helper: 'Explain your reasoning and how it reflects your values and goals.',
  },
  {
    id: 'strengths',
    text: 'Summarize your key strengths for a hiring manager.',
    helper: 'Be honest and direct. Are you a leader? A builder? A strategist?',
  },
  {
    id: 'failure_lesson',
    text: 'Share a failure or a hard lesson learned.',
    helper: 'What went wrong? How did you handle it? What did you change moving forward?',
  },
  {
    id: 'leadership_moment',
    text: 'Describe a moment of leadership or mentorship.',
    helper: 'How did you support others? Focus on empathy, guidance, and team growth.',
  },
  {
    id: 'technical_tradeoff',
    text: 'Explain a complex technical tradeoff you made.',
    helper: 'Why did you choose one approach over another? Explain the context and impact.',
  },
];

const TONE_SLIDERS = [
  { id: 'concise-verbose', left: 'Concise', right: 'Verbose' },
  { id: 'humble-assertive', left: 'Humble', right: 'Assertive' },
  { id: 'formal-casual', left: 'Formal', right: 'Casual' },
  { id: 'direct-diplomatic', left: 'Direct', right: 'Diplomatic' },
];

function VoicePage() {
  const [data, setData] = useState<Partial<VoiceBlueprint>>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string>();

  // Local state for array inputs
  const [newAvoid, setNewAvoid] = useState('');
  const [newSample, setNewSample] = useState('');
  const [newPreferredVerb, setNewPreferredVerb] = useState('');
  const [newPreferredPhrase, setNewPreferredPhrase] = useState('');
  const [newBannedPhrase, setNewBannedPhrase] = useState('');

  // Local state for guided samples (mapped to samplePairs)
  const [guidedResponses, setGuidedResponses] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const blueprint = await voiceBlueprintApi.get();
      setData(blueprint || {});
      
      // Initialize guided responses from samplePairs
      if (blueprint?.samplePairs) {
        const responses: Record<string, string> = {};
        blueprint.samplePairs.forEach(pair => {
          // Find if this pair matches one of our guided prompts
          const match = GUIDED_PROMPTS.find(p => p.text === pair.prompt);
          if (match) {
            responses[match.id] = pair.response;
          }
        });
        setGuidedResponses(responses);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voice blueprint');
    } finally {
      setLoading(false);
    }
  };

  const saveBlueprint = useCallback(async (update: Partial<VoiceBlueprint>) => {
    setSaveStatus('saving');
    try {
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

  const handleSliderChange = (id: string, value: number) => {
    const newPrompt = setSliderValue(data.customPrompt, id, value);
    handleChange('customPrompt', newPrompt);
  };

  const handleArrayAdd = (
    field: ArrayField, 
    value: string, 
    setValue: (val: string) => void
  ) => {
    if (!value.trim()) return;
    const currentArray = data[field] || [];
    const updatedArray = [...currentArray, value.trim()];
    const updated = { ...data, [field]: updatedArray };
    setData(updated);
    debouncedSave(updated);
    setValue('');
  };

  const handleArrayRemove = (field: ArrayField, index: number) => {
    const currentArray = data[field] || [];
    const updatedArray = currentArray.filter((_, i) => i !== index);
    const updated = { ...data, [field]: updatedArray };
    setData(updated);
    debouncedSave(updated);
  };

  const handleGuidedResponseChange = (promptId: string, value: string) => {
    const newResponses = { ...guidedResponses, [promptId]: value };
    setGuidedResponses(newResponses);

    // Reconstruct samplePairs array
    const newSamplePairs: VoiceSamplePair[] = Object.entries(newResponses)
      .filter(([_, response]) => response.trim().length > 0)
      .map(([id, response]) => {
        const promptObj = GUIDED_PROMPTS.find(p => p.id === id);
        return {
          prompt: promptObj ? promptObj.text : '', // Should always find it
          response: response
        };
      })
      .filter(pair => pair.prompt !== '');

    // Preserve any custom pairs that might have been added outside (future proofing)
    // For now, we just replace with our guided set as that's the current UI scope
    
    const updated = { ...data, samplePairs: newSamplePairs };
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
    <>
      <PageHeaderBar>
        <PageTitleBar
          title="Voice Blueprint"
          subtitle="Define your unique writing style, tone, and preferences."
          actions={<SaveIndicator status={saveStatus} error={error} />}
        />
      </PageHeaderBar>

      <PageContent>
        <div className="max-w-4xl space-y-10 pb-20">
          
          {/* Section 1: Tone & Persona */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <IconWand className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Tone & Persona</h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <SelectField 
                label="Target Audience" 
                id="audience" 
                value={data.audience} 
                options={AUDIENCE_OPTIONS} 
                onChange={(v) => handleChange('audience', v)} 
              />
              <SelectField 
                label="Tone" 
                id="tone" 
                value={data.tone} 
                options={TONE_OPTIONS} 
                onChange={(v) => handleChange('tone', v)} 
              />
              <SelectField 
                label="Formality" 
                id="formality" 
                value={data.formality} 
                options={FORMALITY_OPTIONS} 
                onChange={(v) => handleChange('formality', v)} 
              />
              <SelectField 
                label="Point of View" 
                id="pointOfView" 
                value={data.pointOfView} 
                options={POV_OPTIONS} 
                onChange={(v) => handleChange('pointOfView', v)} 
              />
              <SelectField 
                label="Energy" 
                id="energy" 
                value={data.energy} 
                options={ENERGY_OPTIONS} 
                onChange={(v) => handleChange('energy', v)} 
              />
              <SelectField 
                label="Confidence" 
                id="confidence" 
                value={data.confidence} 
                options={CONFIDENCE_OPTIONS} 
                onChange={(v) => handleChange('confidence', v)} 
              />
            </div>

            <div className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <IconAdjustmentsHorizontal className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Fine-tuning</h3>
              </div>
              
              <div className="grid gap-x-12 gap-y-8 md:grid-cols-2 bg-muted/20 p-6 rounded-xl border border-border/50">
                {TONE_SLIDERS.map((slider) => {
                  const val = getSliderValue(data.customPrompt, slider.id);
                  return (
                    <div key={slider.id} className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className={`transition-colors duration-300 ${val < 40 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {slider.left}
                        </span>
                        <span className={`transition-colors duration-300 ${val > 60 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {slider.right}
                        </span>
                      </div>
                      <div className="relative group h-6 flex items-center">
                        {/* Track Background */}
                        <div className="absolute left-0 right-0 h-1.5 bg-secondary rounded-full overflow-hidden">
                           {/* Center Marker */}
                           <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-background/50 z-0"></div>
                           {/* Active Range from Center */}
                           <div 
                             className="absolute top-0 bottom-0 bg-primary/30 transition-all duration-300"
                             style={{ 
                               left: '50%', 
                               width: `${Math.abs(val - 50)}%`, 
                               transform: val < 50 ? 'translateX(-100%)' : 'none' 
                             }}
                           />
                        </div>
                        
                        {/* Hidden Input for Interaction */}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={val}
                          onChange={(e) => handleSliderChange(slider.id, parseInt(e.target.value, 10))}
                          className="relative w-full h-full opacity-0 cursor-pointer z-10 m-0 p-0"
                        />
                        
                        {/* Custom Thumb */}
                        <div 
                          className="absolute w-4 h-4 bg-background border-2 border-primary rounded-full shadow-sm pointer-events-none transition-all duration-150 group-hover:scale-110 z-20"
                          style={{ left: `calc(${val}% - 8px)` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <Separator />

          {/* Section 2: Structure & Pacing */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 pb-2 border-b">
              <IconWand className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Structure & Pacing</h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <SelectField 
                label="Sentence Length" 
                id="sentenceLength" 
                value={data.sentenceLength} 
                options={SENTENCE_LENGTH_OPTIONS} 
                onChange={(v) => handleChange('sentenceLength', v)} 
              />
              <SelectField 
                label="Pacing" 
                id="pacing" 
                value={data.pacing} 
                options={PACING_OPTIONS} 
                onChange={(v) => handleChange('pacing', v)} 
              />
              <SelectField 
                label="Structure Style" 
                id="structureStyle" 
                value={data.structureStyle} 
                options={STRUCTURE_STYLE_OPTIONS} 
                onChange={(v) => handleChange('structureStyle', v)} 
              />
               <SelectField 
                label="Emphasis" 
                id="emphasis" 
                value={data.emphasis} 
                options={EMPHASIS_OPTIONS} 
                onChange={(v) => handleChange('emphasis', v)} 
              />
              <SelectField 
                label="Punctuation Style" 
                id="punctuationStyle" 
                value={data.punctuationStyle} 
                options={PUNCTUATION_STYLE_OPTIONS} 
                onChange={(v) => handleChange('punctuationStyle', v)} 
              />
            </div>
          </section>

          <Separator />

          {/* Section 3: Language & Vocabulary */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b">
              <IconBook className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Language & Vocabulary</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vocabularyNotes">Vocabulary Notes</Label>
                <Textarea
                  id="vocabularyNotes"
                  value={data.vocabularyNotes || ''}
                  onChange={(e) => handleChange('vocabularyNotes', e.target.value)}
                  placeholder="e.g. Use action verbs, avoid passive voice, use industry-specific terms..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grammarNotes">Grammar Notes</Label>
                <Textarea
                  id="grammarNotes"
                  value={data.grammarNotes || ''}
                  onChange={(e) => handleChange('grammarNotes', e.target.value)}
                  placeholder="e.g. Oxford comma, no contractions, etc."
                  className="min-h-[100px]"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <ArrayInput 
                label="Preferred Verbs"
                placeholder="e.g. 'drive', 'spearhead', 'architect'"
                items={data.preferredVerbs || []}
                inputValue={newPreferredVerb}
                onInputChange={setNewPreferredVerb}
                onAdd={() => handleArrayAdd('preferredVerbs', newPreferredVerb, setNewPreferredVerb)}
                onRemove={(i) => handleArrayRemove('preferredVerbs', i)}
              />
               <ArrayInput 
                label="Preferred Phrases"
                placeholder="e.g. 'proven track record', 'data-driven'"
                items={data.preferredPhrases || []}
                inputValue={newPreferredPhrase}
                onInputChange={setNewPreferredPhrase}
                onAdd={() => handleArrayAdd('preferredPhrases', newPreferredPhrase, setNewPreferredPhrase)}
                onRemove={(i) => handleArrayRemove('preferredPhrases', i)}
              />
            </div>
          </section>

          <Separator />

          {/* Section 4: Do's & Don'ts */}
          <section className="space-y-6">
             <div className="flex items-center gap-2 pb-2 border-b">
              <IconX className="w-5 h-5 text-destructive" />
              <h2 className="text-lg font-semibold">Do's & Don'ts</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
               <ArrayInput 
                label="Banned Phrases (Never Use)"
                placeholder="e.g. 'synergy', 'circle back', 'hustle'"
                items={data.bannedPhrases || []}
                inputValue={newBannedPhrase}
                onInputChange={setNewBannedPhrase}
                onAdd={() => handleArrayAdd('bannedPhrases', newBannedPhrase, setNewBannedPhrase)}
                onRemove={(i) => handleArrayRemove('bannedPhrases', i)}
              />
              <ArrayInput 
                label="Words to Avoid (Minimize Usage)"
                placeholder="e.g. 'very', 'really', 'stuff'"
                items={data.avoid || []}
                inputValue={newAvoid}
                onInputChange={setNewAvoid}
                onAdd={() => handleArrayAdd('avoid', newAvoid, setNewAvoid)}
                onRemove={(i) => handleArrayRemove('avoid', i)}
              />
            </div>
          </section>

          <Separator />

          {/* Section 5: Guided Writing Samples */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b">
              <IconBook className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Guided Writing Samples</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Answering these prompts helps the AI understand your unique voice, tone, and storytelling style better than keywords alone.
            </p>

            <div className="space-y-8">
              {GUIDED_PROMPTS.map((prompt) => (
                <div key={prompt.id} className="space-y-2 p-4 border rounded-lg bg-muted/30">
                  <Label className="text-base font-medium">{prompt.text}</Label>
                  <p className="text-xs text-muted-foreground mb-2">{prompt.helper}</p>
                  <Textarea 
                    value={guidedResponses[prompt.id] || ''}
                    onChange={(e) => handleGuidedResponseChange(prompt.id, e.target.value)}
                    className="min-h-[120px] bg-background"
                    placeholder="Write your response here..."
                  />
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* Section 6: Raw Samples (Legacy/Extra) */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 pb-2 border-b">
              <IconBook className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Additional Writing Samples</h2>
            </div>
             <p className="text-muted-foreground text-sm">
              Paste any other examples of your writing here (blogs, emails, essays).
            </p>

            <div className="space-y-2">
              <Textarea
                value={newSample}
                onChange={(e) => setNewSample(e.target.value)}
                placeholder="Paste a paragraph of your writing here..."
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
                <p className="text-sm text-muted-foreground italic">No additional samples provided.</p>
              )}
            </div>
          </section>

           <Separator />

           {/* Section 7: Advanced */}
           <section className="space-y-4">

             <div className="flex items-center gap-2 pb-2 border-b">
              <IconWand className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Advanced Instructions</h2>
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
          </section>

        </div>
      </PageContent>
    </>
  );
}

// --- Helper Components ---

function SelectField({ 
  label, 
  id, 
  value, 
  options, 
  onChange 
}: { 
  label: string; 
  id: string; 
  value?: string | null; 
  options: Option[]; 
  onChange: (val: string) => void 
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 border rounded-md px-3 py-2 text-sm bg-background"
      >
        <option value="">(Default)</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ArrayInput({
  label,
  placeholder,
  items,
  inputValue,
  onInputChange,
  onAdd,
  onRemove
}: {
  label: string;
  placeholder: string;
  items: string[];
  inputValue: string;
  onInputChange: (val: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={onAdd}
          disabled={!inputValue.trim()}
        >
          <IconPlus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {items.map((item, i) => (
          <div key={i} className="bg-secondary text-secondary-foreground text-sm px-3 py-1 rounded-full flex items-center gap-1">
            <span>{item}</span>
            <button
              onClick={() => onRemove(i)}
              className="hover:bg-black/10 rounded-full p-0.5"
            >
              <IconX className="w-3 h-3" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No items added.</p>
        )}
      </div>
    </div>
  );
}

