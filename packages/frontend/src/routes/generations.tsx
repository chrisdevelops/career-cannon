import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PageContent, PageHeaderBar, PageShell } from '@/components/layout/page-shell';
import { PageTitleBar } from '@/components/layout/page-title-bar';
import { AppLayout } from '@/components/app-layout';
import { useEffect, useState, useMemo } from 'react';
import { generationsApi, type Generation, type GenerationVersion } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MarkdownPreview } from '@/components/generation/markdown-preview';
import { 
  IconSearch, 
  IconCopy, 
  IconDownload, 
  IconPencil, 
  IconLoader2,
  IconFileText,
  IconBriefcase,
  IconCalendar,
  IconRobot,
  IconStar,
  IconStarFilled,
  IconCheck,
  IconX
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const Route = createFileRoute('/generations')({
  component: GenerationsPage,
});

function GenerationsPage() {
  const navigate = useNavigate();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versions, setVersions] = useState<GenerationVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'resume' | 'cover_letter'>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    fetchGenerations();
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchVersions(selectedId);
    } else {
      setVersions([]);
      setSelectedVersionId(null);
    }
  }, [selectedId]);

  // Reset rename state when version changes
  useEffect(() => {
    setIsRenaming(false);
    setRenameValue('');
  }, [selectedVersionId]);

  const fetchGenerations = async () => {
    setLoading(true);
    try {
      const data = await generationsApi.list();
      // Sort by updatedAt desc
      const sorted = data.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setGenerations(sorted);
      if (sorted.length > 0 && !selectedId) {
        setSelectedId(sorted[0].id);
      }
    } catch (err) {
      console.error('Failed to load generations', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async (id: string) => {
    setVersionsLoading(true);
    try {
      const data = await generationsApi.getVersions(id);
      // Sort versions desc (highest version number first, drafts after base)
      const sorted = data.sort((a, b) => {
        if (a.version !== b.version) return b.version - a.version;
        if (a.isDraft && !b.isDraft) return 1;
        if (!a.isDraft && b.isDraft) return -1;
        return 0;
      });
      setVersions(sorted);
      if (sorted.length > 0) {
        // Default to latest version if not already selected or if switching generations
        setSelectedVersionId(sorted[0].id);
      } else {
        setSelectedVersionId(null);
      }
    } catch (err) {
      console.error('Failed to load versions', err);
    } finally {
      setVersionsLoading(false);
    }
  };

  const filteredGenerations = useMemo(() => {
    return generations.filter(gen => {
      const matchesSearch = 
        gen.company.toLowerCase().includes(search.toLowerCase()) ||
        gen.position.toLowerCase().includes(search.toLowerCase());
      
      let matchesType = true;
      if (typeFilter !== 'all') {
        matchesType = (gen.versionTypes || []).includes(typeFilter);
      }

      let matchesFavorite = true;
       if (favoritesOnly) {
         matchesFavorite = gen.hasFavorite === true;
       }

       return matchesSearch && matchesType && matchesFavorite;
    });
  }, [generations, search, typeFilter, favoritesOnly]);

  useEffect(() => {
    if (filteredGenerations.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !filteredGenerations.some((gen) => gen.id === selectedId)) {
      setSelectedId(filteredGenerations[0].id);
    }
  }, [filteredGenerations, selectedId]);

  const selectedGeneration = generations.find(g => g.id === selectedId);
  const visibleVersions = useMemo(
    () => (typeFilter === 'all' ? versions : versions.filter((v) => v.type === typeFilter)),
    [versions, typeFilter]
  );
  const currentVersion = visibleVersions.find(v => v.id === selectedVersionId);

  useEffect(() => {
    if (visibleVersions.length === 0) {
      setSelectedVersionId(null);
      return;
    }
    if (!selectedVersionId || !visibleVersions.some((v) => v.id === selectedVersionId)) {
      setSelectedVersionId(visibleVersions[0].id);
    }
  }, [visibleVersions, selectedVersionId]);

  const handleCopy = () => {
    if (currentVersion) {
      navigator.clipboard.writeText(currentVersion.content);
    }
  };

  const handleDownload = () => {
    if (currentVersion && selectedGeneration) {
      const element = document.createElement('a');
      const file = new Blob([currentVersion.content], { type: 'text/plain' });
      const url = URL.createObjectURL(file);
      element.href = url;
      const safeCompany = selectedGeneration.company.replace(/\s+/g, '-');
      const safePosition = selectedGeneration.position.replace(/\s+/g, '-');
      const extension = currentVersion.type === 'resume' ? 'md' : 'txt';
      element.download = `${safeCompany}-${safePosition}-${currentVersion.type}-v${currentVersion.version}.${extension}`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(url);
    }
  };

  const handleEdit = () => {
    if (!selectedGeneration || !currentVersion) return;
    const destination = currentVersion.type === 'resume' ? '/generate/resume' : '/generate/cover-letter';
    navigate({
      to: destination,
      search: {
        generationId: selectedGeneration.id,
        versionId: currentVersion.id,
      },
    });
  };

  const handleToggleFavorite = async () => {
    if (!selectedGeneration || !currentVersion || currentVersion.isDraft) return;
    try {
      const newFavorite = !currentVersion.favorite;
      await generationsApi.updateVersion(selectedGeneration.id, currentVersion.id, { favorite: newFavorite });
      
      // Update local state
      setVersions(prev => prev.map(v => 
        v.id === currentVersion.id || v.baseVersionId === currentVersion.id
          ? { ...v, favorite: newFavorite }
          : v
      ));
      
      setGenerations(prev => prev.map(g => {
        if (g.id === selectedGeneration.id) {
          const hasFavorite = versions.some((v) =>
            v.id === currentVersion.id ? newFavorite : v.favorite
          );
          return {
            ...g,
            hasFavorite,
          };
        }
        return g;
      }));
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  };

  const handleStartRename = () => {
    if (currentVersion && !currentVersion.isDraft) {
      setRenameValue(currentVersion.name || '');
      setIsRenaming(true);
    }
  };

  const handleSaveRename = async () => {
    if (!selectedGeneration || !currentVersion || currentVersion.isDraft) return;
    try {
      const name = renameValue.trim() || null;
      await generationsApi.updateVersion(selectedGeneration.id, currentVersion.id, { name });
      
      setVersions(prev => prev.map(v => 
        v.id === currentVersion.id || v.baseVersionId === currentVersion.id
          ? { ...v, name }
          : v
      ));
      setIsRenaming(false);
    } catch (err) {
      console.error('Failed to rename', err);
    }
  };

  return (
    <AppLayout>
      <PageShell>
      <PageHeaderBar>
        <PageTitleBar
          title="Past Generations"
          subtitle="View and manage your generated resumes and cover letters."
          actions={
            <div className="flex items-center gap-2">
              <div className="relative w-[240px]">
                <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search company or position..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Button
                variant={favoritesOnly ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFavoritesOnly(!favoritesOnly)}
                className={cn("h-9 gap-2", favoritesOnly && "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 border-yellow-500/20")}
              >
                {favoritesOnly ? <IconStarFilled className="w-4 h-4" /> : <IconStar className="w-4 h-4" />}
                <span className="hidden sm:inline">Favorites</span>
              </Button>
              <Select 
                value={typeFilter} 
                onValueChange={(val) => setTypeFilter(val as 'all' | 'resume' | 'cover_letter')}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="resume">Resumes</SelectItem>
                  <SelectItem value="cover_letter">Cover Letters</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      </PageHeaderBar>

        <PageContent fullWidth className="flex flex-col overflow-hidden pb-4">
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
            {/* List Panel */}
            <div className="col-span-4 border rounded-lg bg-background flex flex-col min-h-0">
              <div className="p-4 border-b bg-muted/30">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                  History ({filteredGenerations.length})
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {loading ? (
                  <div className="flex justify-center p-8">
                    <IconLoader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredGenerations.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <p>No generations found.</p>
                  </div>
                ) : (
                  filteredGenerations.map((gen) => (
                    <Card
                      key={gen.id}
                      onClick={() => setSelectedId(gen.id)}
                      className={cn(
                        "p-3 rounded-md cursor-pointer border transition-all hover:shadow-sm",
                        selectedId === gen.id
                          ? "bg-primary/5 border-primary/20 ring-1 ring-primary/20"
                          : "bg-card border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold text-sm truncate pr-2">{gen.company}</h4>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(gen.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-2">{gen.position}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-normal">
                          v{gen.versionCount ?? '?'}
                        </Badge>
                        {gen.hasFavorite && (
                          <IconStarFilled className="w-3 h-3 text-yellow-500" />
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Detail Panel */}
            <div className="col-span-8 border rounded-lg bg-background flex flex-col min-h-0 overflow-hidden">
              {selectedGeneration ? (
                <>
                  <div className="p-4 border-b bg-muted/10 flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        {selectedGeneration.company}
                        <span className="text-muted-foreground font-normal text-lg">/</span>
                        {selectedGeneration.position}
                      </h2>
                      
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <IconCalendar className="w-3.5 h-3.5" />
                          Created {new Date(selectedGeneration.createdAt).toLocaleString()}
                        </div>
                        
                        {currentVersion && (
                          <>
                            <div className="h-3 w-[1px] bg-border" />
                            <div className="flex items-center gap-2">
                              {currentVersion.isDraft ? (
                                <Badge variant="outline" className="text-[10px] px-1 h-5 border-amber-500/50 text-amber-600 bg-amber-100 dark:bg-amber-950/30">
                                  Draft v{currentVersion.version}
                                </Badge>
                              ) : isRenaming ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    className="h-6 w-40 text-xs"
                                    placeholder="Version Name"
                                    autoFocus
                                  />
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveRename}>
                                    <IconCheck className="w-3 h-3 text-green-600" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsRenaming(false)}>
                                    <IconX className="w-3 h-3 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 group">
                                  <span className={cn("text-xs font-medium", currentVersion.name && "text-primary")}> 
                                    {currentVersion.name || `Version ${currentVersion.version}`}
                                  </span>
                                  <button 
                                    onClick={handleStartRename}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <IconPencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                                  </button>
                                </div>
                              )}
                              
                              {!currentVersion.isDraft && (
                                <button 
                                  onClick={handleToggleFavorite}
                                  className={cn("transition-colors", currentVersion.favorite ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500")}
                                >
                                  {currentVersion.favorite ? <IconStarFilled className="w-3.5 h-3.5" /> : <IconStar className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={handleCopy} disabled={!currentVersion}>
                        <IconCopy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDownload} disabled={!currentVersion}>
                        <IconDownload className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button size="sm" onClick={handleEdit} disabled={!currentVersion}>
                        <IconPencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>

                  {/* Version Selector */}
                  <div className="px-4 py-2 border-b bg-muted/5 flex items-center gap-2 overflow-x-auto">
                    <span className="text-xs font-medium text-muted-foreground uppercase mr-2">Versions:</span>
                    {versionsLoading ? (
                      <IconLoader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : visibleVersions.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVersionId(v.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap",
                          selectedVersionId === v.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50",
                          v.isDraft && "border-dashed border-amber-500 text-amber-600 bg-amber-50"
                        )}
                      >
                        {v.type === 'resume' ? <IconFileText className="w-3 h-3" /> : <IconBriefcase className="w-3 h-3" />}
                        {v.isDraft ? `v${v.version} Draft` : `v${v.version}`}
                        {v.favorite && <IconStarFilled className="w-2.5 h-2.5 ml-0.5" />}
                      </button>
                    ))}
                  </div>

                  {/* Content Preview */}
                  <div className="flex-1 overflow-y-auto p-6 bg-white/50 dark:bg-black/20">
                    {versionsLoading ? (
                       <div className="h-full flex items-center justify-center">
                         <div className="flex flex-col items-center text-muted-foreground">
                           <IconLoader2 className="w-8 h-8 animate-spin mb-2" />
                           <p>Loading content...</p>
                         </div>
                       </div>
                    ) : currentVersion ? (
                      <div className="max-w-4xl mx-auto shadow-sm min-h-[500px] bg-background rounded-md border p-8">
                         <MarkdownPreview content={currentVersion.content} />
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <p>No version selected</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <IconRobot className="w-8 h-8 opacity-50" />
                  </div>
                  <h3 className="font-medium text-lg text-foreground">Select a Generation</h3>
                  <p>Choose a generation from the list to view details and versions.</p>
                </div>
              )}
            </div>
          </div>
        </PageContent>
      </PageShell>
    </AppLayout>
  );
}
