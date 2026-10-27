import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { templates, Template } from "@/data/templates";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: Template) => void;
}

export const TemplateDialog = ({
  open,
  onOpenChange,
  onSelectTemplate,
}: TemplateDialogProps) => {
  const categories = {
    social: templates.filter(t => t.category === "social"),
    marketing: templates.filter(t => t.category === "marketing"),
    product: templates.filter(t => t.category === "product"),
    event: templates.filter(t => t.category === "event"),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="social" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="product">Product</TabsTrigger>
            <TabsTrigger value="event">Event</TabsTrigger>
          </TabsList>
          
          {Object.entries(categories).map(([key, categoryTemplates]) => (
            <TabsContent key={key} value={key}>
              <ScrollArea className="h-[500px] pr-4">
                <div className="grid grid-cols-2 gap-4">
                  {categoryTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors"
                      onClick={() => {
                        onSelectTemplate(template);
                        onOpenChange(false);
                      }}
                    >
                      <h3 className="font-semibold mb-1">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                      <div className="text-xs text-muted-foreground">
                        {template.canvasSize.width} × {template.canvasSize.height}
                      </div>
                      <Button size="sm" className="w-full mt-3">Use Template</Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
