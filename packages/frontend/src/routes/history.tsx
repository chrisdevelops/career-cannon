import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import {
  changeLogApi,
  ChangeLogEntry,
  EntityType,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/kb/page-header';
import { 
  IconHistory, 
  IconRotateCcw, 
  IconPlus, 
  IconPencil, 
  IconTrash, 
  IconArrowRight 
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/history')({
  component: HistoryPage,
});

const ENTITY_TYPES: { value: EntityType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Entities' },
  { value: 'profile', label: 'Profile' },
  { value: 'role', label: 'Role' },
  { value: 'experienceItem', label: 'Experience' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'skill', label: 'Skill' },
  { value: 'project', label: 'Project' },
  { value: 'education', label: 'Education' },
  { value: 'voiceBlueprint', label: 'Voice Blueprint' },
];

function HistoryPage() {
  const [history, setHistory] = useState<ChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<EntityType | 'all'>('all');
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params: { limit: number; entityType?: EntityType } = { limit: 50 };
      if (filterType !== 'all') {
        params.entityType = filterType;
      }
      const data = await changeLogApi.list(params);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filterType]);

  const handleUndo = async (entry: ChangeLogEntry) => {
    if (!confirm('Are you sure you want to undo this change? This action might have side effects.')) {
      return;
    }

    setUndoingId(entry.id);
    setMessage(null);
    try {
      const result = await changeLogApi.undo(entry.id);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await fetchHistory();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to undo change' });
    } finally {
      setUndoingId(null);
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-200 dark:text-green-400 dark:border-green-900"><IconPlus className="size-3 mr-1" /> Created</Badge>;
      case 'update':
        return <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 border-blue-200 dark:text-blue-400 dark:border-blue-900"><IconPencil className="size-3 mr-1" /> Updated</Badge>;
      case 'delete':
        return <Badge variant="destructive" className="bg-red-500/15 text-red-700 hover:bg-red-500/25 border-red-200 dark:text-red-400 dark:border-red-900"><IconTrash className="size-3 mr-1" /> Deleted</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <PageHeader 
        title="Change History" 
        description="View and undo recent changes to your data."
        actions={
          <div className="flex items-center gap-2">
            <Select 
              value={filterType} 
              onValueChange={(val) => setFilterType(val as EntityType | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => fetchHistory()} disabled={loading}>
              <IconHistory className="size-4 mr-2" />
              Refresh
            </Button>
          </div>
        }
      />

      {message && (
        <div className={cn(
          "mb-6 p-4 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2",
          message.type === 'success' 
            ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800" 
            : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
        )}>
          {message.text}
        </div>
      )}

      {loading && history.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-lg border" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/5">
          <IconHistory className="size-12 mx-auto mb-4 opacity-20" />
          <p>No changes found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => (
            <ChangeCard 
              key={entry.id} 
              entry={entry} 
              onUndo={handleUndo} 
              isUndoing={undoingId === entry.id}
              getActionBadge={getActionBadge}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChangeCard({ 
  entry, 
  onUndo, 
  isUndoing,
  getActionBadge,
  formatDate
}: { 
  entry: ChangeLogEntry; 
  onUndo: (entry: ChangeLogEntry) => void;
  isUndoing: boolean;
  getActionBadge: (action: string) => React.ReactNode;
  formatDate: (date: string) => string;
}) {
  const isCreate = entry.action === 'create';
  const isDelete = entry.action === 'delete';
  
  // Helper to extract a display name or label from the snapshot
  const getEntityLabel = (data: any): string => {
    if (!data) return 'Unknown';
    if (typeof data === 'object') {
      return data.name || data.title || data.company || data.institution || data.tone || 'Item';
    }
    return String(data);
  };

  const name = isCreate 
    ? getEntityLabel(entry.afterSnapshot) 
    : getEntityLabel(entry.beforeSnapshot);

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="bg-muted/5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getActionBadge(entry.action)}
            <span className="font-semibold text-sm">{entry.entityType}</span>
            <span className="text-muted-foreground text-sm">•</span>
            <span className="text-sm font-medium">{name}</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {formatDate(entry.timestamp)}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="py-4 text-sm">
        <ChangeSummary entry={entry} />
      </CardContent>
      
      <CardFooter className="bg-muted/5 py-2 flex justify-end border-t">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onUndo(entry)} 
          disabled={isUndoing}
          className="text-muted-foreground hover:text-foreground h-8"
        >
          {isUndoing ? (
            <>Undoing...</>
          ) : (
            <>
              <IconRotateCcw className="size-3.5 mr-2" />
              Undo Change
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

function ChangeSummary({ entry }: { entry: ChangeLogEntry }) {
  const { action, beforeSnapshot, afterSnapshot } = entry;

  if (action === 'create') {
    return (
      <div className="text-muted-foreground">
        Created new {entry.entityType}.
        <div className="mt-2 text-xs bg-muted/30 p-2 rounded border font-mono overflow-x-auto">
          {JSON.stringify(afterSnapshot, null, 2)}
        </div>
      </div>
    );
  }

  if (action === 'delete') {
    return (
      <div className="text-muted-foreground">
        Deleted {entry.entityType}.
        <div className="mt-2 text-xs bg-red-50/50 dark:bg-red-900/10 p-2 rounded border border-red-100 dark:border-red-900 font-mono overflow-x-auto">
          {JSON.stringify(beforeSnapshot, null, 2)}
        </div>
      </div>
    );
  }

  // Update
  const before = beforeSnapshot as Record<string, any>;
  const after = afterSnapshot as Record<string, any>;
  
  // Simple diff
  const changes = Object.keys(after || {}).filter(key => {
    // Ignore metadata fields
    if (['updatedAt', 'createdAt', 'id'].includes(key)) return false;
    return JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]);
  });

  if (changes.length === 0) {
    return <span className="text-muted-foreground italic">No visible changes recorded.</span>;
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground mb-2">Modified fields:</p>
      <div className="grid gap-2">
        {changes.slice(0, 5).map(key => (
          <div key={key} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-xs">
            <div className="bg-red-50/50 dark:bg-red-900/10 p-1.5 rounded border border-red-100 dark:border-red-900 font-mono truncate text-red-700 dark:text-red-400">
              <span className="font-bold text-muted-foreground mr-2 select-none">{key}:</span>
              {JSON.stringify(before?.[key])}
            </div>
            <IconArrowRight className="size-3 text-muted-foreground shrink-0" />
            <div className="bg-green-50/50 dark:bg-green-900/10 p-1.5 rounded border border-green-100 dark:border-green-900 font-mono truncate text-green-700 dark:text-green-400">
              {JSON.stringify(after?.[key])}
            </div>
          </div>
        ))}
        {changes.length > 5 && (
          <p className="text-xs text-muted-foreground italic">+ {changes.length - 5} more fields changed</p>
        )}
      </div>
    </div>
  );
}
