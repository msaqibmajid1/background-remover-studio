import { useEffect, useRef } from "react";
import { renderStudio } from "@/lib/backgroundStudio/render";
import { templateForImage } from "@/lib/backgroundStudio/templates";
import { fitSubject, fitOriginalSubject } from "@/lib/backgroundStudio/math";
import { AssetImage } from "./AssetImage";
import type { StudioImage, StudioTemplate } from "@/lib/backgroundStudio/types";
export function TemplatePreview({
  image,
  template,
}: {
  image?: StudioImage;
  template: StudioTemplate;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(image);
  latest.current = image;
  useEffect(() => {
    let cancelled = false,
      started = false;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || started) return;
      started = true;
      const image: StudioImage = latest.current || {
        id: `preview-${template.id}`,
        name: template.name,
        type: "image/png",
        width: template.design.width,
        height: template.design.height,
        originalKey: "",
        thumbnailKey: "",
        status: "pending",
        strokes: [],
        design: template.design,
      };
      const design = templateForImage(template, image.design, true);
      if (design.photoArea)
        design.subject = image.useOriginal
          ? fitOriginalSubject(image, design)
          : fitSubject(image, design);
      const target = {
        ...image,
        design,
      };
      void renderStudio(target, { maxEdge: 220, templateOnly: !latest.current })
        .then((result) => {
          if (!cancelled && canvas.current) {
            canvas.current.width = result.width;
            canvas.current.height = result.height;
            canvas.current.getContext("2d")!.drawImage(result, 0, 0);
          }
          result.width = result.height = 1;
        })
        .catch(() => {});
    });
    if (canvas.current) observer.observe(canvas.current);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
    // Thumbnails refresh on a new cutout, not on every canvas drag.
  }, [image?.id, image?.maskKey, image?.useOriginal, template]);
  if (!image && template.previewKey)
    return (
      <AssetImage
        assetKey={template.previewKey}
        alt={template.name}
        className="studio-checker h-full w-full object-contain"
      />
    );
  return (
    <canvas
      ref={canvas}
      className="studio-checker h-28 w-full object-contain"
      aria-label={`${template.name} template preview`}
    />
  );
}
