import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Keyboard, Search, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export const KeyboardShortcutsDialog = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const shortcuts = [
    { category: "Selection", items: [
      { keys: ["Ctrl/Cmd", "+", "A"], description: "Select all elements" },
      { keys: ["Shift", "+", "Click"], description: "Multi-select elements" },
      { keys: ["Escape"], description: "Deselect all" },
    ]},
    { category: "Navigation", items: [
      { keys: ["Page Up"], description: "Previous image" },
      { keys: ["Page Down"], description: "Next image" },
      { keys: ["Alt", "+", "←"], description: "Previous image" },
      { keys: ["Alt", "+", "→"], description: "Next image" },
    ]},
    { category: "Editing", items: [
      { keys: ["Delete / Backspace"], description: "Delete selected element(s)" },
      { keys: ["Ctrl/Cmd", "+", "C"], description: "Copy selected element(s)" },
      { keys: ["Ctrl/Cmd", "+", "V"], description: "Paste element(s)" },
      { keys: ["Ctrl/Cmd", "+", "D"], description: "Duplicate selected element(s)" },
      { keys: ["Ctrl/Cmd", "+", "Z"], description: "Undo" },
      { keys: ["Ctrl/Cmd", "+", "Y"], description: "Redo" },
      { keys: ["F4"], description: "Repeat last action (works on the currently selected element / image)" },
      { keys: ["C"], description: "Toggle crop mode" },
    ]},
    { category: "Layers", items: [
      { keys: ["Ctrl/Cmd", "+", "]"], description: "Bring forward" },
      { keys: ["Ctrl/Cmd", "+", "["], description: "Send backward" },
      { keys: ["Ctrl/Cmd", "+", "Shift", "+", "]"], description: "Bring to front" },
      { keys: ["Ctrl/Cmd", "+", "Shift", "+", "["], description: "Send to back" },
    ]},
    { category: "Movement", items: [
      { keys: ["Arrow Keys"], description: "Move element by 1px" },
      { keys: ["Shift", "+", "Arrow"], description: "Move element by 10px" },
    ]},
    { category: "Grouping", items: [
      { keys: ["Ctrl/Cmd", "+", "G"], description: "Group selected elements" },
      { keys: ["Ctrl/Cmd", "+", "Shift", "+", "G"], description: "Ungroup elements" },
    ]},
  ];

  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) return shortcuts;
    
    const query = searchQuery.toLowerCase();
    return shortcuts
      .map(section => ({
        ...section,
        items: section.items.filter(item => 
          item.description.toLowerCase().includes(query) ||
          item.keys.some(key => key.toLowerCase().includes(query))
        )
      }))
      .filter(section => section.items.length > 0);
  }, [searchQuery]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Keyboard className="h-4 w-4 mr-2" />
          Shortcuts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Collapsible open={helpOpen} onOpenChange={setHelpOpen} className="mb-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors">
            <span className="font-semibold text-sm">How to Use the Editor</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${helpOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 p-4 bg-muted/30 rounded-lg space-y-3 text-sm">
            <div>
              <h4 className="font-semibold text-primary mb-1">Getting Started</h4>
              <p className="text-muted-foreground">Upload images using the left panel, then add text, shapes, logos, or watermarks to customize your images.</p>
            </div>
            <div>
              <h4 className="font-semibold text-primary mb-1">Selecting Elements</h4>
              <p className="text-muted-foreground">Click any element to select it. Hold Shift and click to select multiple elements. You can also drag a selection box around elements.</p>
            </div>
            <div>
              <h4 className="font-semibold text-primary mb-1">Moving & Resizing</h4>
              <p className="text-muted-foreground">Drag selected elements to move them. Use the corner and edge handles to resize. Arrow keys move elements precisely.</p>
            </div>
            <div>
              <h4 className="font-semibold text-primary mb-1">Properties Panel</h4>
              <p className="text-muted-foreground">Use the right panel to adjust element properties, manage layers, align elements, and view history.</p>
            </div>
            <div>
              <h4 className="font-semibold text-primary mb-1">Apply to All</h4>
              <p className="text-muted-foreground">When you have multiple images, select an element and click "Apply to All Images" to add it to every image, or "Apply Style Only" to update matching elements.</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="space-y-6 overflow-y-auto flex-1">
          {filteredShortcuts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No shortcuts found matching "{searchQuery}"
            </div>
          ) : (
            filteredShortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="font-semibold text-sm mb-3 text-primary">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <kbd
                          key={keyIdx}
                          className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
