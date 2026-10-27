import { Progress } from "@/components/ui/progress";

interface ExportProgressDialogProps {
  progress: {
    phase: "preloading" | "packaging";
    current: number;
    total: number;
  };
}

export const ExportProgressDialog = ({ progress }: ExportProgressDialogProps) => {
  const percentage = Math.round((progress.current / progress.total) * 100);
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border p-6 rounded-xl shadow-xl w-80">
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          {progress.phase === "preloading" ? "Loading Images..." : "Packaging ZIP..."}
        </h3>
        <Progress value={percentage} className="mb-3" />
        <p className="text-sm text-muted-foreground text-center">
          {progress.current} / {progress.total} images ({percentage}%)
        </p>
      </div>
    </div>
  );
};
