import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { profileApi, type Profile } from '@/lib/api';
import { PageHeader } from '@/components/kb/page-header';
import { SaveIndicator } from '@/components/kb/save-indicator';
import { useDebouncedCallback } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IconLoader2 } from '@tabler/icons-react';

export const Route = createFileRoute('/kb/profile')({
  component: ProfilePage,
});

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function ProfilePage() {
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string>();

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await profileApi.get();
      setProfile(data || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Debounced save
  const saveProfile = useCallback(async (data: Partial<Profile>) => {
    setSaveStatus('saving');
    try {
      const result = await profileApi.update(data);
      setProfile(result);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }, []);

  const debouncedSave = useDebouncedCallback(saveProfile, 1000);

  const handleChange = (field: keyof Profile, value: string) => {
    const updated = { ...profile, [field]: value || null };
    setProfile(updated);
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
    <div className="p-8 max-w-2xl">
      <PageHeader
        title="Profile"
        description="Your basic contact information and professional summary"
        actions={<SaveIndicator status={saveStatus} error={error} />}
      />

      <div className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={profile.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="John Doe"
          />
        </div>

        {/* Contact Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="john@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={profile.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={profile.location || ''}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="San Francisco, CA"
          />
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={profile.linkedin || ''}
              onChange={(e) => handleChange('linkedin', e.target.value)}
              placeholder="https://linkedin.com/in/johndoe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="github">GitHub</Label>
            <Input
              id="github"
              value={profile.github || ''}
              onChange={(e) => handleChange('github', e.target.value)}
              placeholder="https://github.com/johndoe"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={profile.website || ''}
            onChange={(e) => handleChange('website', e.target.value)}
            placeholder="https://johndoe.com"
          />
        </div>

        {/* Summary */}
        <div className="space-y-2">
          <Label htmlFor="summary">Professional Summary</Label>
          <Textarea
            id="summary"
            value={profile.summary || ''}
            onChange={(e) => handleChange('summary', e.target.value)}
            placeholder="A brief overview of your professional background and key strengths..."
            className="min-h-[120px]"
          />
          <p className="text-xs text-muted-foreground">
            This will be used as context for AI-generated resumes and cover letters.
          </p>
        </div>
      </div>
    </div>
  );
}
