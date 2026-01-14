import { IconCheck, IconLoader2, IconAlertCircle } from '@tabler/icons-react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveIndicatorProps {
  status: SaveStatus;
  error?: string;
}

export function SaveIndicator({ status, error }: SaveIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {status === 'saving' && (
        <>
          <IconLoader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <IconCheck className="w-4 h-4 text-green-600" />
          <span className="text-green-600">Saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <IconAlertCircle className="w-4 h-4 text-destructive" />
          <span className="text-destructive">{error || 'Failed to save'}</span>
        </>
      )}
    </div>
  );
}
