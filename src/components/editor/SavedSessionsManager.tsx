import { useState, useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderOpen, Save, Trash2, Image, Download, Upload, AlertTriangle, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { EditorImage, ExportSettings } from "@/types/editor";
import {
  RandomizerTemplate,
  RANDOMIZER_STORAGE_KEY,
  loadRandomizerTemplates,
  saveRandomizerTemplates,
} from "./TemplateRandomizer";

interface SavedSession {
  id: string;
  name: string;
  timestamp: number;
  imageCount: number;
  thumbnail?: string;
  randomizerTemplates?: RandomizerTemplate[];
  data: {
    images: EditorImage[];
    currentImageIndex: number;
    exportSettings: ExportSettings;
  };
}

interface SessionsExportFile {
  version: string;
  exportType: "sessions-bundle";
  timestamp: number;
  sessionCount: number;
  sessions: SavedSession[];
}

interface SavedSessionsManagerProps {
  images: EditorImage[];
  currentImageIndex: number;
  exportSettings: ExportSettings;
  onLoadSession: (data: {
    images: EditorImage[];
    currentImageIndex: number;
    exportSettings: ExportSettings;
  }) => void;
}

const STORAGE_KEY = "editorSavedSessions";
const MAX_SESSIONS = 10;

export const SavedSessionsManager = ({
  images,
  currentImageIndex,
  exportSettings,
  onLoadSession,
}: SavedSessionsManagerProps) => {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<SessionsExportFile | null>(null);
  const [importMode, setImportMode] = useState<"replace" | "merge">("merge");
  const [exportFilenameDialogOpen, setExportFilenameDialogOpen] = useState(false);
  const [exportFilename, setExportFilename] = useState("editor-sessions");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");

  // Update confirmation state
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
  const [updateConfirmId, setUpdateConfirmId] = useState<string | null>(null);

  // Load sessions from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSessions(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load saved sessions:", error);
    }
  }, []);

  // Generate thumbnail from current images
  const generateThumbnail = (): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (images.length === 0) {
        resolve(undefined);
        return;
      }

      const currentImage = images[currentImageIndex] || images[0];
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 80;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.5));
        } else {
          resolve(undefined);
        }
      };
      img.onerror = () => resolve(undefined);
      img.src = currentImage.src;
    });
  };

  // Helper to convert blob URL to base64
  const blobUrlToBase64 = async (url: string): Promise<string> => {
    if (!url.startsWith("blob:")) return url;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return url;
    }
  };

  // Save current session (includes randomizer templates)
  const handleSaveSession = async () => {
    if (!sessionName.trim()) {
      toast.error("Please enter a session name");
      return;
    }

    if (images.length === 0) {
      toast.error("No images to save");
      return;
    }

    try {
      const thumbnail = await generateThumbnail();
      
      // Convert blob URLs to base64 for persistence
      const convertedImages = await Promise.all(
        images.map(async (img) => {
          const convertedSrc = await blobUrlToBase64(img.src);
          const convertedElements = await Promise.all(
            (img.elements || []).map(async (element) => {
              if (element.type === "image" || element.type === "logo" || element.type === "watermark") {
                const elementWithSrc = element as typeof element & { src?: string };
                if (elementWithSrc.src) {
                  const convertedElementSrc = await blobUrlToBase64(elementWithSrc.src);
                  return { ...element, src: convertedElementSrc };
                }
              }
              return element;
            })
          );

          return {
            ...img,
            src: convertedSrc,
            elements: convertedElements,
          };
        })
      );

      // Capture current randomizer templates
      const randomizerTemplates = loadRandomizerTemplates();

      const newSession: SavedSession = {
        id: `session-${Date.now()}`,
        name: sessionName.trim(),
        timestamp: Date.now(),
        imageCount: images.length,
        thumbnail,
        randomizerTemplates,
        data: {
          images: convertedImages,
          currentImageIndex,
          exportSettings,
        },
      };

      const updatedSessions = [newSession, ...sessions].slice(0, MAX_SESSIONS);
      setSessions(updatedSessions);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));

      setSaveDialogOpen(false);
      setSessionName("");
      toast.success(`Session "${sessionName}" saved (with ${randomizerTemplates.length} template(s))`);
    } catch (error) {
      console.error("Failed to save session:", error);
      toast.error("Failed to save session");
    }
  };

  // Load a session (restores randomizer templates too)
  const handleLoadSession = (session: SavedSession) => {
    try {
      const restoredImages: EditorImage[] = session.data.images.map((img) => ({
        ...img,
        file: new File([], img.file?.name || "image.png", { type: "image/png" }),
      }));

      onLoadSession({
        images: restoredImages,
        currentImageIndex: session.data.currentImageIndex,
        exportSettings: session.data.exportSettings,
      });

      // Restore randomizer templates if present
      if (session.randomizerTemplates && Array.isArray(session.randomizerTemplates)) {
        saveRandomizerTemplates(session.randomizerTemplates);
        // Notify TemplateRandomizer to reload
        window.dispatchEvent(new CustomEvent("randomizer-templates-updated"));
        toast.success(`Loaded session "${session.name}" with ${session.randomizerTemplates.length} template(s)`);
      } else {
        toast.success(`Loaded session "${session.name}"`);
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      toast.error("Failed to load session");
    }
  };

  // Delete a session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedSessions = sessions.filter((s) => s.id !== sessionId);
    setSessions(updatedSessions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
    toast.success("Session deleted");
  };

  const handleRenameSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const s = sessions.find((s) => s.id === id);
    if (s) {
      setRenameId(id);
      setRenameName(s.name);
      setRenameDialogOpen(true);
    }
  };

  const confirmRenameSession = () => {
    if (!renameId || !renameName.trim()) return;
    const updated = sessions.map((s) => s.id === renameId ? { ...s, name: renameName.trim() } : s);
    setSessions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setRenameDialogOpen(false);
    setRenameId(null);
    toast.success("Session renamed");
  };

  const promptUpdateSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length === 0) { toast.error("No images to save"); return; }
    setUpdateConfirmId(id);
    setUpdateConfirmOpen(true);
  };

  const handleUpdateSession = async () => {
    const id = updateConfirmId;
    if (!id) return;
    setUpdateConfirmOpen(false);
    setUpdateConfirmId(null);
    const existing = sessions.find((s) => s.id === id);
    if (!existing) return;

    try {
      const thumbnail = await generateThumbnail();
      const convertedImages = await Promise.all(
        images.map(async (img) => {
          const convertedSrc = await blobUrlToBase64(img.src);
          const convertedElements = await Promise.all(
            (img.elements || []).map(async (element) => {
              if (element.type === "image" || element.type === "logo" || element.type === "watermark") {
                const elementWithSrc = element as typeof element & { src?: string };
                if (elementWithSrc.src) {
                  const convertedElementSrc = await blobUrlToBase64(elementWithSrc.src);
                  return { ...element, src: convertedElementSrc };
                }
              }
              return element;
            })
          );
          return { ...img, src: convertedSrc, elements: convertedElements };
        })
      );

      const randomizerTemplates = loadRandomizerTemplates();

      const updatedSession: SavedSession = {
        ...existing,
        timestamp: Date.now(),
        imageCount: images.length,
        thumbnail,
        randomizerTemplates,
        data: {
          images: convertedImages,
          currentImageIndex,
          exportSettings,
        },
      };

      const updated = sessions.map((s) => s.id === id ? updatedSession : s);
      setSessions(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      toast.success(`Session "${existing.name}" updated`);
    } catch (error) {
      console.error("Failed to update session:", error);
      toast.error("Failed to update session");
    }
  };

  // Export - show filename dialog first
  const handleExportClick = () => {
    if (sessions.length === 0) {
      toast.error("No sessions to export");
      return;
    }
    setExportFilename("editor-sessions");
    setExportFilenameDialogOpen(true);
  };

  const handleExportConfirm = () => {
    try {
      const exportData: SessionsExportFile = {
        version: "1.0",
        exportType: "sessions-bundle",
        timestamp: Date.now(),
        sessionCount: sessions.length,
        sessions: sessions,
      };

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      saveAs(blob, `${exportFilename.trim() || "editor-sessions"}.json`);
      toast.success(`Exported ${sessions.length} session(s)`);
      setExportFilenameDialogOpen(false);
    } catch (error) {
      console.error("Failed to export sessions:", error);
      toast.error("Failed to export sessions");
    }
  };

  // Handle file import
  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.version || data.exportType !== "sessions-bundle" || !Array.isArray(data.sessions)) {
        throw new Error("Invalid sessions file format");
      }

      for (const session of data.sessions) {
        if (!session.id || !session.name || !session.data?.images) {
          throw new Error("Invalid session data structure");
        }
      }

      setImportData(data as SessionsExportFile);
      setImportDialogOpen(true);
    } catch (error) {
      console.error("Failed to parse import file:", error);
      toast.error("Invalid sessions file. Please select a valid export file.");
    }
  };

  // Confirm import with selected mode
  const confirmImport = () => {
    if (!importData) return;

    try {
      let newSessions: SavedSession[];

      if (importMode === "replace") {
        newSessions = importData.sessions.map((session) => ({
          ...session,
          id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }));
      } else {
        const existingNames = new Set(sessions.map((s) => s.name.toLowerCase()));
        const newItems = importData.sessions
          .filter((s) => !existingNames.has(s.name.toLowerCase()))
          .map((session) => ({
            ...session,
            id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          }));
        
        newSessions = [...sessions, ...newItems].slice(0, MAX_SESSIONS);
        
        if (newItems.length < importData.sessions.length) {
          const skipped = importData.sessions.length - newItems.length;
          toast.info(`Skipped ${skipped} duplicate session(s)`);
        }
      }

      setSessions(newSessions);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
      
      setImportDialogOpen(false);
      setImportData(null);
      toast.success(`Imported ${importMode === "replace" ? importData.sessions.length : newSessions.length - sessions.length} session(s)`);
    } catch (error) {
      console.error("Failed to import sessions:", error);
      toast.error("Failed to import sessions");
    }
  };

  const getTotalImageCount = (data: SessionsExportFile) => {
    return data.sessions.reduce((sum, s) => sum + s.imageCount, 0);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Sessions
            {sessions.length > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                {sessions.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 bg-popover border border-border z-50">
          <DropdownMenuLabel className="flex items-center justify-between">
            Saved Sessions
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1"
              onClick={() => setSaveDialogOpen(true)}
              disabled={images.length === 0}
            >
              <Save className="h-3 w-3" />
              Save Current
            </Button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {sessions.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No saved sessions yet
            </div>
          ) : (
            sessions.map((session) => (
              <DropdownMenuItem
                key={session.id}
                className="flex items-center gap-3 p-2 cursor-pointer"
                onClick={() => handleLoadSession(session)}
              >
                {session.thumbnail ? (
                  <img
                    src={session.thumbnail}
                    alt={session.name}
                    className="h-10 w-10 object-cover rounded border border-border flex-shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 bg-muted rounded border border-border flex items-center justify-center flex-shrink-0">
                    <Image className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{session.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {session.imageCount} image{session.imageCount !== 1 ? "s" : ""}
                    {session.randomizerTemplates && session.randomizerTemplates.length > 0 && (
                      <> • {session.randomizerTemplates.length} tmpl</>
                    )}
                    {" • "}
                    {new Date(session.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 hover:bg-accent"
                  title="Update with current data"
                  onClick={(e) => promptUpdateSession(session.id, e)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 hover:bg-accent"
                  title="Rename"
                  onClick={(e) => handleRenameSession(session.id, e)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => handleDeleteSession(session.id, e)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuItem>
            ))
          )}

          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={handleExportClick}
            disabled={sessions.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export All Sessions
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import Sessions
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportFile(file);
          e.target.value = "";
        }}
      />

      {/* Save Session Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Session</DialogTitle>
            <DialogDescription>
              Save your current project as a named session. Randomizer templates will also be saved.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Session name..."
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveSession();
                }
              }}
            />
            <div className="mt-2 text-sm text-muted-foreground">
              {images.length} image{images.length !== 1 ? "s" : ""} + {loadRandomizerTemplates().length} template(s) will be saved
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSession}>Save Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Filename Dialog */}
      <Dialog open={exportFilenameDialogOpen} onOpenChange={setExportFilenameDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Export Sessions</DialogTitle>
            <DialogDescription>Choose a filename for the exported sessions.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="session-export-filename">Filename</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                id="session-export-filename"
                value={exportFilename}
                onChange={(e) => setExportFilename(e.target.value)}
                placeholder="editor-sessions"
                onKeyDown={(e) => { if (e.key === "Enter") handleExportConfirm(); }}
              />
              <span className="text-sm text-muted-foreground">.json</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportFilenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleExportConfirm} disabled={!exportFilename.trim()}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Sessions Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Sessions</DialogTitle>
            <DialogDescription>
              Import {importData?.sessionCount || 0} session(s) with {importData ? getTotalImageCount(importData) : 0} total images
            </DialogDescription>
          </DialogHeader>

          {importData && (
            <div className="space-y-4">
              <div className="border border-border rounded-lg p-3">
                <div className="text-sm font-medium mb-2">Sessions to import:</div>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {importData.sessions.map((session, index) => (
                      <div
                        key={session.id || index}
                        className="flex items-center gap-2 text-sm"
                      >
                        {session.thumbnail ? (
                          <img
                            src={session.thumbnail}
                            alt={session.name}
                            className="h-8 w-8 object-cover rounded border border-border"
                          />
                        ) : (
                          <div className="h-8 w-8 bg-muted rounded border border-border flex items-center justify-center">
                            <Image className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{session.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {session.imageCount} image{session.imageCount !== 1 ? "s" : ""}
                            {session.randomizerTemplates && session.randomizerTemplates.length > 0 && (
                              <> • {session.randomizerTemplates.length} tmpl</>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Import mode:</Label>
                <RadioGroup
                  value={importMode}
                  onValueChange={(value: "replace" | "merge") => setImportMode(value)}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="merge" id="merge" className="mt-1" />
                    <Label htmlFor="merge" className="font-normal cursor-pointer">
                      <div className="font-medium">Merge with existing</div>
                      <div className="text-xs text-muted-foreground">
                        Add new sessions, skip duplicates (by name)
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="replace" id="replace" className="mt-1" />
                    <Label htmlFor="replace" className="font-normal cursor-pointer">
                      <div className="font-medium">Replace all</div>
                      <div className="text-xs text-muted-foreground">
                        Remove existing sessions and import new ones
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {importMode === "replace" && sessions.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-destructive">
                    This will delete your {sessions.length} existing session(s). This action cannot be undone.
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setImportData(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmImport}>
              Import {importData?.sessionCount || 0} Session(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Session Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rename Session</DialogTitle>
            <DialogDescription>Enter a new name for this session.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            placeholder="Session name"
            onKeyDown={(e) => e.key === "Enter" && confirmRenameSession()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmRenameSession} disabled={!renameName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Session Confirmation Dialog */}
      <Dialog open={updateConfirmOpen} onOpenChange={setUpdateConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to overwrite "{sessions.find((s) => s.id === updateConfirmId)?.name}" with the current data? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleUpdateSession}>Overwrite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
