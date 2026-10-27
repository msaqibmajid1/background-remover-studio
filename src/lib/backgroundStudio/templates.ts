import {
  newDesign,
  type StudioDesign,
  type StudioOverlay,
  type StudioTemplate,
} from "./types";
export const textLayer = (
  text = "YOUR HEADLINE",
  x = 0.08,
  y = 0.08,
  width = 0.84,
  color = "#151515",
  size = 64,
): StudioOverlay => ({
  id: crypto.randomUUID(),
  templateCode: crypto.randomUUID(),
  type: "text",
  text,
  x,
  y,
  width,
  height: 0.17,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
  color,
  font: "Arial",
  fontSize: size,
  bold: true,
  align: "left",
});
export const shapeLayer = (
  type: "rectangle" | "circle",
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): StudioOverlay => ({ ...textLayer("", x, y, width, color), type, height });
function preset(
  id: string,
  name: string,
  category: StudioTemplate["category"],
  color: string,
  text: string,
  accent: string,
  layout: "product" | "portrait" | "social" | "thumbnail" | "minimal",
  variant: number,
): StudioTemplate {
  const design = newDesign(
    layout === "thumbnail" ? 1920 : 1080,
    layout === "portrait" ? 1350 : 1080,
  );
  design.templateId = id;
  design.background = {
    ...design.background,
    type: variant % 2 ? "gradient" : "solid",
    color,
    secondary: accent,
    angle: 135,
  };
  design.shadow.enabled = layout === "product" || layout === "minimal";
  design.subject = {
    ...design.subject,
    x: layout === "thumbnail" ? 0.72 : 0.5,
    y: layout === "product" ? 0.54 : 0.6,
    width: layout === "thumbnail" ? 0.56 : 0.8,
  };
  const light = ["#111111", "#17263a", "#8c1c36", "#0e504b"].includes(color),
    foreground = light ? "#ffffff" : "#151515";
  if (layout === "product")
    design.overlays = [
      shapeLayer(
        "rectangle",
        0,
        0.84,
        1,
        0.16,
        variant % 2 ? "#ffffff" : accent,
      ),
      textLayer(text, 0.07, 0.06, 0.86, foreground, 60),
      {
        ...textLayer("PRODUCT COLLECTION", 0.07, 0.9, 0.86, "#151515", 28),
        bold: false,
      },
    ];
  if (layout === "portrait")
    design.overlays = [
      shapeLayer("rectangle", 0, 0, 0.025, 1, accent),
      textLayer(text, 0.08, 0.06, 0.84, foreground, 68),
      {
        ...textLayer("YOUR NAME", 0.08, 0.9, 0.84, foreground, 34),
        align: "center",
      },
    ];
  if (layout === "social")
    design.overlays = [
      shapeLayer("rectangle", 0, 0.78, 1, 0.22, accent),
      textLayer(text, 0.07, 0.07, 0.86, foreground, 70),
      textLayer("MAKE IT YOURS", 0.07, 0.84, 0.86, "#ffffff", 40),
    ];
  if (layout === "thumbnail") {
    design.outline = { enabled: true, color: "#ffffff", width: 10 };
    design.overlays = [
      shapeLayer("rectangle", 0.04, 0.7, 0.4, 0.035, accent),
      {
        ...textLayer(text, 0.05, 0.18, 0.43, foreground, 100),
        height: 0.48,
        font: "Impact",
      },
    ];
  }
  if (layout === "minimal")
    design.overlays = [
      {
        ...textLayer(text, 0.08, 0.07, 0.84, foreground, 42),
        align: "center",
        bold: false,
      },
      shapeLayer("rectangle", 0.3, 0.93, 0.4, 0.004, accent),
    ];
  return { id, name, category, design };
}
export const STUDIO_TEMPLATES: StudioTemplate[] = [
  preset(
    "studio-white",
    "White Studio",
    "Product",
    "#ffffff",
    "NEW ARRIVAL",
    "#e8edf0",
    "product",
    0,
  ),
  preset(
    "studio-mint",
    "Fresh Collection",
    "Product",
    "#d6eee7",
    "FRESH FINDS",
    "#80b8a6",
    "product",
    1,
  ),
  preset(
    "studio-rose",
    "Soft Rose",
    "Product",
    "#f8e5ec",
    "THE EDIT",
    "#e2a8bc",
    "product",
    2,
  ),
  preset(
    "studio-charcoal",
    "Signature Product",
    "Product",
    "#111111",
    "SIGNATURE",
    "#d1e29b",
    "product",
    3,
  ),
  preset(
    "portrait-editorial",
    "Editorial Portrait",
    "Portrait",
    "#f2f4f6",
    "IN FOCUS",
    "#c73738",
    "portrait",
    0,
  ),
  preset(
    "portrait-forest",
    "Forest Portrait",
    "Portrait",
    "#0e504b",
    "MEET THE MAKER",
    "#529a86",
    "portrait",
    1,
  ),
  preset(
    "portrait-burgundy",
    "Artist Profile",
    "Portrait",
    "#8c1c36",
    "THE CREATIVE",
    "#ca7f91",
    "portrait",
    2,
  ),
  preset(
    "portrait-sky",
    "Bright Profile",
    "Portrait",
    "#dbeffc",
    "HELLO THERE",
    "#9dcced",
    "portrait",
    3,
  ),
  preset(
    "social-red",
    "Bold Announcement",
    "Social",
    "#fff6f6",
    "BIG NEWS",
    "#bd3038",
    "social",
    0,
  ),
  preset(
    "social-teal",
    "Fresh Launch",
    "Social",
    "#e7f4f1",
    "JUST DROPPED",
    "#16887b",
    "social",
    1,
  ),
  preset(
    "social-lemon",
    "Weekend Feature",
    "Social",
    "#fff6c7",
    "WEEKEND EDIT",
    "#343c51",
    "social",
    2,
  ),
  preset(
    "social-blue",
    "Community Spotlight",
    "Social",
    "#e1ebfb",
    "IN THE SPOTLIGHT",
    "#275fc5",
    "social",
    3,
  ),
  preset(
    "thumb-yellow",
    "Creator Headline",
    "Thumbnail",
    "#fff3b0",
    "YOUR BIG\nSTORY",
    "#d3443f",
    "thumbnail",
    0,
  ),
  preset(
    "thumb-dark",
    "Dark Feature",
    "Thumbnail",
    "#17263a",
    "THE FULL\nPICTURE",
    "#f5ce59",
    "thumbnail",
    1,
  ),
  preset(
    "thumb-red",
    "Breaking Feature",
    "Thumbnail",
    "#f4e5e7",
    "WHAT\nHAPPENED?",
    "#c53342",
    "thumbnail",
    2,
  ),
  preset(
    "thumb-teal",
    "Expert Explainer",
    "Thumbnail",
    "#d2eee7",
    "LET'S\nEXPLAIN",
    "#46b2a5",
    "thumbnail",
    3,
  ),
  preset(
    "minimal-paper",
    "Clean White",
    "Minimal",
    "#ffffff",
    "THE SIMPLE THINGS",
    "#777777",
    "minimal",
    0,
  ),
  preset(
    "minimal-grey",
    "Soft Grey",
    "Minimal",
    "#edf0f1",
    "EVERYDAY ESSENTIALS",
    "#a2b0b6",
    "minimal",
    1,
  ),
  preset(
    "minimal-black",
    "Gallery Black",
    "Minimal",
    "#111111",
    "LESS, BUT BETTER",
    "#999999",
    "minimal",
    2,
  ),
  preset(
    "minimal-lilac",
    "Quiet Colour",
    "Minimal",
    "#ece8f6",
    "A FRESH PERSPECTIVE",
    "#b5abcb",
    "minimal",
    3,
  ),
];
export function templateForImage(
  template: StudioTemplate,
  current: StudioDesign,
  placement: boolean,
): StudioDesign {
  const next = structuredClone(template.design);
  next.refine = structuredClone(current.refine);
  next.overlays = next.overlays.map((layer) => ({
    ...layer,
    id: crypto.randomUUID(),
  }));
  if (!placement && current.subject.manual)
    next.subject = structuredClone(current.subject);
  return next;
}
