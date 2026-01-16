import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import {
  achievementsApi,
  educationApi,
  experienceItemsApi,
  profileApi,
  projectsApi,
  rolesApi,
  skillsApi,
} from '@/lib/api';
import type { ParseResumeResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { PageContent, PageHeaderBar } from '@/components/layout/page-shell';
import { PageTitleBar } from '@/components/layout/page-title-bar';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCheck,
  IconDatabaseImport,
  IconHistory,
  IconLoader2,
  IconRefresh,
} from '@tabler/icons-react';

export const Route = createFileRoute('/import/review')({
  component: ImportReviewPage,
});

const STORAGE_KEY = 'career-cannon:parse-resume';

type SelectionState = {
  profile: boolean;
  roles: Set<number>;
  skills: Set<number>;
  education: Set<number>;
  projects: Set<number>;
  standaloneAchievements: Set<number>;
};

type ProgressState = {
  currentStep: string;
  completedSteps: number;
  totalSteps: number;
};

function ImportReviewPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ParseResumeResult | null>(null);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);

  const standaloneAchievementIndices = useMemo(() => {
    if (!data) return [] as number[];
    return data.parsed.achievements
      .map((a, idx) => ({ a, idx }))
      .filter(({ a }) => a.roleIndex === null || a.roleIndex === undefined)
      .map(({ idx }) => idx);
  }, [data]);

  const [selection, setSelection] = useState<SelectionState>({
    profile: true,
    roles: new Set(),
    skills: new Set(),
    education: new Set(),
    projects: new Set(),
    standaloneAchievements: new Set(),
  });

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsedData = JSON.parse(stored) as ParseResumeResult;
      setData(parsedData);

      const rolesSelected = new Set<number>();
      parsedData.duplicates.roles.forEach((r, i) => {
        if (!r.isLikelyDuplicate) rolesSelected.add(i);
      });

      const skillsSelected = new Set<number>();
      parsedData.duplicates.skills.forEach((s, i) => {
        if (!s.isLikelyDuplicate) skillsSelected.add(i);
      });

      const educationSelected = new Set<number>();
      parsedData.duplicates.education.forEach((e, i) => {
        if (!e.isLikelyDuplicate) educationSelected.add(i);
      });

      const projectsSelected = new Set<number>();
      parsedData.parsed.projects.forEach((_p, i) => projectsSelected.add(i));

      const standaloneAchievementsSelected = new Set<number>();
      parsedData.duplicates.achievements.forEach((a, i) => {
        const roleIndex = parsedData.parsed.achievements[i]?.roleIndex;
        const isStandalone = roleIndex === null || roleIndex === undefined;
        if (isStandalone && !a.isLikelyDuplicate) standaloneAchievementsSelected.add(i);
      });

      setSelection({
        profile: !!parsedData.parsed.profile,
        roles: rolesSelected,
        skills: skillsSelected,
        education: educationSelected,
        projects: projectsSelected,
        standaloneAchievements: standaloneAchievementsSelected,
      });
    } catch {
      // ignore
    }
  }, []);

  const selectedCount =
    selection.roles.size +
    selection.skills.size +
    selection.education.size +
    selection.projects.size +
    selection.standaloneAchievements.size +
    (selection.profile ? 1 : 0);

  const toggleSetItem = (key: keyof Omit<SelectionState, 'profile'>, index: number) => {
    setSelection((prev) => {
      const next = new Set(prev[key]);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return { ...prev, [key]: next };
    });
  };

  const handleCommit = async () => {
    if (!data) return;

    setCommitting(true);
    setCommitError(null);

    // Calculate total steps
    const hasProfile = selection.profile && data.parsed.profile;
    const selectedRoleIndices = Array.from(selection.roles).sort((a, b) => a - b);
    const hasStandalone = selection.standaloneAchievements.size > 0;
    const hasSkills = selection.skills.size > 0;
    const hasEducation = selection.education.size > 0;
    const hasProjects = selection.projects.size > 0;

    const totalSteps =
      (hasProfile ? 1 : 0) +
      selectedRoleIndices.length +
      (hasStandalone ? 1 : 0) +
      (hasSkills ? 1 : 0) +
      (hasEducation ? 1 : 0) +
      (hasProjects ? 1 : 0);

    let completed = 0;
    let currentStepLabel = 'Initializing...';
    setProgress({ currentStep: currentStepLabel, completedSteps: 0, totalSteps });

    try {
      // 1) Profile (singleton; backend creates if missing)
      if (hasProfile) {
        currentStepLabel = 'Saving profile';
        setProgress({ currentStep: currentStepLabel, completedSteps: completed, totalSteps });

        await profileApi.update(data.parsed.profile!);
        completed++;
      }

      // 2) Roles (create), then nested items
      for (const roleIndex of selectedRoleIndices) {
        const role = data.parsed.roles[roleIndex];
        if (!role) continue;

        currentStepLabel = `Saving role: ${role.company}`;
        setProgress({ currentStep: currentStepLabel, completedSteps: completed, totalSteps });

        const createdRole = await rolesApi.create({
          company: role.company,
          title: role.title,
          startDate: role.startDate,
          endDate: role.endDate ?? null,
          current: role.current,
          description: role.description ?? null,
        });

        const experienceItems = data.parsed.experienceItems.filter((x) => x.roleIndex === roleIndex);
        for (const item of experienceItems) {
          await experienceItemsApi.create({
            roleId: createdRole.id,
            content: item.content,
            type: item.type,
          });
        }

        const achievements = data.parsed.achievements.filter((x) => x.roleIndex === roleIndex);
        for (const achievement of achievements) {
          await achievementsApi.create({
            roleId: createdRole.id,
            problem: achievement.problem,
            action: achievement.action,
            outcome: achievement.outcome,
            metrics: achievement.metrics ?? null,
          });
        }
        completed++;
      }

      // 3) Standalone achievements
      if (hasStandalone) {
        currentStepLabel = 'Saving standalone achievements';
        setProgress({ currentStep: currentStepLabel, completedSteps: completed, totalSteps });

        const promises = Array.from(selection.standaloneAchievements).map((idx) => {
          const a = data.parsed.achievements[idx];
          return achievementsApi.create({
            roleId: null,
            problem: a.problem,
            action: a.action,
            outcome: a.outcome,
            metrics: a.metrics ?? null,
          });
        });
        await Promise.all(promises);
        completed++;
      }

      // 4) Skills
      if (hasSkills) {
        currentStepLabel = 'Saving skills';
        setProgress({ currentStep: currentStepLabel, completedSteps: completed, totalSteps });

        const promises = Array.from(selection.skills).map((idx) => {
          const s = data.parsed.skills[idx];
          return skillsApi.create({
            name: s.name,
            category: s.category ?? null,
            proficiency: s.proficiency ?? null,
            evidence: null,
          });
        });
        await Promise.all(promises);
        completed++;
      }

      // 5) Education
      if (hasEducation) {
        currentStepLabel = 'Saving education';
        setProgress({ currentStep: currentStepLabel, completedSteps: completed, totalSteps });

        const promises = Array.from(selection.education).map((idx) => {
          const e = data.parsed.education[idx];
          return educationApi.create({
            institution: e.institution,
            degree: e.degree,
            field: e.field ?? null,
            startDate: e.startDate ?? null,
            endDate: e.endDate ?? null,
            gpa: e.gpa ?? null,
            honors: e.honors ?? null,
          });
        });
        await Promise.all(promises);
        completed++;
      }

      // 6) Projects
      if (hasProjects) {
        currentStepLabel = 'Saving projects';
        setProgress({ currentStep: currentStepLabel, completedSteps: completed, totalSteps });

        const promises = Array.from(selection.projects).map((idx) => {
          const p = data.parsed.projects[idx];
          return projectsApi.create({
            name: p.name,
            description: p.description ?? null,
            url: p.url ?? null,
            startDate: null,
            endDate: null,
            learnings: null,
            technologies: p.technologies ?? null,
          });
        });
        await Promise.all(promises);
        completed++;
      }

      sessionStorage.removeItem(STORAGE_KEY);
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import some items.';
      setCommitError(`Error while ${currentStepLabel.toLowerCase()}: ${message}`);
    } finally {
      setCommitting(false);
      setProgress(null);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center space-y-6">
        <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
          <IconCheck className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Import Successful</h2>
          <p className="text-muted-foreground">Your selected items were added to the Knowledge Base.</p>
        </div>
        <Button onClick={() => navigate({ to: '/kb' })} size="lg">
          View Knowledge Base
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center space-y-4">
        <div className="bg-muted p-4 rounded-full">
          <IconDatabaseImport className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">No resume data found</h2>
        <p className="text-muted-foreground max-w-sm">Go back and import your resume first.</p>
        <Button onClick={() => navigate({ to: '/import' })}>Back to Import</Button>
      </div>
    );
  }

  return (
    <>
      <PageHeaderBar>
        <PageTitleBar
          title="Review Import"
          subtitle={`${selectedCount} selected`}
          leading={
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/import' })}>
              <IconArrowLeft className="w-5 h-5" />
            </Button>
          }
          actions={
            <Button onClick={handleCommit} disabled={committing || selectedCount === 0} className="gap-2">
              {committing && <IconLoader2 className="w-4 h-4 animate-spin" />}
              Import Selected
            </Button>
          }
        />
      </PageHeaderBar>

      <PageContent>
        <div className="max-w-5xl mx-auto space-y-8">
          {committing && progress && (
            <Card className="border-primary/20 bg-primary/5 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base flex items-center gap-2">
                    <IconLoader2 className="w-4 h-4 animate-spin text-primary" />
                    Importing...
                  </CardTitle>
                  <span className="text-sm text-muted-foreground font-mono">
                    {Math.round((progress.completedSteps / progress.totalSteps) * 100)}%
                  </span>
                </div>
                <CardDescription>{progress.currentStep}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 ease-in-out"
                    style={{ width: `${(progress.completedSteps / progress.totalSteps) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {!data.validation.valid && (
            <Card className="border-yellow-200 bg-yellow-50/60">
              <CardHeader>
                <CardTitle className="text-base">Validation issues</CardTitle>
                <CardDescription>AI extracted content may need review.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                  {data.validation.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {data.duplicates.summary.likelyDuplicates > 0 && (
            <Card className="border-orange-200 bg-orange-50/60">
              <CardHeader>
                <CardTitle className="text-base">Potential duplicates detected</CardTitle>
                <CardDescription>
                  {data.duplicates.summary.likelyDuplicates} / {data.duplicates.summary.totalItems} items look like duplicates.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {commitError && (
            <Card className="border-destructive/40 bg-destructive/10">
              <CardHeader>
                <CardTitle className="text-base text-destructive">Import failed</CardTitle>
                <CardDescription className="text-destructive">
                  <div className="space-y-4">
                    <p>{commitError}</p>
                    <div className="bg-background/50 p-3 rounded border border-destructive/20 text-sm text-foreground">
                      <strong>Note:</strong> Partial import may have occurred due to multi-call commit.
                      Your selections are preserved so you can retry.
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive/30 hover:bg-destructive/10 hover:text-destructive bg-background"
                        onClick={() => navigate({ to: '/history' })}
                      >
                        <IconHistory className="w-4 h-4 mr-2" />
                        Go to Change History
                      </Button>
                      <Button size="sm" variant="destructive" onClick={handleCommit}>
                        <IconRefresh className="w-4 h-4 mr-2" />
                        Retry Import
                      </Button>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Profile */}
          {data.parsed.profile && (
            <SectionCard
              title="Profile"
              description="Contact info and summary"
              checked={selection.profile}
              onCheckChange={(checked) => setSelection((s) => ({ ...s, profile: checked }))}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <Field label="Name" value={data.parsed.profile.name ?? ''} />
                <Field label="Email" value={data.parsed.profile.email ?? ''} />
                <Field label="Phone" value={data.parsed.profile.phone ?? ''} />
                <Field label="Location" value={data.parsed.profile.location ?? ''} />
                <div className="md:col-span-2">
                  <Label className="text-muted-foreground">Summary</Label>
                  <div className="text-muted-foreground whitespace-pre-wrap">
                    {data.parsed.profile.summary ?? ''}
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Roles */}
          <SectionTitle title="Roles" count={data.parsed.roles.length} />
          <div className="space-y-3">
            {data.duplicates.roles.map((r, i) => (
              <ItemCard
                key={i}
                checked={selection.roles.has(i)}
                onCheckedChange={() => toggleSetItem('roles', i)}
                isDuplicate={r.isLikelyDuplicate}
                duplicateDetails={r.duplicates[0]?.matchDetails}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{r.item.title}</div>
                    <div className="text-sm text-muted-foreground">{r.item.company}</div>
                  </div>
                  <div className="text-sm text-muted-foreground text-right">
                    {r.item.startDate} – {r.item.current ? 'Present' : r.item.endDate ?? 'Present'}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs font-normal">
                    {data.parsed.experienceItems.filter((x) => x.roleIndex === i).length} experience items
                  </Badge>
                  <Badge variant="outline" className="text-xs font-normal">
                    {data.parsed.achievements.filter((x) => x.roleIndex === i).length} achievements
                  </Badge>
                </div>
              </ItemCard>
            ))}
            {data.parsed.roles.length === 0 && <EmptyLine text="No roles found." />}
          </div>

          {/* Skills */}
          <SectionTitle title="Skills" count={data.parsed.skills.length} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.duplicates.skills.map((s, i) => (
              <ItemCard
                key={i}
                checked={selection.skills.has(i)}
                onCheckedChange={() => toggleSetItem('skills', i)}
                isDuplicate={s.isLikelyDuplicate}
                duplicateDetails={s.duplicates[0]?.matchDetails}
                compact
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{s.item.name}</span>
                  {s.item.proficiency && (
                    <span className="text-xs text-muted-foreground capitalize">{s.item.proficiency}</span>
                  )}
                </div>
              </ItemCard>
            ))}
            {data.parsed.skills.length === 0 && <EmptyLine text="No skills found." />}
          </div>

          {/* Education */}
          <SectionTitle title="Education" count={data.parsed.education.length} />
          <div className="space-y-3">
            {data.duplicates.education.map((e, i) => (
              <ItemCard
                key={i}
                checked={selection.education.has(i)}
                onCheckedChange={() => toggleSetItem('education', i)}
                isDuplicate={e.isLikelyDuplicate}
                duplicateDetails={e.duplicates[0]?.matchDetails}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{e.item.institution}</div>
                    <div className="text-sm text-muted-foreground">
                      {e.item.degree}
                      {e.item.field ? ` in ${e.item.field}` : ''}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground text-right">
                    {e.item.startDate ?? '?'} – {e.item.endDate ?? 'Present'}
                  </div>
                </div>
              </ItemCard>
            ))}
            {data.parsed.education.length === 0 && <EmptyLine text="No education found." />}
          </div>

          {/* Projects */}
          <SectionTitle title="Projects" count={data.parsed.projects.length} />
          <div className="space-y-3">
            {data.parsed.projects.map((p, i) => (
              <ItemCard
                key={i}
                checked={selection.projects.has(i)}
                onCheckedChange={() => toggleSetItem('projects', i)}
              >
                <div className="font-medium">{p.name}</div>
                {p.description && <div className="text-sm text-muted-foreground mt-1">{p.description}</div>}
                {p.technologies && p.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.technologies.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </ItemCard>
            ))}
            {data.parsed.projects.length === 0 && <EmptyLine text="No projects found." />}
          </div>

          {/* Standalone achievements */}
          <SectionTitle title="Standalone Achievements" count={standaloneAchievementIndices.length} />
          <div className="space-y-3">
            {standaloneAchievementIndices.map((idx) => {
              const a = data.parsed.achievements[idx];
              const dup = data.duplicates.achievements[idx];
              return (
                <ItemCard
                  key={idx}
                  checked={selection.standaloneAchievements.has(idx)}
                  onCheckedChange={() => toggleSetItem('standaloneAchievements', idx)}
                  isDuplicate={dup?.isLikelyDuplicate}
                  duplicateDetails={dup?.duplicates[0]?.matchDetails}
                >
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="font-medium">P:</span> {a.problem}
                    </div>
                    <div>
                      <span className="font-medium">A:</span> {a.action}
                    </div>
                    <div>
                      <span className="font-medium">R:</span> {a.outcome}
                    </div>
                    {a.metrics && <div className="text-muted-foreground">{a.metrics}</div>}
                  </div>
                </ItemCard>
              );
            })}
            {standaloneAchievementIndices.length === 0 && <EmptyLine text="No standalone achievements found." />}
          </div>
        </div>
      </PageContent>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="font-medium">{value || '-'}</div>
    </div>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      <Badge variant="secondary">{count}</Badge>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function SectionCard({
  title,
  description,
  checked,
  onCheckChange,
  children,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onCheckChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn('border-l-4', checked ? 'border-l-primary' : 'border-l-transparent opacity-80')}>
      <CardHeader className="flex flex-row items-start space-y-0 pb-2">
        <div className="flex items-center gap-4 flex-1">
          <SimpleCheckbox checked={checked} onChange={onCheckChange} />
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-12 pt-2">{children}</CardContent>
    </Card>
  );
}

function ItemCard({
  children,
  checked,
  onCheckedChange,
  isDuplicate,
  duplicateDetails,
  compact,
}: {
  children: React.ReactNode;
  checked: boolean;
  onCheckedChange: () => void;
  isDuplicate?: boolean;
  duplicateDetails?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative flex gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:border-primary/50',
        checked ? 'bg-card border-primary/40 shadow-sm' : 'bg-muted/30 border-transparent opacity-70',
        compact ? 'items-center' : 'items-start'
      )}
      onClick={onCheckedChange}
    >
      <div className="pt-1">
        <SimpleCheckbox checked={checked} onChange={() => onCheckedChange()} />
      </div>
      <div className="flex-1 min-w-0">{children}</div>

      {isDuplicate && (
        <div className="absolute top-2 right-2">
          <Badge variant="destructive" className="text-[10px] h-5 px-1.5 flex gap-1">
            <IconAlertTriangle className="w-3 h-3" />
            Duplicate
          </Badge>
        </div>
      )}

      {isDuplicate && duplicateDetails && !compact && (
        <div className="absolute bottom-2 right-2 text-[10px] text-destructive/80 max-w-[180px] truncate text-right">
          Matches: {duplicateDetails}
        </div>
      )}
    </div>
  );
}

function SimpleCheckbox({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div
      className={cn(
        'w-5 h-5 rounded border flex items-center justify-center transition-colors',
        checked ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-background'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
    >
      {checked && <IconCheck className="w-3.5 h-3.5" />}
    </div>
  );
}
