import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RotateCcw, Sparkles } from "lucide-react";

interface RestoreSessionDialogProps {
  open: boolean;
  savedTime: Date | null;
  imageCount: number;
  onRestore: () => void;
  onStartFresh: () => void;
}

export const RestoreSessionDialog = ({
  open,
  savedTime,
  imageCount,
  onRestore,
  onStartFresh,
}: RestoreSessionDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Restore Previous Session?
          </AlertDialogTitle>
          <AlertDialogDescription>
            A previous session was found with {imageCount} image{imageCount !== 1 ? "s" : ""}.
            {savedTime && (
              <span className="block mt-1 text-muted-foreground">
                Last saved: {savedTime.toLocaleString()}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStartFresh} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Start Fresh
          </AlertDialogCancel>
          <AlertDialogAction onClick={onRestore} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Restore Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
