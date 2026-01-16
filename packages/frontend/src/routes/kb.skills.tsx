import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { IconPlus, IconTrash, IconLoader2, IconPencil, IconX, IconCheck } from '@tabler/icons-react';
import { skillsApi, type Skill } from '@/lib/api';
import { PageContent, PageHeaderBar } from '@/components/layout/page-shell';
import { PageTitleBar } from '@/components/layout/page-title-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/kb/skills')({
  component: SkillsPage,
});

const CATEGORIES = [
  { value: 'technical', label: 'Technical', color: 'bg-blue-100 text-blue-700' },
  { value: 'soft', label: 'Soft Skills', color: 'bg-green-100 text-green-700' },
  { value: 'tool', label: 'Tools', color: 'bg-purple-100 text-purple-700' },
  { value: 'language', label: 'Languages', color: 'bg-orange-100 text-orange-700' },
] as const;

const PROFICIENCIES = [
  { value: 'expert', label: 'Expert' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'beginner', label: 'Beginner' },
] as const;

function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const data = await skillsApi.list();
      setSkills(data);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (data: Partial<Skill>) => {
    const newSkill = await skillsApi.create({
      name: data.name || '',
      category: data.category || null,
      proficiency: data.proficiency || null,
      evidence: data.evidence || null,
    });
    setSkills([...skills, newSkill]);
    setShowForm(false);
  };

  const handleUpdate = async (id: string, data: Partial<Skill>) => {
    const updated = await skillsApi.update(id, data);
    setSkills(skills.map((s) => (s.id === id ? updated : s)));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await skillsApi.delete(id);
    setSkills(skills.filter((s) => s.id !== id));
  };

  const groupedSkills = skills.reduce((acc, skill) => {
    const cat = skill.category || 'uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  const filteredGroups = filterCategory
    ? { [filterCategory]: groupedSkills[filterCategory] || [] }
    : groupedSkills;

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
          title="Skills"
          subtitle="Your technical and soft skills with proficiency levels"
          actions={
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <IconPlus className="w-4 h-4" />
              Add Skill
            </Button>
          }
        />
      </PageHeaderBar>

      <PageContent>
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filterCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterCategory(null)}
          >
            All
          </Button>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={filterCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCategory(cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {showForm && (
          <SkillForm
            onSave={handleAdd}
            onCancel={() => setShowForm(false)}
          />
        )}

        {Object.keys(filteredGroups).length === 0 && !showForm && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No skills added yet.</p>
            <p className="text-sm mt-1">Add your skills to include them in generated resumes.</p>
          </div>
        )}

        <div className="space-y-6">
          {Object.entries(filteredGroups).map(([category, categorySkills]) => {
            const catInfo = CATEGORIES.find((c) => c.value === category);
            return (
              <div key={category}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <span className={cn('px-2 py-0.5 rounded text-xs', catInfo?.color || 'bg-gray-100 text-gray-700')}>
                    {catInfo?.label || 'Uncategorized'}
                  </span>
                  <span>({categorySkills.length})</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {categorySkills.map((skill) => (
                    editingId === skill.id ? (
                      <SkillForm
                        key={skill.id}
                        skill={skill}
                        onSave={(data) => handleUpdate(skill.id, data)}
                        onCancel={() => setEditingId(null)}
                        compact
                      />
                    ) : (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        onEdit={() => setEditingId(skill.id)}
                        onDelete={() => handleDelete(skill.id)}
                      />
                    )
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </PageContent>
    </>
  );
}

interface SkillFormProps {
  skill?: Skill;
  onSave: (data: Partial<Skill>) => void;
  onCancel: () => void;
  compact?: boolean;
}

function SkillForm({ skill, onSave, onCancel, compact }: SkillFormProps) {
  const [data, setData] = useState({
    name: skill?.name || '',
    category: skill?.category || 'technical',
    proficiency: skill?.proficiency || 'intermediate',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.name.trim()) return;
    onSave(data as Partial<Skill>);
  };

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="border rounded-lg p-3 bg-muted/30">
        <Input
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          className="mb-2"
          autoFocus
        />
        <div className="flex gap-1">
          <Button type="submit" size="icon" className="h-8 w-8">
            <IconCheck className="w-4 h-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
            <IconX className="w-4 h-4" />
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 mb-4 bg-muted/30">
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="space-y-2">
          <Label htmlFor="name">Skill Name *</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            placeholder="e.g., TypeScript"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            value={data.category}
            onChange={(e) => setData({ ...data, category: e.target.value as any })}
            className="w-full border rounded-md px-3 py-2 text-sm"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="proficiency">Proficiency</Label>
          <select
            id="proficiency"
            value={data.proficiency}
            onChange={(e) => setData({ ...data, proficiency: e.target.value as any })}
            className="w-full border rounded-md px-3 py-2 text-sm"
          >
            {PROFICIENCIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Skill</Button>
      </div>
    </form>
  );
}

interface SkillCardProps {
  skill: Skill;
  onEdit: () => void;
  onDelete: () => void;
}

function SkillCard({ skill, onEdit, onDelete }: SkillCardProps) {
  const proficiencyColors: Record<string, string> = {
    expert: 'bg-green-500',
    advanced: 'bg-blue-500',
    intermediate: 'bg-yellow-500',
    beginner: 'bg-gray-400',
  };

  return (
    <div className="border rounded-lg p-3 group hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{skill.name}</p>
          {skill.proficiency && (
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('w-2 h-2 rounded-full', proficiencyColors[skill.proficiency] || 'bg-gray-400')} />
              <span className="text-xs text-muted-foreground capitalize">{skill.proficiency}</span>
            </div>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1 hover:bg-muted rounded">
            <IconPencil className="w-3 h-3" />
          </button>
          <button onClick={onDelete} className="p-1 hover:bg-muted rounded text-destructive">
            <IconTrash className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
