export interface TextEntry {
  id: string;
  title: string;
  content: string;
  timestamp: number;
}

export type SpacingOption = '1x' | '1.5x' | '2x';
export type OutputMode = "single-line" | "keep-formatting";
