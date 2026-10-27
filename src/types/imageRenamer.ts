export interface ImageFile {
  id: string;
  file: File;
  originalName: string;
  newName: string;
  format: 'original' | 'jpg' | 'png' | 'webp';
  preview: string;
  processed?: boolean;
}

export interface NamingPattern {
  prefix: string;
  suffix: string;
  startNumber: number;
  padding: number;
  includeOriginalName: boolean;
  namingMode: 'pattern' | 'custom';
  customNames: string[];
}

export type FileFormat = 'original' | 'jpg' | 'png' | 'webp';
