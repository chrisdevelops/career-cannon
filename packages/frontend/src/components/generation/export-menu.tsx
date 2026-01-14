/**
 * Export Menu
 * 
 * Options for exporting generated content:
 * - Copy to clipboard
 * - Download as Markdown
 * - Download as plain text
 */

import { useState } from 'react';
import { IconCopy, IconDownload, IconCheck } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportMenuProps {
  content: string;
  filename?: string;
}

export function ExportMenu({ content, filename = 'document' }: ExportMenuProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: 'md' | 'txt') => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="gap-2"
      >
        {copied ? (
          <>
            <IconCheck className="w-4 h-4" />
            Copied!
          </>
        ) : (
          <>
            <IconCopy className="w-4 h-4" />
            Copy
          </>
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
        >
          <IconDownload className="w-4 h-4" />
          Download
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleDownload('md')}>
            Markdown (.md)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload('txt')}>
            Plain Text (.txt)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
