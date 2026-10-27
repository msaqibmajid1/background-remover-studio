import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ClipboardPaste } from "lucide-react";

interface BatchPasteQuotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddQuotes: (quotes: { text: string; author: string }[]) => void;
}

type ParseFormat = "newline" | "numbered" | "dash" | "custom";

export function BatchPasteQuotesDialog({
  open,
  onOpenChange,
  onAddQuotes,
}: BatchPasteQuotesDialogProps) {
  const [text, setText] = useState("");
  const [format, setFormat] = useState<ParseFormat>("newline");
  const [includeAuthor, setIncludeAuthor] = useState(true);

  const parseQuotes = (): { text: string; author: string }[] => {
    if (!text.trim()) return [];

    let lines: string[] = [];

    switch (format) {
      case "newline":
        // Split by double newlines or single newlines
        lines = text
          .split(/\n\n+/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length === 1) {
          // Fallback to single newlines
          lines = text
            .split(/\n/)
            .map((l) => l.trim())
            .filter(Boolean);
        }
        break;
      case "numbered":
        // Match patterns like "1. Quote" or "1) Quote"
        lines = text
          .split(/\n/)
          .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
          .filter(Boolean);
        break;
      case "dash":
        // Split by lines starting with - or •
        lines = text
          .split(/\n/)
          .map((l) => l.replace(/^[-•]\s*/, "").trim())
          .filter(Boolean);
        break;
      case "custom":
        // Split by ||| delimiter
        lines = text
          .split("|||")
          .map((l) => l.trim())
          .filter(Boolean);
        break;
    }

    return lines.map((line) => {
      let quoteText = line;
      let author = "";

      if (includeAuthor) {
        // Try to extract author with patterns like "- Author" or "— Author" at the end
        const authorMatch = line.match(/\s*[-—–]\s*([^-—–]+)$/);
        if (authorMatch) {
          quoteText = line.replace(authorMatch[0], "").trim();
          author = authorMatch[1].trim();
        }
      }

      // Remove surrounding quotes if present
      quoteText = quoteText.replace(/^["'"']|["'"']$/g, "").trim();

      return { text: quoteText, author };
    });
  };

  const previewQuotes = parseQuotes();

  const handleAdd = () => {
    if (previewQuotes.length === 0) return;
    onAddQuotes(previewQuotes);
    setText("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Batch Paste Quotes
          </DialogTitle>
          <DialogDescription>
            Paste multiple quotes at once. Each quote will be added separately.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as ParseFormat)}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2 p-2 rounded-md border border-border hover:bg-muted/50">
                <RadioGroupItem value="newline" id="newline" />
                <Label htmlFor="newline" className="text-sm cursor-pointer">
                  Newline separated
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-md border border-border hover:bg-muted/50">
                <RadioGroupItem value="numbered" id="numbered" />
                <Label htmlFor="numbered" className="text-sm cursor-pointer">
                  Numbered (1. Quote)
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-md border border-border hover:bg-muted/50">
                <RadioGroupItem value="dash" id="dash" />
                <Label htmlFor="dash" className="text-sm cursor-pointer">
                  Dash/Bullet (- Quote)
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-md border border-border hover:bg-muted/50">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="text-sm cursor-pointer">
                  Custom (||| delimiter)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Author Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeAuthor"
              checked={includeAuthor}
              onChange={(e) => setIncludeAuthor(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="includeAuthor" className="text-sm cursor-pointer">
              Parse author from quotes (e.g., "Quote text - Author Name")
            </Label>
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <Label>Paste your quotes</Label>
            <Textarea
              placeholder={`Example:\n"Life is what happens when you're busy making other plans." - John Lennon\n\n"The only way to do great work is to love what you do." - Steve Jobs`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          {/* Preview */}
          {previewQuotes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">
                Preview ({previewQuotes.length} quotes detected)
              </Label>
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-3 space-y-2 bg-muted/30">
                {previewQuotes.slice(0, 10).map((q, i) => (
                  <div
                    key={i}
                    className="text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0"
                  >
                    <p className="text-foreground">"{q.text}"</p>
                    {q.author && (
                      <p className="text-muted-foreground text-xs mt-1">
                        — {q.author}
                      </p>
                    )}
                  </div>
                ))}
                {previewQuotes.length > 10 && (
                  <p className="text-xs text-muted-foreground">
                    ... and {previewQuotes.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={previewQuotes.length === 0}>
            <ClipboardPaste className="h-4 w-4 mr-2" />
            Add {previewQuotes.length} Quote{previewQuotes.length !== 1 && "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
