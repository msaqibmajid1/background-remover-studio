import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Keyboard, Mouse, Layers, Image, Type, Shapes, Download, Save, Play, Palette } from "lucide-react";

interface HelpDialogProps {
  onRestartTutorial: () => void;
}

export const HelpDialog = ({ onRestartTutorial }: HelpDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Professional Image Editor - User Manual
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onRestartTutorial();
              }}
              className="ml-auto"
            >
              <Play className="h-4 w-4 mr-2" />
              Restart Tutorial
            </Button>
          </DialogTitle>
          <DialogDescription>
            Complete guide to using all features of the image editor
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <Tabs defaultValue="getting-started" className="w-full">
            <TabsList className="grid grid-cols-4 w-full mb-4">
              <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
              <TabsTrigger value="keyboard">Keyboard</TabsTrigger>
              <TabsTrigger value="elements">Elements</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="getting-started" className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Uploading Images
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Click "Add Images" button or drag & drop images onto the canvas</li>
                  <li>• Support for JPG, PNG, GIF, WebP formats</li>
                  <li>• Upload multiple images at once for batch editing</li>
                  <li>• Navigate between images using Previous/Next buttons</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Mouse className="h-5 w-5" />
                  Canvas Interaction
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Click</strong> on any element to select it</li>
                  <li>• <strong>Drag</strong> to move selected elements</li>
                  <li>• <strong>Shift + Click</strong> to select multiple elements</li>
                  <li>• <strong>Drag on empty space</strong> to draw a selection box</li>
                  <li>• Use corner handles to resize elements</li>
                  <li>• Scroll to zoom in/out (Ctrl+Scroll for precision)</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Save className="h-5 w-5" />
                  Saving & Loading
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Save Project</strong>: Download project as JSON file for backup</li>
                  <li>• <strong>Save Project</strong>: Download project as JSON file for backup</li>
                  <li>• <strong>Load Project</strong>: Restore previously saved project files</li>
                  <li>• <strong>Export</strong>: Download final images as PNG or JPG</li>
                </ul>
              </section>
            </TabsContent>

            <TabsContent value="keyboard" className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Keyboard className="h-5 w-5" />
                  Essential Shortcuts
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-primary">Selection & Editing</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li><kbd className="px-2 py-1 bg-muted rounded">Delete</kbd> - Delete selected</li>
                      <li><kbd className="px-2 py-1 bg-muted rounded">Ctrl+C</kbd> - Copy</li>
                      <li><kbd className="px-2 py-1 bg-muted rounded">Ctrl+V</kbd> - Paste</li>
                      <li><kbd className="px-2 py-1 bg-muted rounded">Ctrl+Z</kbd> - Undo</li>
                      <li><kbd className="px-2 py-1 bg-muted rounded">Ctrl+Y</kbd> - Redo</li>
                      <li><kbd className="px-2 py-1 bg-muted rounded">Ctrl+A</kbd> - Select All</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-primary">Grouping & Movement</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li><kbd className="px-2 py-1 bg-muted rounded">Ctrl+G</kbd> - Group elements</li>
                      <li><kbd className="px-2 py-1 bg-muted rounded">Ctrl+Shift+G</kbd> - Ungroup</li>
                      <li><kbd className="px-2 py-1 bg-muted rounded">Arrow Keys</kbd> - Move 1px</li>
                      <li><kbd className="px-2 py-1 bg-muted rounded">Shift+Arrow</kbd> - Move 10px</li>
                      <li><kbd className="px-2 py-1 bg-muted rounded">Escape</kbd> - Deselect</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-3">Pro Tips</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Hold <kbd className="px-2 py-1 bg-muted rounded text-xs">Shift</kbd> while dragging to maintain aspect ratio</li>
                  <li>• Use <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+D</kbd> to duplicate selected element</li>
                  <li>• Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Tab</kbd> to cycle through elements</li>
                </ul>
              </section>
            </TabsContent>

            <TabsContent value="elements" className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Text Elements
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Add Text</strong>: Click "Add Text" button in left panel</li>
                  <li>• <strong>Text Templates</strong>: Quick preset styles for common use cases</li>
                  <li>• <strong>Font Library</strong>: 30+ Google Fonts including Roboto, Montserrat, Playfair Display</li>
                  <li>• <strong>Auto-fit Text</strong>: Automatically adjusts font size to fit container</li>
                  <li>• <strong>Gradients</strong>: Apply gradient colors to text</li>
                  <li>• <strong>Stroke</strong>: Add outlines to text with customizable color and width</li>
                  <li>• <strong>3D Effects</strong>: Apply preset 3D styles (Classic 3D, Neon Glow, etc.)</li>
                  <li>• <strong>Typography Controls</strong>: Line height, letter spacing, word spacing</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Multi-Color Text
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Enable</strong>: Toggle "Multi-Color Text" switch in Typography section</li>
                  <li>• <strong>Colorize Percentage</strong>: Slider controls how much text gets colored (0-100%)</li>
                  <li>• <strong>Multi-Color Presets</strong>: 100+ pre-made color combinations across categories</li>
                  <li>• <strong>Customize Presets</strong>: Click edit icon on any preset to modify colors</li>
                  <li>• <strong>Color Palette Generator</strong>: Create harmonious colors from a base color</li>
                  <li>• <strong>Palette Types</strong>: Complementary, Triadic, Analogous, Split-Complementary, and more</li>
                  <li>• <strong>Save Palettes</strong>: Save generated palettes to reuse across projects</li>
                  <li>• <strong>Word Colors</strong>: Shows each word with its assigned color</li>
                  <li>• <strong>Match Words</strong>: Sync color count to match word count exactly</li>
                  <li>• <strong>Add/Remove Color</strong>: Manually adjust the number of colors in rotation</li>
                  <li>• <strong>Edit Individual</strong>: Click color swatch next to any word to change it</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Shapes className="h-5 w-5" />
                  Shapes & Logos
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Rectangles</strong>: Adjustable corner radius, borders, shadows</li>
                  <li>• <strong>Circles</strong>: Perfect for badges, stickers, or frames</li>
                  <li>• <strong>Stars & Polygons</strong>: Customizable points and sides</li>
                  <li>• <strong>Lines & Arrows</strong>: Straight lines with optional arrow heads</li>
                  <li>• <strong>Line Formatting</strong>: Control width, dash patterns, caps, and joins</li>
                  <li>• <strong>Background Images</strong>: Fill shapes with images</li>
                  <li>• <strong>Logos & Watermarks</strong>: Upload and position brand elements</li>
                  <li>• <strong>Blend Modes</strong>: Control how logos overlay images</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Image Filters & Cropping
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Crop Tool</strong>: Use the Crop button to adjust image dimensions and focus</li>
                  <li>• <strong>Brightness</strong>: Lighten or darken your image</li>
                  <li>• <strong>Contrast</strong>: Enhance the difference between light and dark areas</li>
                  <li>• <strong>Saturation</strong>: Boost or reduce color intensity</li>
                  <li>• <strong>Blur</strong>: Apply soft focus or background blur effects</li>
                  <li>• <strong>Sepia</strong>: Vintage warm tone filter</li>
                  <li>• <strong>Grayscale</strong>: Convert to black and white</li>
                  <li>• <strong>Invert</strong>: Create negative image effect</li>
                  <li>• <strong>Hue Rotate</strong>: Shift all colors around the color wheel</li>
                </ul>
              </section>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Layer Management
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Z-Index</strong>: Control which elements appear on top</li>
                  <li>• <strong>Bring to Front</strong>: Move element above all others</li>
                  <li>• <strong>Send to Back</strong>: Move element below all others</li>
                  <li>• <strong>Lock Elements</strong>: Prevent accidental editing</li>
                  <li>• <strong>Hide Elements</strong>: Temporarily hide without deleting</li>
                  <li>• <strong>Layers Panel</strong>: Visual overview of all elements</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Multi-Select & Grouping</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Select Multiple</strong>: Shift+Click or draw selection box</li>
                  <li>• <strong>Group Elements</strong>: Ctrl+G to create group (move together)</li>
                  <li>• <strong>Ungroup</strong>: Ctrl+Shift+G to break apart groups</li>
                  <li>• <strong>Edit Group Members</strong>: Double-click group to edit individual elements</li>
                  <li>• <strong>Batch Operations</strong>: Apply transformations to all selected</li>
                </ul>
              </section>
              <section>
                <h3 className="text-lg font-semibold mb-3">Transform Tools</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Flip & Rotate</strong>: Flip horizontally/vertically or rotate elements</li>
                  <li>• <strong>Skew</strong>: Apply perspective transforms with skew X/Y controls</li>
                  <li>• <strong>Scale & Resize</strong>: Adjust element dimensions freely</li>
                  <li>• <strong>Aspect Ratio Lock</strong>: Maintain proportions while resizing</li>
                </ul>
              </section>

              <section className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-3">Saving & Storage</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Save Project</strong>: Download project as JSON file to your chosen location</li>
                  <li>• <strong>Save Project</strong>: Download project as JSON file to your chosen location</li>
                  <li>• <strong>Save Location</strong>: Projects save to your browser's default download folder</li>
                  <li>• <strong>Load Project</strong>: Restore previously saved project files</li>
                  <li>• <strong>Export</strong>: Download final images as PNG or JPG</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Options
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Quality Presets</strong>: Original, High, Medium, Low</li>
                  <li>• <strong>Format</strong>: PNG (transparency) or JPG (smaller size)</li>
                  <li>• <strong>Naming</strong>: Numbers, original names, or custom prefix</li>
                  <li>• <strong>Batch Export</strong>: Download all images at once as ZIP</li>
                  <li>• <strong>Apply to All</strong>: Copy design to all images in batch</li>
                </ul>
              </section>

              <section className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-3">Templates & Presets</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Canvas Templates</strong>: Social media presets (Instagram, Facebook, YouTube, etc.)</li>
                  <li>• <strong>Text Templates</strong>: Pre-styled text for headlines, captions, watermarks</li>
                  <li>• <strong>Custom Sizes</strong>: Set exact dimensions for any use case</li>
                  <li>• <strong>Maintain Aspect Ratio</strong>: Prevent image distortion</li>
                </ul>
              </section>

              <section className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-3">History & Project Management</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Visual History Panel</strong>: View thumbnails of previous states in the History tab</li>
                  <li>• <strong>Undo/Redo Previews</strong>: Hover over Undo/Redo buttons to see preview thumbnails</li>
                  <li>• <strong>Jump to Any State</strong>: Click any history entry to restore that version</li>
                  <li>• <strong>Manual Save/Load</strong>: Download and restore projects as JSON files</li>
                  <li>• <strong>Manual Save/Load</strong>: Download and restore projects as JSON files</li>
                  <li>• <strong>Drag & Drop Upload</strong>: Drag image files directly onto canvas for quick upload</li>
                </ul>
              </section>

              <section className="pt-4 border-t bg-muted/50 p-4 rounded">
                <h3 className="text-lg font-semibold mb-2">Need More Help?</h3>
                <p className="text-sm text-muted-foreground">
                  For additional support, tutorials, or feature requests, please visit our documentation 
                  or contact support. We're constantly adding new features based on user feedback!
                </p>
              </section>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
