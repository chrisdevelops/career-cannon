import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { IconPlus, IconTrash, IconLoader2, IconPencil, IconSchool } from '@tabler/icons-react';
import { educationApi, type Education } from '@/lib/api';
import { PageHeader } from '@/components/kb/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export const Route = createFileRoute('/kb/education')({
  component: EducationPage,
});

function EducationPage() {
  const [items, setItems] = useState<Education[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await educationApi.list();
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (data: Partial<Education>) => {
    const newItem = await educationApi.create({
      institution: data.institution || '',
      degree: data.degree || '',
      field: data.field || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      gpa: data.gpa || null,
      honors: data.honors || null,
    });
    setItems([newItem, ...items]);
    setShowForm(false);
  };

  const handleUpdate = async (id: string, data: Partial<Education>) => {
    const updated = await educationApi.update(id, data);
    setItems(items.map((item) => (item.id === id ? updated : item)));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this education entry?')) return;
    await educationApi.delete(id);
    setItems(items.filter((item) => item.id !== id));
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <IconLoader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Education"
        description="Your academic background and qualifications"
        actions={
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <IconPlus className="w-4 h-4" />
            Add Education
          </Button>
        }
      />

      {showForm && (
        <EducationForm
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}

      {items.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No education entries added yet.</p>
          <p className="text-sm mt-1">Add your degrees and certifications to showcase your background.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          editingId === item.id ? (
            <EducationForm
              key={item.id}
              education={item}
              onSave={(data) => handleUpdate(item.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <EducationCard
              key={item.id}
              education={item}
              onEdit={() => setEditingId(item.id)}
              onDelete={() => handleDelete(item.id)}
            />
          )
        ))}
      </div>
    </div>
  );
}

interface EducationFormProps {
  education?: Education;
  onSave: (data: Partial<Education>) => void;
  onCancel: () => void;
}

function EducationForm({ education, onSave, onCancel }: EducationFormProps) {
  const [data, setData] = useState({
    institution: education?.institution || '',
    degree: education?.degree || '',
    field: education?.field || '',
    startDate: education?.startDate ? education.startDate.split('T')[0] : '',
    endDate: education?.endDate ? education.endDate.split('T')[0] : '',
    gpa: education?.gpa || '',
    honors: education?.honors || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      institution: data.institution,
      degree: data.degree,
      field: data.field || null,
      startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      gpa: data.gpa || null,
      honors: data.honors || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-muted/30">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="institution">Institution *</Label>
          <Input
            id="institution"
            value={data.institution}
            onChange={(e) => setData({ ...data, institution: e.target.value })}
            placeholder="University Name"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="degree">Degree *</Label>
            <Input
              id="degree"
              value={data.degree}
              onChange={(e) => setData({ ...data, degree: e.target.value })}
              placeholder="Bachelor of Science"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="field">Field of Study</Label>
            <Input
              id="field"
              value={data.field}
              onChange={(e) => setData({ ...data, field: e.target.value })}
              placeholder="Computer Science"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={data.startDate}
              onChange={(e) => setData({ ...data, startDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={data.endDate}
              onChange={(e) => setData({ ...data, endDate: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gpa">GPA</Label>
            <Input
              id="gpa"
              value={data.gpa}
              onChange={(e) => setData({ ...data, gpa: e.target.value })}
              placeholder="3.8/4.0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="honors">Honors</Label>
            <Textarea
              id="honors"
              value={data.honors}
              onChange={(e) => setData({ ...data, honors: e.target.value })}
              placeholder="Magna Cum Laude"
              className="min-h-[40px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </div>
    </form>
  );
}

interface EducationCardProps {
  education: Education;
  onEdit: () => void;
  onDelete: () => void;
}

function EducationCard({ education, onEdit, onDelete }: EducationCardProps) {
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div className="border rounded-lg p-4 group hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-md">
            <IconSchool className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">{education.institution}</h3>
            <p className="text-sm text-muted-foreground">
              {education.degree}
              {education.field && ` in ${education.field}`}
            </p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1 hover:bg-muted rounded">
            <IconPencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1 hover:bg-muted rounded text-destructive">
            <IconTrash className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
        {(education.startDate || education.endDate) && (
          <div className="text-muted-foreground">
            {education.startDate ? formatDate(education.startDate) : '?'} - {education.endDate ? formatDate(education.endDate) : 'Present'}
          </div>
        )}

        {education.gpa && (
          <div className="text-muted-foreground">
            GPA: {education.gpa}
          </div>
        )}
      </div>

      {education.honors && (
        <div className="mt-2 text-sm text-muted-foreground border-l-2 border-primary/30 pl-2">
          {education.honors}
        </div>
      )}
    </div>
  );
}
