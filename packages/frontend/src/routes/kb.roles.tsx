import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import {
  IconPlus,
  IconTrash,
  IconChevronDown,
  IconChevronRight,
  IconLoader2,
  IconPencil,
} from '@tabler/icons-react';
import { rolesApi, experienceItemsApi, achievementsApi, type Role, type ExperienceItem, type Achievement } from '@/lib/api';
import { PageContent, PageHeaderBar } from '@/components/layout/page-shell';
import { PageTitleBar } from '@/components/layout/page-title-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/kb/roles')({
  component: RolesPage,
});

function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [showNewRoleForm, setShowNewRoleForm] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await rolesApi.list();
      setRoles(data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async (data: Partial<Role>) => {
    const newRole = await rolesApi.create({
      company: data.company || '',
      title: data.title || '',
      startDate: data.startDate || new Date().toISOString(),
      endDate: data.endDate,
      current: data.current || false,
      description: data.description,
    });
    setRoles([newRole, ...roles]);
    setShowNewRoleForm(false);
  };

  const handleUpdateRole = async (id: string, data: Partial<Role>) => {
    const updated = await rolesApi.update(id, data);
    setRoles(roles.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    setEditingRole(null);
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Delete this role and all its experience items?')) return;
    await rolesApi.delete(id);
    setRoles(roles.filter((r) => r.id !== id));
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
          title="Roles & Experience"
          subtitle="Your work history with responsibilities and achievements"
          actions={
            <Button onClick={() => setShowNewRoleForm(true)} className="gap-2">
              <IconPlus className="w-4 h-4" />
              Add Role
            </Button>
          }
        />
      </PageHeaderBar>

      <PageContent>
        {showNewRoleForm && (
          <RoleForm
            onSave={handleAddRole}
            onCancel={() => setShowNewRoleForm(false)}
          />
        )}

        <div className="space-y-4">
          {roles.length === 0 && !showNewRoleForm && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No roles added yet.</p>
              <p className="text-sm mt-1">Add your work experience to get started.</p>
            </div>
          )}

          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              isExpanded={expandedRole === role.id}
              isEditing={editingRole === role.id}
              onToggle={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
              onEdit={() => setEditingRole(role.id)}
              onCancelEdit={() => setEditingRole(null)}
              onSave={(data) => handleUpdateRole(role.id, data)}
              onDelete={() => handleDeleteRole(role.id)}
              onRefresh={loadRoles}
            />
          ))}
        </div>
      </PageContent>
    </>
  );
}

interface RoleFormProps {
  role?: Role;
  onSave: (data: Partial<Role>) => void;
  onCancel: () => void;
}

function RoleForm({ role, onSave, onCancel }: RoleFormProps) {
  const [data, setData] = useState({
    company: role?.company || '',
    title: role?.title || '',
    startDate: role?.startDate ? role.startDate.split('T')[0] : '',
    endDate: role?.endDate ? role.endDate.split('T')[0] : '',
    current: role?.current || false,
    description: role?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...data,
      startDate: new Date(data.startDate).toISOString(),
      endDate: data.current ? null : (data.endDate ? new Date(data.endDate).toISOString() : null),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 mb-4 bg-muted/30">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <Label htmlFor="company">Company *</Label>
          <Input
            id="company"
            value={data.company}
            onChange={(e) => setData({ ...data, company: e.target.value })}
            placeholder="Acme Corp"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={data.title}
            onChange={(e) => setData({ ...data, title: e.target.value })}
            placeholder="Senior Software Engineer"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            value={data.startDate}
            onChange={(e) => setData({ ...data, startDate: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={data.endDate}
            onChange={(e) => setData({ ...data, endDate: e.target.value })}
            disabled={data.current}
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.current}
              onChange={(e) => setData({ ...data, current: e.target.checked, endDate: '' })}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Current role</span>
          </label>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          placeholder="Brief overview of the role..."
          className="min-h-[80px]"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Role</Button>
      </div>
    </form>
  );
}

interface RoleCardProps {
  role: Role;
  isExpanded: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: Partial<Role>) => void;
  onDelete: () => void;
  onRefresh: () => void;
}

function RoleCard({
  role,
  isExpanded,
  isEditing,
  onToggle,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onRefresh,
}: RoleCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (isEditing) {
    return <RoleForm role={role} onSave={onSave} onCancel={onCancelEdit} />;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <IconChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <IconChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <h3 className="font-medium">{role.title}</h3>
            <p className="text-sm text-muted-foreground">
              {role.company} · {formatDate(role.startDate)} – {role.current ? 'Present' : (role.endDate ? formatDate(role.endDate) : 'Present')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <IconPencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <IconTrash className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t p-4 space-y-6">
          {role.description && (
            <p className="text-sm text-muted-foreground">{role.description}</p>
          )}

          {/* Experience Items */}
          <ExperienceItemsSection roleId={role.id} items={role.experienceItems || []} onRefresh={onRefresh} />

          {/* Achievements */}
          <AchievementsSection roleId={role.id} achievements={role.achievements || []} onRefresh={onRefresh} />
        </div>
      )}
    </div>
  );
}

interface ExperienceItemsSectionProps {
  roleId: string;
  items: ExperienceItem[];
  onRefresh: () => void;
}

function ExperienceItemsSection({ roleId, items, onRefresh }: ExperienceItemsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<'responsibility' | 'initiative' | 'contribution'>('responsibility');

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    await experienceItemsApi.create({
      roleId,
      content: newContent,
      type: newType,
    });
    setNewContent('');
    setShowForm(false);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await experienceItemsApi.delete(id);
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">Experience Items</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
          <IconPlus className="w-3 h-3" />
          Add
        </Button>
      </div>

      {showForm && (
        <div className="mb-3 p-3 bg-muted/50 rounded-md space-y-2">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Describe a responsibility, initiative, or contribution..."
            className="min-h-[60px]"
          />
          <div className="flex items-center gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as typeof newType)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="responsibility">Responsibility</option>
              <option value="initiative">Initiative</option>
              <option value="contribution">Contribution</option>
            </select>
            <Button size="sm" onClick={handleAdd}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between text-sm group">
            <div className="flex gap-2">
              <span className={cn(
                'shrink-0 text-xs px-1.5 py-0.5 rounded',
                item.type === 'responsibility' && 'bg-blue-100 text-blue-700',
                item.type === 'initiative' && 'bg-green-100 text-green-700',
                item.type === 'contribution' && 'bg-purple-100 text-purple-700'
              )}>
                {item.type.slice(0, 3)}
              </span>
              <span>{item.content}</span>
            </div>
            <button
              onClick={() => handleDelete(item.id)}
              className="opacity-0 group-hover:opacity-100 text-destructive p-1"
            >
              <IconTrash className="w-3 h-3" />
            </button>
          </li>
        ))}
        {items.length === 0 && !showForm && (
          <li className="text-sm text-muted-foreground">No experience items yet</li>
        )}
      </ul>
    </div>
  );
}

interface AchievementsSectionProps {
  roleId: string;
  achievements: Achievement[];
  onRefresh: () => void;
}

function AchievementsSection({ roleId, achievements, onRefresh }: AchievementsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ problem: '', action: '', outcome: '', metrics: '' });

  const handleAdd = async () => {
    if (!form.problem.trim() || !form.action.trim() || !form.outcome.trim()) return;
    await achievementsApi.create({
      roleId,
      problem: form.problem,
      action: form.action,
      outcome: form.outcome,
      metrics: form.metrics || null,
    });
    setForm({ problem: '', action: '', outcome: '', metrics: '' });
    setShowForm(false);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await achievementsApi.delete(id);
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">Achievements (PAR Format)</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
          <IconPlus className="w-3 h-3" />
          Add
        </Button>
      </div>

      {showForm && (
        <div className="mb-3 p-3 bg-muted/50 rounded-md space-y-2">
          <Input
            value={form.problem}
            onChange={(e) => setForm({ ...form, problem: e.target.value })}
            placeholder="Problem: What challenge existed?"
          />
          <Input
            value={form.action}
            onChange={(e) => setForm({ ...form, action: e.target.value })}
            placeholder="Action: What did you do?"
          />
          <Input
            value={form.outcome}
            onChange={(e) => setForm({ ...form, outcome: e.target.value })}
            placeholder="Results: What was the result?"
          />
          <Input
            value={form.metrics}
            onChange={(e) => setForm({ ...form, metrics: e.target.value })}
            placeholder="Metrics (optional): e.g., '50% improvement'"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>Add Achievement</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {achievements.map((a) => (
          <div key={a.id} className="text-sm border-l-2 border-primary/30 pl-3 group">
            <div className="flex justify-between">
              <div>
                <p><strong>P:</strong> {a.problem}</p>
                <p><strong>A:</strong> {a.action}</p>
                <p><strong>R:</strong> {a.outcome}</p>
                {a.metrics && <p className="text-muted-foreground">📊 {a.metrics}</p>}
              </div>
              <button
                onClick={() => handleDelete(a.id)}
                className="opacity-0 group-hover:opacity-100 text-destructive p-1 self-start"
              >
                <IconTrash className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {achievements.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">No achievements yet</p>
        )}
      </div>
    </div>
  );
}
