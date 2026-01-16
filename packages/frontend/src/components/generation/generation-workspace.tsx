/**
 * Generation Workspace
 * 
 * Main workspace for generating and refining resumes/cover letters.
 * Three-panel layout: Input | Preview | Chat/Versions
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
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
  generationId?: string;
  versionId?: string;
}

export function GenerationWorkspace({ type, generationId, versionId }: GenerationWorkspaceProps) {
  const navigate = useNavigate();
  const session = useGenerationStore((s) => s.session);
  const startNewSession = useGenerationStore((s) => s.startNewSession);
  const loadSession = useGenerationStore((s) => s.loadSession);
  const setContent = useGenerationStore((s) => s.setContent);
  const addVersion = useGenerationStore((s) => s.addVersion);
  const addChatMessage = useGenerationStore((s) => s.addChatMessage);
  const setStatus = useGenerationStore((s) => s.setStatus);
  const setSessionId = useGenerationStore((s) => s.setSessionId);
  const selectVersion = useGenerationStore((s) => s.selectVersion);
  const upsertDraft = useGenerationStore((s) => s.upsertDraft);
  const replaceDraftWithVersion = useGenerationStore((s) => s.replaceDraftWithVersion);
  const removeDraft = useGenerationStore((s) => s.removeDraft);
  const updateVersionMeta = useGenerationStore((s) => s.updateVersionMeta);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'versions'>('chat');
  const [isHydrating, setIsHydrating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDiscardingDraft, setIsDiscardingDraft] = useState(false);
  const hasAppliedVersionRef = useRef(false);

  const isSessionReady = !!session && session.type === type;

  useEffect(() => {
    if (!generationId) {
      if (!isSessionReady) {
        startNewSession(type);
      }
      return;
    }

    const shouldLoad = !session || session.id !== generationId || session.type !== type;
    if (!shouldLoad) return;

    hasAppliedVersionRef.current = false;

    const hydrate = async () => {
      setIsHydrating(true);
      try {
        const [generation, allVersions] = await Promise.all([
          generationsApi.get(generationId),
          generationsApi.getVersions(generationId),
        ]);

        const versionsForType = allVersions.filter((v) => v.type === type);
        const selectedIndex = versionId
          ? versionsForType.findIndex((v) => v.id === versionId)
          : versionsForType.length - 1;
        const safeIndex = selectedIndex >= 0 ? selectedIndex : versionsForType.length - 1;
        const selectedVersion = versionsForType[safeIndex];

        loadSession({
          id: generation.id,
          type,
          input: {
            company: generation.company,
            position: generation.position,
            jobDescription: generation.jobDescription,
            temperature: generation.temperature,
            userPrompt: '',
          },
          versions: versionsForType,
          currentVersionIndex: safeIndex,
          currentContent: selectedVersion?.content || '',
          chatHistory: selectedVersion?.chatContext || [],
        });
      } catch (err) {
        startNewSession(type);
        setStatus('error', err instanceof Error ? err.message : 'Failed to load generation');
      } finally {
        setIsHydrating(false);
      }
    };

    hydrate();
  }, [generationId, versionId, isSessionReady, loadSession, session, startNewSession, type, setStatus]);

  useEffect(() => {
    if (!generationId || !versionId || !session) return;
    if (session.id !== generationId || session.type !== type) return;
    if (hasAppliedVersionRef.current) return;
    const index = session.versions.findIndex((v) => v.id === versionId);
    if (index >= 0 && session.currentVersionIndex !== index) {
      selectVersion(index);
    }
    hasAppliedVersionRef.current = true;
  }, [generationId, versionId, session, selectVersion, type]);

  if (isHydrating || !isSessionReady) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)] border rounded-lg">
        <div className="text-center text-muted-foreground">
          <IconLoader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Preparing session…</p>
        </div>
      </div>
    );
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
  const updateUrlForVersion = (nextVersionId: string) => {
    if (!session?.id) return;
    const destination = type === 'resume' ? '/generate/resume' : '/generate/cover-letter';
    navigate({
      to: destination,
      replace: true,
      search: {
        generationId: session.id,
        versionId: nextVersionId,
      },
    });
  };

  const handleSendMessage = async (message: string) => {
    if (!session.id || !currentContent) return;

    const baseEntry = session.versions[session.currentVersionIndex];
    if (!baseEntry) return;

    addChatMessage({ role: 'user', content: message });
    setStatus('refining');

    try {
      const result = await aiApi.refine({
        currentContent,
        chatHistory: session.chatHistory,
        userMessage: message,
        type,
      });

      const assistantMessage = result.explanation || 'Updated the content.';

      // Add assistant response
      addChatMessage({
        role: 'assistant',
        content: assistantMessage,
      });

      const updatedChat = [
        ...session.chatHistory,
        { role: 'user' as const, content: message },
        { role: 'assistant' as const, content: assistantMessage },
      ];

      setContent(result.content);

      const baseVersionId = baseEntry.isDraft ? baseEntry.baseVersionId : baseEntry.id;
      if (!baseVersionId) {
        throw new Error('Missing base version for draft');
      }

      const draft = await generationsApi.saveDraft(session.id, {
        baseVersionId,
        content: result.content,
        chatContext: updatedChat,
      });

      upsertDraft(draft);
      updateUrlForVersion(draft.id);
      setStatus('idle');

      // Refresh suggestions
      loadSuggestions(result.content);
    } catch (err) {
      setStatus('error', err instanceof Error ? err.message : 'Refinement failed');
    }
  };

  const handleSaveDraft = async () => {
    if (!session?.id) return;
    const entry = session.versions[session.currentVersionIndex];
    if (!entry || !entry.isDraft) return;

    setIsSavingDraft(true);
    setStatus('refining');
    try {
      const version = await generationsApi.commitDraft(session.id, entry.id);
      replaceDraftWithVersion(entry.id, version);
      updateUrlForVersion(version.id);
      loadSuggestions(version.content);
      setStatus('idle');
    } catch (err) {
      setStatus('error', err instanceof Error ? err.message : 'Failed to save version');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleDiscardDraft = async () => {
    if (!session?.id) return;
    const entry = session.versions[session.currentVersionIndex];
    if (!entry || !entry.isDraft) return;

    setIsDiscardingDraft(true);
    try {
      await generationsApi.discardDraft(session.id, entry.id);
      removeDraft(entry.id, entry.baseVersionId);
      const baseVersion = session.versions.find((v) => v.id === entry.baseVersionId);
      if (baseVersion) {
        updateUrlForVersion(baseVersion.id);
        setContent(baseVersion.content);
        loadSuggestions(baseVersion.content);
      }
    } catch (err) {
      setStatus('error', err instanceof Error ? err.message : 'Failed to discard draft');
    } finally {
      setIsDiscardingDraft(false);
    }
  };

  const handleRenameVersion = async (versionId: string, name: string | null) => {
    if (!session?.id) return;
    try {
      const updated = await generationsApi.updateVersion(session.id, versionId, { name });
      updateVersionMeta(versionId, { name: updated.name });
    } catch (err) {
      setStatus('error', err instanceof Error ? err.message : 'Failed to rename version');
    }
  };

  const handleToggleFavorite = async (versionId: string, favorite: boolean) => {
    if (!session?.id) return;
    try {
      const updated = await generationsApi.updateVersion(session.id, versionId, { favorite });
      updateVersionMeta(versionId, { favorite: updated.favorite });
    } catch (err) {
      setStatus('error', err instanceof Error ? err.message : 'Failed to update favorite');
    }
  };

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
            <div className="flex-1 overflow-hidden">
              <VersionSidebar 
                onSaveDraft={handleSaveDraft}
                onDiscardDraft={handleDiscardDraft}
                onRename={handleRenameVersion}
                onToggleFavorite={handleToggleFavorite}
                isSaving={isSavingDraft}
                isDiscarding={isDiscardingDraft}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
