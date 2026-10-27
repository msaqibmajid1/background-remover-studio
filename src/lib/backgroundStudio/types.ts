import { z } from "zod";
import { studioTextStyleSchema } from "./textStyleSchema";
const coordinate = z.number().finite();
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const key = z.string().max(200);
export const overlaySchema = z.object({
  id: z.string(),
  name: z.string().max(100).optional(),
  templateCode: z.string().max(200).optional(),
  type: z.enum(["text", "logo", "rectangle", "circle"]),
  x: coordinate,
  y: coordinate,
  width: coordinate.positive().max(4),
  height: coordinate.positive().max(4),
  rotation: coordinate,
  opacity: coordinate.min(0).max(1),
  locked: z.boolean(),
  visible: z.boolean(),
  text: z.string().max(10000),
  color,
  font: z.string().min(1).max(150),
  fontSize: coordinate.min(5).max(1000),
  bold: z.boolean(),
  align: z.enum(["left", "center", "right"]),
  assetKey: key.optional(),
  maskAssetKey: key.optional(),
  textStyle: studioTextStyleSchema.optional(),
});
export type StudioOverlay = z.infer<typeof overlaySchema>;
export const designSchema = z.object({
  width: coordinate.int().positive().max(16384),
  height: coordinate.int().positive().max(16384),
  background: z.object({
    type: z.enum(["transparent", "solid", "gradient", "image", "blur"]),
    color,
    secondary: color,
    angle: coordinate,
    assetKey: key.optional(),
    blur: coordinate.min(0).max(50),
  }),
  subject: z.object({
    x: coordinate,
    y: coordinate,
    width: coordinate.min(0.01).max(10),
    rotation: coordinate,
    flipX: z.boolean(),
    flipY: z.boolean(),
    manual: z.boolean(),
    clipToPhotoArea: z.boolean().optional(),
  }),
  shadow: z.object({
    enabled: z.boolean(),
    color,
    blur: coordinate.min(0).max(150),
    opacity: coordinate.min(0).max(1),
    x: coordinate,
    y: coordinate,
  }),
  outline: z.object({
    enabled: z.boolean(),
    color,
    width: coordinate.min(0).max(100),
  }),
  refine: z.object({
    feather: coordinate.min(0).max(20),
    edge: coordinate.min(-15).max(15),
    contrast: coordinate.min(0).max(80),
  }),
  overlays: z.array(overlaySchema).max(200),
  templateId: z.string().optional(),
  photoArea: z
    .object({
      x: coordinate.min(0).max(1),
      y: coordinate.min(0).max(1),
      width: coordinate.positive().max(1),
      height: coordinate.positive().max(1),
    })
    .optional(),
});
export type StudioDesign = z.infer<typeof designSchema>;
export const strokeSchema = z.object({
  mode: z.enum(["erase", "restore"]),
  size: coordinate.min(0.001).max(1),
  hardness: coordinate.min(0).max(1),
  points: z
    .array(z.tuple([coordinate.min(0).max(1), coordinate.min(0).max(1)]))
    .min(1)
    .max(100000),
});
export type MaskStroke = z.infer<typeof strokeSchema>;
export const studioImageSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  width: coordinate.int().positive().max(16384),
  height: coordinate.int().positive().max(16384),
  originalKey: key,
  thumbnailKey: key,
  maskKey: key.optional(),
  useOriginal: z.boolean().optional(),
  status: z.enum(["pending", "processing", "ready", "error"]),
  error: z.string().optional(),
  design: designSchema,
  strokes: z.array(strokeSchema).max(10000),
  maskBounds: z
    .tuple([coordinate, coordinate, coordinate, coordinate])
    .optional(),
});
export type StudioImage = z.infer<typeof studioImageSchema>;
export const templateSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  category: z.enum([
    "Product",
    "Portrait",
    "Social",
    "Thumbnail",
    "Minimal",
    "Saved",
    "Imported",
  ]),
  design: designSchema,
  previewKey: key.optional(),
  outlinedText: z.boolean().optional(),
  revision: z.number().int().min(0).optional(),
  sampleImage: z.object({ assetKey: key, width: coordinate.positive().int(), height: coordinate.positive().int(), type: z.string(), name: z.string().max(200) }).optional(),
});
export type StudioTemplate = z.infer<typeof templateSchema>;
export const studioProjectSchema = z.object({
  type: z.literal("background-studio"),
  version: z.literal(2),
  id: z.string(),
  images: z.array(studioImageSchema),
  activeId: z.string().nullable(),
  templates: z.array(templateSchema).max(200),
  starterTemplate: templateSchema.optional(),
  fonts: z.array(z.object({ family: z.string().max(150), assetKey: key })).max(200).optional(),
  workflow: z.enum(["template", "upload", "remove", "edit"]).optional(),
  queue: z.array(z.string()).default([]),
  settings: z
    .object({
      mode: z.enum(["general", "portrait"]).default("general"),
      device: z.enum(["auto", "cpu"]).default("auto"),
      brushSize: coordinate.min(4).max(300).default(40),
      hardness: coordinate.min(0).max(100).default(80),
    })
    .default({}),
});
export type StudioProject = z.infer<typeof studioProjectSchema>;
export type StudioStep = NonNullable<StudioProject["workflow"]>;
export const STUDIO_STEPS: { id: StudioStep; name: string }[] = [
  { id: "template", name: "Template" },
  { id: "upload", name: "Images" },
  { id: "remove", name: "Photo Options" },
  { id: "edit", name: "Edit & Export" },
];
export const newDesign = (width = 1080, height = 1080): StudioDesign => ({
  width,
  height,
  background: {
    type: "transparent",
    color: "#ffffff",
    secondary: "#e9eef3",
    angle: 135,
    blur: 15,
  },
  subject: {
    x: 0.5,
    y: 0.5,
    width: 1,
    rotation: 0,
    flipX: false,
    flipY: false,
    manual: false,
  },
  shadow: {
    enabled: false,
    color: "#000000",
    blur: 28,
    opacity: 0.25,
    x: 0,
    y: 12,
  },
  outline: { enabled: false, color: "#ffffff", width: 8 },
  refine: { feather: 0, edge: 0, contrast: 0 },
  overlays: [],
});
export const newProject = (): StudioProject => ({
  type: "background-studio",
  version: 2,
  id: crypto.randomUUID(),
  images: [],
  activeId: null,
  templates: [],
  workflow: "template",
  queue: [],
  settings: { mode: "general", device: "auto", brushSize: 40, hardness: 80 },
});
export function normalizeStudioProject(value: unknown): StudioProject {
  const result = studioProjectSchema.parse(value);
  const ids = new Set(result.images.map((image) => image.id));
  if (ids.size !== result.images.length)
    throw new Error("The project contains duplicate image IDs.");
  result.images.forEach((image) => {
    if (image.status === "processing")
      image.status = image.maskKey ? "ready" : "pending";
    if (
      image.width * image.height > 40000000 ||
      image.design.width * image.design.height > 40000000
    )
      throw new Error("A saved image exceeds the 40-megapixel canvas limit.");
  });
  if (!ids.has(result.activeId || ""))
    result.activeId = result.images[0]?.id || null;
  result.queue = [...new Set(result.queue.filter((id) => ids.has(id)))];
  return result;
}
export function projectAssetKeys(project: StudioProject) {
  return [
    ...new Set(
      [
        ...(project.fonts || []).map((font) => font.assetKey),
        ...project.images.flatMap((image) => [
          image.originalKey,
          image.thumbnailKey,
          image.maskKey,
          image.design.background.assetKey,
          ...image.design.overlays.flatMap((layer) => [
            layer.assetKey,
            layer.maskAssetKey,
          ]),
        ]),
        ...[
          ...project.templates,
          ...(project.starterTemplate ? [project.starterTemplate] : []),
        ].flatMap((template) => [
          template.previewKey,
          template.sampleImage?.assetKey,
          template.design.background.assetKey,
          ...template.design.overlays.flatMap((layer) => [
            layer.assetKey,
            layer.maskAssetKey,
          ]),
        ]),
      ].filter((value): value is string => !!value),
    ),
  ];
}
