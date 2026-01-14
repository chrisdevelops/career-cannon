/**
 * Generation Workspace
 * 
 * Main workspace for generating and refining resumes/cover letters.
 * Three-panel layout: Input | Preview | Chat/Versions
 */

import { useState, useCallback } from 'react';
import { IconLoader2, IconSparkles, IconAlertCircle } from '@tabler/icons-react';
import { useGenerationStore, type GenerationType } from '@/stores/generation-store';
import { aiApi, generationsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { JobInputForm } from './job-input-form';
import { MarkdownPreview } from './markdown-preview';
import { ChatInterface, SuggestionChips } from './chat-interface';
import { VersionSidebar } from './version-sidebar';
import { ExportMenu } from './export-menu';
import { cn } from '@/lib/utils';

interface GenerationWorkspaceProps {
  type: GenerationType;
}

export function GenerationWorkspace({ type }: GenerationWorkspaceProps) {
  const session = useGenerationStore((s) => s.session);
  const startNewSession = useGenerationStore((s) => s.startNewSession);
  const setContent = useGenerationStore((s) => s.setContent);
  const addVersion = useGenerationStore((s) => s.addVersion);
  const addChatMessage = useGenerationStore((s) => s.addChatMessage);
  const setStatus = useGenerationStore((s) => s.setStatus);
  const setSessionId = useGenerationStore((s) => s.setSessionId);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'versions'>('chat');

  // Initialize session if needed
  if (!session || session.type !== type) {
    startNewSession(type);
    return null;
  }

  const { input, currentContent, status, error } = session;
  const isGenerating = status === 'generating';
  const isRefining = status === 'refining';
  const hasContent = currentContent.length > 0;

  const canGenerate =
    input.company.trim() &&
    input.position.trim() &&
    input.jobDescription.trim().length >= 50;

  // Generate initial content
  const handleGenerate = async () => {
    setStatus('generating');
    setSuggestions([]);

    try {
      // Create generation session in backend
      let generationId = session.id;
      if (!generationId) {
        const gen = await generationsApi.create({
          company: input.company,
          position: input.position,
          jobDescription: input.jobDescription,
          temperature: input.temperature,
        });
        generationId = gen.id;
        setSessionId(generationId);
      }

      // Generate content
      const result = type === 'resume'
        ? await aiApi.generateResume({
            company: input.company,
            position: input.position,
            jobDescription: input.jobDescription,
            temperature: input.temperature,
            userPrompt: input.userPrompt || undefined,
          })
        : await aiApi.generateCoverLetter({
            company: input.company,
            position: input.position,
            jobDescription: input.jobDescription,
            temperature: input.temperature,
            userPrompt: input.userPrompt || undefined,
          });

      setContent(result.content);

      // Save version
      const version = await generationsApi.addVersion(generationId, {
        type,
        content: result.content,
      });

      addVersion(version);
      setStatus('idle');

      // Get suggestions
      loadSuggestions(result.content);
    } catch (err) {
      setStatus('error', err instanceof Error ? err.message : 'Generation failed');
    }
  };

  // Load improvement suggestions
  const loadSuggestions = async (content: string) => {
    try {
      const result = await aiApi.suggestions({ content, type });
      setSuggestions(result.suggestions.slice(0, 3));
    } catch {
      // Silently fail - suggestions are optional
    }
  };

  // Handle chat refinement
  const handleSendMessage = useCallback(async (message: string) => {
    if (!session.id || !currentContent) return;

    addChatMessage({ role: 'user', content: message });
    setStatus('refining');

    try {
      const result = await aiApi.refine({
        currentContent,
        chatHistory: session.chatHistory,
        userMessage: message,
        type,
      });

      // Add assistant response
      addChatMessage({
        role: 'assistant',
        content: result.explanation || 'Updated the content.',
      });

      setContent(result.content);

      // Save new version
      const version = await generationsApi.addVersion(session.id, {
        type,
        content: result.content,
        chatContext: [...session.chatHistory, { role: 'user', content: message }],
      });

      addVersion(version);
      setStatus('idle');

      // Refresh suggestions
      loadSuggestions(result.content);
    } catch (err) {
      setStatus('error', err instanceof Error ? err.message : 'Refinement failed');
    }
  }, [session, currentContent, type]);

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      {/* Left Panel: Input */}
      <div className="col-span-4 overflow-y-auto border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">
          {type === 'resume' ? 'Resume' : 'Cover Letter'} Generator
        </h2>
        
        <JobInputForm />

        <div className="mt-6">
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating || isRefining}
            className="w-full gap-2"
            size="lg"
          >
            {isGenerating ? (
              <>
                <IconLoader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <IconSparkles className="w-4 h-4" />
                {hasContent ? 'Regenerate' : 'Generate'}
              </>
            )}
          </Button>
          {!canGenerate && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Fill in company, position, and job description to generate
            </p>
          )}
        </div>
      </div>

      {/* Center Panel: Preview */}
      <div className="col-span-5 overflow-y-auto border rounded-lg flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Preview</h3>
          {hasContent && (
            <ExportMenu
              content={currentContent}
              filename={`${input.company}-${input.position}-${type}`}
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="flex items-center gap-2 p-4 mb-4 bg-destructive/10 text-destructive rounded-lg">
              <IconAlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!hasContent && !isGenerating && (
            <div className="text-center text-muted-foreground py-12">
              <p>No content generated yet.</p>
              <p className="text-sm mt-1">
                Fill in the job details and click Generate.
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="text-center py-12">
              <IconLoader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Generating your {type === 'resume' ? 'resume' : 'cover letter'}...</p>
              <p className="text-sm text-muted-foreground mt-1">This may take 10-20 seconds</p>
            </div>
          )}

          {hasContent && !isGenerating && (
            <MarkdownPreview content={currentContent} />
          )}
        </div>
      </div>

      {/* Right Panel: Chat & Versions */}
      <div className="col-span-3 border rounded-lg flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'chat'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Refine
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'versions'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Versions
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'chat' ? (
            <>
              <div className="flex-1 overflow-hidden">
                <ChatInterface
                  onSendMessage={handleSendMessage}
                  disabled={!hasContent || isGenerating || isRefining}
                />
              </div>
              {suggestions.length > 0 && (
                <SuggestionChips
                  suggestions={suggestions}
                  onSelect={handleSendMessage}
                />
              )}
            </>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <VersionSidebar />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
