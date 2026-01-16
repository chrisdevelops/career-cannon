/**
 * Version Sidebar
 * 
 * Shows history of generated versions with ability to switch between them.
 */

import { useState, useRef, useEffect } from 'react';
import { 
  IconCheck, 
  IconHistory, 
  IconStar, 
  IconStarFilled, 
  IconPencil, 
  IconDeviceFloppy, 
  IconTrash,
  IconX
} from '@tabler/icons-react';
import { useGenerationStore } from '@/stores/generation-store';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { GenerationVersion } from '@/lib/api';

interface VersionSidebarProps {
  onSaveDraft?: () => void;
  onDiscardDraft?: () => void;
  onRename?: (versionId: string, name: string | null) => void;
  onToggleFavorite?: (versionId: string, favorite: boolean) => void;
  isSaving?: boolean;
  isDiscarding?: boolean;
}

export function VersionSidebar({
  onSaveDraft,
  onDiscardDraft,
  onRename,
  onToggleFavorite,
  isSaving = false,
  isDiscarding = false
}: VersionSidebarProps) {
  const versions = useGenerationStore((s) => s.session?.versions || []);
  const currentIndex = useGenerationStore((s) => s.session?.currentVersionIndex ?? -1);
  const selectVersion = useGenerationStore((s) => s.selectVersion);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  const handleStartRename = (e: React.MouseEvent, version: GenerationVersion) => {
    e.stopPropagation();
    setEditingId(version.id);
    setEditName(version.name || `Version ${version.version}`);
  };

  const handleFinishRename = (versionId: string) => {
    const nextName = editName.trim();
    onRename?.(versionId, nextName.length > 0 ? nextName : null);
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, versionId: string) => {
    if (e.key === 'Enter') {
      handleFinishRename(versionId);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  if (versions.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <IconHistory className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No versions yet</p>
        <p className="text-xs mt-1">Generate content to see version history</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 flex-1 overflow-y-auto">
        <h3 className="text-sm font-medium px-2 mb-2 text-muted-foreground">
          Versions ({versions.length})
        </h3>
        <div className="space-y-1">
          {versions.map((version, index) => {
            const isActive = index === currentIndex;
            const timestamp = version.updatedAt || version.createdAt;
            const date = new Date(timestamp);
            const isEditing = editingId === version.id;
            const displayName = version.name || `Version ${version.version}`;
            const label = version.isDraft ? `${displayName} Draft` : displayName;

            return (
              <div
                key={version.id}
                onClick={() => !isEditing && selectVersion(index)}
                className={cn(
                  'group w-full text-left px-3 py-2 rounded-md transition-all border border-transparent relative cursor-pointer',
                  'hover:bg-muted',
                  isActive 
                    ? 'bg-primary/10 border-primary/20 shadow-sm' 
                    : 'border-transparent',
                  version.isDraft && 'border-dashed border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {version.isDraft && (
                      <Badge variant="outline" className="text-[10px] px-1 h-4 border-amber-500/50 text-amber-600 bg-amber-100 dark:bg-amber-950/30">
                        Draft
                      </Badge>
                    )}
                    
                    {isEditing ? (
                      <Input
                        ref={inputRef}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleFinishRename(version.id)}
                        onKeyDown={(e) => handleKeyDown(e, version.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 text-sm py-0 px-1"
                      />
                    ) : (
                      <span className={cn("text-sm font-medium truncate", version.isDraft && "text-amber-700 dark:text-amber-400")}>
                        {label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {!version.isDraft && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite?.(version.id, !version.favorite);
                        }}
                        className={cn(
                          "opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-background/80",
                          version.favorite && "opacity-100 text-yellow-500"
                        )}
                      >
                        {version.favorite ? (
                          <IconStarFilled className="w-3.5 h-3.5" />
                        ) : (
                          <IconStar className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </button>
                    )}
                    
                    {!version.isDraft && !isEditing && isActive && (
                      <button
                        onClick={(e) => handleStartRename(e, version)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-background/80 text-muted-foreground"
                      >
                        <IconPencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isActive && !isEditing && (
                      <IconCheck className="w-4 h-4 text-primary shrink-0 ml-1" />
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-muted-foreground mt-0.5">
                  <span>{formatDate(date)}</span>
                  {version.chatContext && version.chatContext.length > 0 && (
                    <span>{version.chatContext.length} edits</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Draft Actions Footer */}
      {versions[currentIndex]?.isDraft && (
        <div className="p-3 border-t bg-muted/20 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="font-medium text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
              <IconPencil className="w-3 h-3" />
              Editing Draft
            </span>
            <span>Unsaved changes</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
              onClick={onDiscardDraft}
              disabled={isDiscarding || isSaving}
            >
              {isDiscarding ? <IconX className="w-3.5 h-3.5 animate-spin" /> : <IconTrash className="w-3.5 h-3.5" />}
              Discard
            </Button>
            <Button 
              size="sm" 
              className="h-8 gap-1.5"
              onClick={onSaveDraft}
              disabled={isSaving || isDiscarding}
            >
              {isSaving ? <IconDeviceFloppy className="w-3.5 h-3.5 animate-pulse" /> : <IconDeviceFloppy className="w-3.5 h-3.5" />}
              Save Version
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
