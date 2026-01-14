/**
 * Version Sidebar
 * 
 * Shows history of generated versions with ability to switch between them.
 */

import { IconCheck, IconHistory } from '@tabler/icons-react';
import { useGenerationStore } from '@/stores/generation-store';
import { cn } from '@/lib/utils';

export function VersionSidebar() {
  const versions = useGenerationStore((s) => s.session?.versions || []);
  const currentIndex = useGenerationStore((s) => s.session?.currentVersionIndex ?? -1);
  const selectVersion = useGenerationStore((s) => s.selectVersion);

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
    <div className="p-2">
      <h3 className="text-sm font-medium px-2 mb-2 text-muted-foreground">
        Versions ({versions.length})
      </h3>
      <div className="space-y-1">
        {versions.map((version, index) => {
          const isActive = index === currentIndex;
          const date = new Date(version.createdAt);

          return (
            <button
              key={version.id}
              onClick={() => selectVersion(index)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md transition-colors',
                'hover:bg-muted',
                isActive && 'bg-primary/10 border border-primary/20'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Version {version.version}
                </span>
                {isActive && (
                  <IconCheck className="w-4 h-4 text-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(date)}
              </p>
              {version.chatContext && version.chatContext.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {version.chatContext.length} refinement{version.chatContext.length > 1 ? 's' : ''}
                </p>
              )}
            </button>
          );
        })}
      </div>
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
