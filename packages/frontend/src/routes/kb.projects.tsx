import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { IconPlus, IconTrash, IconLoader2, IconPencil, IconExternalLink } from '@tabler/icons-react';
import { projectsApi, type Project } from '@/lib/api';
import { PageHeader } from '@/components/kb/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/kb/projects')({
  component: ProjectsPage,
});

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.list();
      setProjects(data);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (data: Partial<Project>) => {
    const newProject = await projectsApi.create({
      name: data.name || '',
      description: data.description || null,
      url: data.url || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      learnings: data.learnings || null,
      technologies: data.technologies || null,
    });
    setProjects([newProject, ...projects]);
    setShowForm(false);
  };

  const handleUpdate = async (id: string, data: Partial<Project>) => {
    const updated = await projectsApi.update(id, data);
    setProjects(projects.map((p) => (p.id === id ? updated : p)));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    await projectsApi.delete(id);
    setProjects(projects.filter((p) => p.id !== id));
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
        title="Projects"
        description="Personal and side projects that showcase your skills"
        actions={
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <IconPlus className="w-4 h-4" />
            Add Project
          </Button>
        }
      />

      {showForm && (
        <ProjectForm
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}

      {projects.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No projects added yet.</p>
          <p className="text-sm mt-1">Add projects to showcase in your resume.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          editingId === project.id ? (
            <ProjectForm
              key={project.id}
              project={project}
              onSave={(data) => handleUpdate(project.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => setEditingId(project.id)}
              onDelete={() => handleDelete(project.id)}
            />
          )
        ))}
      </div>
    </div>
  );
}

interface ProjectFormProps {
  project?: Project;
  onSave: (data: Partial<Project>) => void;
  onCancel: () => void;
}

function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const [data, setData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    url: project?.url || '',
    learnings: project?.learnings || '',
    technologies: project?.technologies?.join(', ') || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: data.name,
      description: data.description || null,
      url: data.url || null,
      learnings: data.learnings || null,
      technologies: data.technologies ? data.technologies.split(',').map((t) => t.trim()).filter(Boolean) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-muted/30">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Project Name *</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            placeholder="My Awesome Project"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            placeholder="What does this project do?"
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            value={data.url}
            onChange={(e) => setData({ ...data, url: e.target.value })}
            placeholder="https://github.com/..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="technologies">Technologies</Label>
          <Input
            id="technologies"
            value={data.technologies}
            onChange={(e) => setData({ ...data, technologies: e.target.value })}
            placeholder="React, TypeScript, Node.js (comma-separated)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="learnings">Key Learnings</Label>
          <Textarea
            id="learnings"
            value={data.learnings}
            onChange={(e) => setData({ ...data, learnings: e.target.value })}
            placeholder="What did you learn from this project?"
            className="min-h-[60px]"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save Project</Button>
        </div>
      </div>
    </form>
  );
}

interface ProjectCardProps {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}

function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  return (
    <div className="border rounded-lg p-4 group hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{project.name}</h3>
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary"
            >
              <IconExternalLink className="w-4 h-4" />
            </a>
          )}
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

      {project.description && (
        <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
      )}

      {project.technologies && project.technologies.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {project.technologies.map((tech, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {tech}
            </Badge>
          ))}
        </div>
      )}

      {project.learnings && (
        <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2">
          {project.learnings}
        </p>
      )}
    </div>
  );
}
