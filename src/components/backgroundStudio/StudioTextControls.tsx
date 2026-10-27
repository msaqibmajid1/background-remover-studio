import { useEffect, useRef, useState } from "react";
import { Minus, Palette } from "lucide-react";
import { ElementPropertiesPanel } from "../editor/ElementPropertiesPanel";
import { ApplyStyleToAllDialog } from "../editor/ApplyStyleToAllDialog";
import { Button } from "@/components/ui/button";
import type { TextElement } from "@/types/editor";
import type { StudioImage, StudioOverlay } from "@/lib/backgroundStudio/types";
import {
  ALL_TEXT_PROPERTIES,
  resolvedStudioText,
  studioTextElement,
  textOverlay,
} from "@/lib/backgroundStudio/text";
import { studioAsset } from "@/lib/backgroundStudio/storage";

export function StudioTextControls({
  image,
  layer,
  totalImages,
  change,
  apply,
  batchUpdate,
  select,
}: {
  image: StudioImage;
  layer: StudioOverlay;
  totalImages: number;
  change: (image: StudioImage, before?: StudioImage) => void;
  apply: (id: string, properties: string[]) => void;
  batchUpdate: () => void;
  select: (id: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [background, setBackground] = useState("");
  const latest = useRef(image),
    first = useRef<StudioImage>();
  latest.current = image;
  useEffect(() => {
    let url = "",
      cancelled = false;
    void studioAsset(image.originalKey)
      .then((blob) => {
        if (!cancelled) {
          url = URL.createObjectURL(blob);
          setBackground(url);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [image.originalKey]);
  useEffect(
    () => () => {
      if (first.current) {
        change(latest.current, first.current);
        first.current = undefined;
      }
    },
    [change],
  );
  const update = (value: TextElement, preview = false) => {
    const source = latest.current,
      old = source.design.overlays.find((item) => item.id === layer.id);
    if (!old || old.locked) return;
    if (preview && !first.current) first.current = source;
    const next = textOverlay(
      value,
      old,
      source.design,
      old.text !== value.content,
    );
    change(
      {
        ...source,
        design: {
          ...source.design,
          overlays: source.design.overlays.map((item) =>
            item.id === old.id ? next : item,
          ),
        },
      },
      preview ? undefined : first.current || source,
    );
    if (!preview) first.current = undefined;
  };
  const remove = () => {
    change(
      {
        ...image,
        design: {
          ...image.design,
          overlays: image.design.overlays.filter(
            (item) => item.id !== layer.id,
          ),
        },
      },
      image,
    );
    select("subject");
  };
  const shift = (where: number | "first" | "last") => {
    const list = [...image.design.overlays],
      index = list.findIndex((item) => item.id === layer.id);
    const position =
      where === "first"
        ? 0
        : where === "last"
          ? list.length - 1
          : Math.max(0, Math.min(list.length - 1, index + where));
    const [value] = list.splice(index, 1);
    list.splice(position, 0, value);
    change({ ...image, design: { ...image.design, overlays: list } }, image);
  };
  const element = resolvedStudioText(studioTextElement(layer, image.design));
  const metalRockText = layer.templateCode?.startsWith("metal-rock:");
  const applyMetalRockColors = () => {
    const palette: Record<string, readonly [string, string]> =
      layer.name === "Brand Label"
        ? {
            METAL: ["#5de0e6", "#004aad"],
            ROCK: ["#5de0e6", "#004aad"],
          }
        : {
            RECEIVES: ["#5de0e6", "#004aad"],
            PROUD: ["#5de0e6", "#004aad"],
            KNIGHTHOOD: ["#5de0e6", "#004aad"],
            AT: ["#5de0e6", "#004aad"],
            WINDSOR: ["#5de0e6", "#004aad"],
          };
    const wordStyles = element.content
      .split(/\s+/)
      .filter(Boolean)
      .flatMap((word, wordIndex) => {
        const colors = palette[word.toUpperCase()];
        return colors
          ? [{
              wordIndex,
              color: colors[0],
              colorType: "gradient" as const,
              gradientStartColor: colors[0],
              gradientEndColor: colors[1],
              gradientDirection: "horizontal" as const,
            }]
          : [];
      });
    update({
      ...element,
      wordStyles,
      wordStylesEnabled: wordStyles.length > 0,
      wordStyleRules: undefined,
    });
  };
  const useSingleColor = () =>
    update({
      ...element,
      wordStyles: [],
      wordStylesEnabled: false,
      wordStyleRules: undefined,
    });
  return (
    <fieldset disabled={layer.locked} className="min-w-0">
      {metalRockText && (
        <div className="mb-3 space-y-2 rounded-md border p-3">
          <p className="text-xs font-semibold">Metal Rock color style</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={applyMetalRockColors}
            >
              <Palette size={14} />
              Template colors
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={useSingleColor}
            >
              <Minus size={14} />
              Single color
            </Button>
          </div>
        </div>
      )}
      <ElementPropertiesPanel
        element={element}
        onUpdate={(value) => value.type === "text" && update(value)}
        onUpdatePreview={(value) =>
          value.type === "text" && update(value, true)
        }
        onDelete={remove}
        onBringForward={() => shift(1)}
        onSendBackward={() => shift(-1)}
        onBringToFront={() => shift("last")}
        onSendToBack={() => shift("first")}
        canApplyToAll={totalImages > 1}
        hasMultipleImages={totalImages > 1}
        onApplyToAll={() => apply(layer.id, ALL_TEXT_PROPERTIES)}
        onApplyStyleToAll={() => setOpen(true)}
        onBatchUpdateText={batchUpdate}
        canvasWidth={image.design.width}
        canvasHeight={image.design.height}
        backgroundImageSrc={background || null}
      />
      <ApplyStyleToAllDialog
        open={open}
        onOpenChange={setOpen}
        currentElement={element}
        allElements={image.design.overlays
          .filter((item) => item.type === "text")
          .map((item) => studioTextElement(item, image.design))}
        totalImages={totalImages}
        onApply={apply}
      />
    </fieldset>
  );
}
