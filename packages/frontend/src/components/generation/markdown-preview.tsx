/**
 * Markdown Preview
 * 
 * Renders markdown content with basic styling.
 * Uses a simple regex-based approach for MVP - can upgrade to remark/rehype later.
 */

import { useMemo } from 'react';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Simple markdown to HTML converter.
 * Handles: headings, bold, italic, lists, links, paragraphs
 */
function renderMarkdown(md: string): string {
  if (!md) return '';

  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-6 mb-3 border-b pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mb-4">$1</h1>')
    
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline" target="_blank" rel="noopener">$1</a>')
    
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="my-4 border-muted" />')
    
    // Code inline
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>');

  // Process lists and paragraphs
  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Unordered list
    if (line.match(/^[\-\*] /)) {
      if (!inList) {
        result.push('<ul class="list-disc list-outside ml-5 space-y-1">');
        inList = true;
      }
      result.push(`<li>${line.replace(/^[\-\*] /, '')}</li>`);
    }
    // Ordered list
    else if (line.match(/^\d+\. /)) {
      if (!inList) {
        result.push('<ol class="list-decimal list-outside ml-5 space-y-1">');
        inList = true;
      }
      result.push(`<li>${line.replace(/^\d+\. /, '')}</li>`);
    }
    // Non-list line
    else {
      if (inList) {
        // Close list
        result.push(result[result.length - 2]?.includes('<ol') ? '</ol>' : '</ul>');
        inList = false;
      }
      
      // Skip if it's already an HTML tag
      if (line.startsWith('<')) {
        result.push(line);
      }
      // Empty line
      else if (line.trim() === '') {
        result.push('');
      }
      // Regular paragraph
      else {
        result.push(`<p class="mb-2">${line}</p>`);
      }
    }
  }

  // Close any open list
  if (inList) {
    result.push('</ul>');
  }

  return result.join('\n');
}
