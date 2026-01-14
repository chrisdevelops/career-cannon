/**
 * Chat Interface
 * 
 * Chat-based refinement UI for iterating on generated content.
 */

import { useState, useRef, useEffect } from 'react';
import { IconSend, IconLoader2 } from '@tabler/icons-react';
import { useGenerationStore } from '@/stores/generation-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/api';

interface ChatInterfaceProps {
  onSendMessage: (message: string) => Promise<void>;
  disabled?: boolean;
}

export function ChatInterface({ onSendMessage, disabled }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatHistory = useGenerationStore((s) => s.session?.chatHistory || []);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending || disabled) return;

    const message = input.trim();
    setInput('');
    setIsSending(true);

    try {
      await onSendMessage(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No refinements yet.</p>
            <p className="text-xs mt-1">
              Ask the AI to make changes, add details, or adjust the tone.
            </p>
          </div>
        ) : (
          chatHistory.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for changes... (e.g., 'Make the summary more concise' or 'Add more metrics')"
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={disabled || isSending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || disabled || isSending}
            className="shrink-0 self-end"
          >
            {isSending ? (
              <IconLoader2 className="w-4 h-4 animate-spin" />
            ) : (
              <IconSend className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

// Quick suggestion chips
export function SuggestionChips({ 
  suggestions, 
  onSelect 
}: { 
  suggestions: string[]; 
  onSelect: (suggestion: string) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-4 border-t">
      <span className="text-xs text-muted-foreground">Suggestions:</span>
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded-full transition-colors"
        >
          {suggestion.length > 40 ? suggestion.slice(0, 40) + '...' : suggestion}
        </button>
      ))}
    </div>
  );
}
