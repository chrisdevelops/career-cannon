/**
 * Job Input Form
 * 
 * Form for entering job details before generation:
 * - Company name
 * - Position
 * - Job description (textarea)
 * - Temperature slider
 * - Optional user prompt
 */

import { useGenerationStore } from '@/stores/generation-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TemperatureSlider } from './temperature-slider';

export function JobInputForm() {
  const input = useGenerationStore((s) => s.session?.input);
  const updateInput = useGenerationStore((s) => s.updateInput);

  if (!input) return null;

  return (
    <div className="space-y-6">
      {/* Company & Position */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            placeholder="e.g., Acme Corp"
            value={input.company}
            onChange={(e) => updateInput({ company: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            placeholder="e.g., Senior Software Engineer"
            value={input.position}
            onChange={(e) => updateInput({ position: e.target.value })}
          />
        </div>
      </div>

      {/* Job Description */}
      <div className="space-y-2">
        <Label htmlFor="jobDescription">Job Description</Label>
        <Textarea
          id="jobDescription"
          placeholder="Paste the full job description here..."
          value={input.jobDescription}
          onChange={(e) => updateInput({ jobDescription: e.target.value })}
          className="min-h-[200px] font-mono text-sm"
        />
      </div>

      {/* Temperature */}
      <TemperatureSlider
        value={input.temperature}
        onChange={(temperature) => updateInput({ temperature })}
      />

      {/* Optional User Prompt */}
      <div className="space-y-2">
        <Label htmlFor="userPrompt">
          Additional Instructions{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="userPrompt"
          placeholder="Any specific guidance for the AI? e.g., 'Emphasize my leadership experience' or 'Keep it under one page'"
          value={input.userPrompt}
          onChange={(e) => updateInput({ userPrompt: e.target.value })}
          className="min-h-[80px]"
        />
      </div>
    </div>
  );
}
