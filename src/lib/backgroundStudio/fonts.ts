import { loadGoogleFont, registerLoadedFont } from "@/hooks/useGoogleFonts";
import { putStudioAsset, studioAsset } from "./storage";
import type { StudioProject } from "./types";
const requests = new Map<string, Promise<unknown>>();
const bundled = [
  { family: "Great Vibes", file: "GreatVibes-Regular.ttf", weight: "400" },
  { family: "Anton", file: "Anton-Regular.ttf", weight: "400" },
  { family: "Poppins", file: "Poppins-Regular.ttf", weight: "400" },
  { family: "Poppins", file: "Poppins-SemiBold.ttf", weight: "600" },
  { family: "Poppins", file: "Poppins-Bold.ttf", weight: "700" },
  { family: "Etna", file: "Etna-Free.otf", weight: "400" },
  { family: "Norwester", file: "Norwester.ttf", weight: "400" },
  { family: "Fredoka", file: "Fredoka.ttf", weight: "400" },
  { family: "Georgia Pro", file: "Georgia-Pro.ttf", weight: "400" },
];
function localFace(
  family: string,
  source: string | ArrayBuffer,
  weight = "normal",
) {
  const face = new FontFace(family, source, { weight, display: "block" });
  document.fonts.add(face);
  registerLoadedFont(family);
  return face.load();
}
export async function ensureStudioFont(
  family: string,
  weight = "normal",
  style = "normal",
) {
  if (typeof FontFace === "undefined" || !document.fonts) return;
  const local = bundled.filter((font) => font.family === family);
  if (local.length) {
    for (const font of local) {
      const key = `${family}:${font.weight}`;
      if (!requests.has(key))
        requests.set(
          key,
          localFace(
            family,
            `url(/fonts/background-studio/${font.file})`,
            font.weight,
          ).catch((error) => {
            requests.delete(key);
            throw error;
          }),
        );
      await requests.get(key);
    }
    return;
  }
  const key = `${family}:${weight}:${style}`;
  if (!requests.has(key))
    requests.set(
      key,
      (async () => {
        const stored = localStorage.getItem(`customFont_${family}`);
        if (stored && /^data:[^,]*;base64,[a-zA-Z0-9+/=\s]+$/.test(stored))
          await localFace(family, await (await fetch(stored)).arrayBuffer());
        else {
          loadGoogleFont(family);
          const link = Array.from(
            document.querySelectorAll<HTMLLinkElement>(
              'link[rel="stylesheet"]',
            ),
          ).find(
            (entry) =>
              entry.href.includes("fonts.googleapis.com") &&
              entry.href.includes(`family=${family.replace(/ /g, "+")}:`),
          );
          if (link && !link.sheet)
            await new Promise<void>((resolve, reject) => {
              const timer = setTimeout(() => {
                cleanup();
                reject(
                  new Error(
                    `Font ${family} did not load. Choose another font or reconnect.`,
                  ),
                );
              }, 15000);
              const cleanup = () => {
                clearTimeout(timer);
                link.removeEventListener("load", loaded);
                link.removeEventListener("error", failed);
              };
              const loaded = () => {
                cleanup();
                resolve();
              };
              const failed = () => {
                cleanup();
                reject(new Error(`Font ${family} could not be loaded.`));
              };
              link.addEventListener("load", loaded);
              link.addEventListener("error", failed);
            });
          await document.fonts.load(
            `${style} ${weight} 24px "${family.replace(/["\\]/g, "")}"`,
          );
        }
      })().catch((error) => {
        requests.delete(key);
        throw error;
      }),
    );
  await requests.get(key);
}
export async function restoreStudioFonts(project: StudioProject) {
  if (typeof FontFace === "undefined" || !document.fonts) return;
  for (const font of project.fonts || []) {
    await localFace(
      font.family,
      await (await studioAsset(font.assetKey)).arrayBuffer(),
    );
    requests.set(`${font.family}:normal:normal`, Promise.resolve());
  }
  const layers = [
    ...project.images.flatMap((image) => image.design.overlays),
    ...project.templates.flatMap((template) => template.design.overlays),
    ...(project.starterTemplate?.design.overlays || []),
  ];
  for (const family of new Set(
    layers
      .filter(
        (layer) =>
          layer.type === "text" &&
          bundled.some((font) => font.family === layer.font),
      )
      .map((layer) => layer.font),
  ))
    await ensureStudioFont(family);
}
export async function collectStudioFonts(
  project: StudioProject,
): Promise<StudioProject> {
  const families = new Set(
    [
      ...project.images.flatMap((image) => image.design.overlays),
      ...project.templates.flatMap((template) => template.design.overlays),
      ...(project.starterTemplate?.design.overlays || []),
    ]
      .filter((layer) => layer.type === "text")
      .map((layer) => layer.font),
  );
  const fonts = [...(project.fonts || [])];
  for (const family of families) {
    if (fonts.some((font) => font.family === family)) continue;
    const data = localStorage.getItem(`customFont_${family}`);
    if (!data || !/^data:[^,]*;base64,[a-zA-Z0-9+/=\s]+$/.test(data)) continue;
    const blob = await (await fetch(data)).blob();
    if (blob.size > 5 * 1024 * 1024)
      throw new Error(`Custom font ${family} exceeds 5 MB.`);
    fonts.push({ family, assetKey: await putStudioAsset(blob) });
  }
  return fonts.length ? { ...project, fonts } : project;
}
