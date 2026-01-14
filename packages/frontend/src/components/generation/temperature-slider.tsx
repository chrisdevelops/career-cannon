/**
 * Temperature Slider
 * 
 * Controls how tightly the generated content maps to the job description:
 * - 0.0 = General, experience-led
 * - 1.0 = Hyper-targeted to JD
 */

import { Label } from '@/components/ui/label';

interface TemperatureSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function TemperatureSlider({ value, onChange }: TemperatureSliderProps) {
  const getLabel = (temp: number) => {
    if (temp < 0.3) return 'General';
    if (temp < 0.6) return 'Balanced';
    if (temp < 0.85) return 'Targeted';
    return 'Hyper-Targeted';
  };

  const getDescription = (temp: number) => {
    if (temp < 0.3) return 'Broad showcase of experience and skills';
    if (temp < 0.6) return 'Balanced mix of relevant experience';
    if (temp < 0.85) return 'Focused on job requirements';
    return 'Maximum alignment with job description';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Targeting Level</Label>
        <span className="text-sm font-medium text-primary">
          {getLabel(value)}
        </span>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        
        {/* Labels */}
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>General</span>
          <span>Hyper-Targeted</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground">
        {getDescription(value)}
      </p>
    </div>
  );
}
