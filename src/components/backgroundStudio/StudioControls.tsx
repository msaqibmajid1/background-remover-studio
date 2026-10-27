import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  ArrowDown,
  ArrowUp,
  Circle,
  Copy,
  Eye,
  EyeOff,
  FlipHorizontal2,
  FlipVertical2,
  ImagePlus,
  Layers,
  Lock,
  Maximize2,
  Square,
  Trash2,
  Type,
  Unlock,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { textLayer, shapeLayer } from "@/lib/backgroundStudio/templates";
import { fitSubject } from "@/lib/backgroundStudio/math";
import {
  alignOverlayToCanvas,
  type CanvasAlignment,
} from "@/lib/backgroundStudio/alignment";
import type {
  StudioDesign,
  StudioImage,
  StudioOverlay,
} from "@/lib/backgroundStudio/types";
export const selectClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm";
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block min-w-0 space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <Input
        aria-label={label}
        type="number"
        step={step}
        min={min}
        max={max}
        value={Math.round(value * 100) / 100}
        onChange={(event) => {
          const n = event.target.valueAsNumber;
          if (Number.isFinite(n))
            onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)));
        }}
      />
    </label>
  );
}
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 items-center justify-between gap-2 text-sm">
      <span>{label}</span>
      <input
        aria-label={label}
        type="color"
        className="h-8 w-12 cursor-pointer rounded border bg-background p-1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
export function RangeField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block space-y-2 text-xs">
      <span className="flex justify-between gap-2">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {Math.round(value * 100) / 100}
        </span>
      </span>
      <input
        aria-label={label}
        className="block h-2 w-full cursor-pointer accent-primary"
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
export function DesignControls({
  image,
  change,
  upload,
}: {
  image: StudioImage;
  change: (patch: Partial<StudioDesign>) => void;
  upload: (type: "background" | "logo") => void;
}) {
  const d = image.design;
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Canvas</h3>
        <select
          aria-label="Canvas preset"
          className={selectClass}
          value=""
          onChange={(event) => {
            if (!event.target.value) return;
            const [width, height] =
              event.target.value === "original"
                ? [image.width, image.height]
                : event.target.value.split("x").map(Number);
            change({ width, height });
          }}
        >
          <option value="">
            {d.width} x {d.height} / Custom
          </option>
          <option value="original">Original image size</option>
          <option value="1080x1080">Square 1:1</option>
          <option value="1080x1350">Portrait 4:5</option>
          <option value="1080x1920">Story 9:16</option>
          <option value="1920x1080">Landscape 16:9</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Canvas width (px)"
            value={d.width}
            min={64}
            max={16384}
            onChange={(width) => change({ width: Math.round(width) })}
          />
          <NumberField
            label="Canvas height (px)"
            value={d.height}
            min={64}
            max={16384}
            onChange={(height) => change({ height: Math.round(height) })}
          />
        </div>
      </section>
      <section className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">Background</h3>
        <select
          aria-label="Background type"
          className={selectClass}
          value={d.background.type}
          onChange={(event) =>
            change({
              background: {
                ...d.background,
                type: event.target.value as StudioDesign["background"]["type"],
              },
            })
          }
        >
          <option value="transparent">Transparent</option>
          <option value="solid">Solid colour</option>
          <option value="gradient">Gradient</option>
          <option value="image">Uploaded image</option>
          <option value="blur">Blurred original</option>
        </select>
        {d.background.type !== "transparent" && (
          <ColorField
            label="Background colour"
            value={d.background.color}
            onChange={(color) =>
              change({ background: { ...d.background, color } })
            }
          />
        )}{" "}
        {d.background.type === "gradient" && (
          <>
            <ColorField
              label="Second colour"
              value={d.background.secondary}
              onChange={(secondary) =>
                change({ background: { ...d.background, secondary } })
              }
            />
            <RangeField
              label="Gradient angle"
              value={d.background.angle}
              min={0}
              max={360}
              onChange={(angle) =>
                change({ background: { ...d.background, angle } })
              }
            />
          </>
        )}
        {d.background.type === "image" && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => upload("background")}
          >
            <ImagePlus size={15} />
            Choose Background
          </Button>
        )}
        {d.background.type === "blur" && (
          <RangeField
            label="Background blur"
            value={d.background.blur}
            max={50}
            onChange={(blur) =>
              change({ background: { ...d.background, blur } })
            }
          />
        )}
      </section>
      <section className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Subject</h3>
          <Button
            variant="outline"
            size="icon"
            title="Fit subject to canvas"
            aria-label="Fit subject"
            onClick={() => change({ subject: fitSubject(image, d) })}
          >
            <Maximize2 size={15} />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Centre X (px)"
            value={d.subject.x * d.width}
            onChange={(x) =>
              change({
                subject: { ...d.subject, x: x / d.width, manual: true },
              })
            }
          />
          <NumberField
            label="Centre Y (px)"
            value={d.subject.y * d.height}
            onChange={(y) =>
              change({
                subject: { ...d.subject, y: y / d.height, manual: true },
              })
            }
          />
          <NumberField
            label="Subject width (%)"
            min={1}
            max={1000}
            value={d.subject.width * 100}
            onChange={(width) =>
              change({
                subject: { ...d.subject, width: width / 100, manual: true },
              })
            }
          />
          <NumberField
            label="Rotation"
            min={-360}
            max={360}
            value={d.subject.rotation}
            onChange={(rotation) =>
              change({ subject: { ...d.subject, rotation, manual: true } })
            }
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={d.subject.flipX ? "secondary" : "outline"}
            size="icon"
            title="Flip horizontal"
            aria-label="Flip horizontal"
            onClick={() =>
              change({ subject: { ...d.subject, flipX: !d.subject.flipX } })
            }
          >
            <FlipHorizontal2 size={16} />
          </Button>
          <Button
            variant={d.subject.flipY ? "secondary" : "outline"}
            size="icon"
            title="Flip vertical"
            aria-label="Flip vertical"
            onClick={() =>
              change({ subject: { ...d.subject, flipY: !d.subject.flipY } })
            }
          >
            <FlipVertical2 size={16} />
          </Button>
        </div>
      </section>
      <section className="space-y-3 border-t pt-4">
        <label className="flex items-center justify-between text-sm font-semibold">
          Shadow
          <input
            aria-label="Enable shadow"
            type="checkbox"
            checked={d.shadow.enabled}
            onChange={(event) =>
              change({ shadow: { ...d.shadow, enabled: event.target.checked } })
            }
          />
        </label>
        {d.shadow.enabled && (
          <>
            <ColorField
              label="Shadow colour"
              value={d.shadow.color}
              onChange={(color) => change({ shadow: { ...d.shadow, color } })}
            />
            <RangeField
              label="Shadow opacity (%)"
              value={d.shadow.opacity * 100}
              onChange={(opacity) =>
                change({ shadow: { ...d.shadow, opacity: opacity / 100 } })
              }
            />
            <RangeField
              label="Shadow blur"
              value={d.shadow.blur}
              max={150}
              onChange={(blur) => change({ shadow: { ...d.shadow, blur } })}
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Shadow X"
                value={d.shadow.x}
                onChange={(x) => change({ shadow: { ...d.shadow, x } })}
              />
              <NumberField
                label="Shadow Y"
                value={d.shadow.y}
                onChange={(y) => change({ shadow: { ...d.shadow, y } })}
              />
            </div>
          </>
        )}
      </section>
      <section className="space-y-3 border-t pt-4">
        <label className="flex items-center justify-between text-sm font-semibold">
          Outline
          <input
            aria-label="Enable outline"
            type="checkbox"
            checked={d.outline.enabled}
            onChange={(event) =>
              change({
                outline: { ...d.outline, enabled: event.target.checked },
              })
            }
          />
        </label>
        {d.outline.enabled && (
          <>
            <ColorField
              label="Outline colour"
              value={d.outline.color}
              onChange={(color) => change({ outline: { ...d.outline, color } })}
            />
            <RangeField
              label="Outline width (px)"
              value={d.outline.width}
              max={100}
              onChange={(width) => change({ outline: { ...d.outline, width } })}
            />
          </>
        )}
      </section>
    </div>
  );
}
export function LayerControls({
  image,
  selected,
  select,
  change,
  upload,
  replace,
  applyElementToAll,
  textControls,
}: {
  image: StudioImage;
  selected: string;
  select: (id: string) => void;
  change: (patch: Partial<StudioDesign>) => void;
  upload: () => void;
  replace?: (id: string) => void;
  applyElementToAll?: (id: string) => void;
  textControls?: React.ReactNode;
}) {
  const d = image.design,
    layer = d.overlays.find((item) => item.id === selected);
  const add = (value: StudioOverlay) => {
    if (d.overlays.length >= 200) return;
    change({ overlays: [...d.overlays, value] });
    select(value.id);
  };
  const patch = (value: Partial<StudioOverlay>) =>
    change({
      overlays: d.overlays.map((item) =>
        item.id === selected ? { ...item, ...value } : item,
      ),
    });
  const shift = (delta: number) => {
    const list = [...d.overlays],
      index = list.findIndex((item) => item.id === selected),
      next = index + delta;
    if (index < 0 || next < 0 || next >= list.length) return;
    [list[index], list[next]] = [list[next], list[index]];
    change({ overlays: list });
  };
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          size="icon"
          variant="outline"
          aria-label="Add text"
          title="Add text"
          onClick={() => add(textLayer())}
        >
          <Type size={16} />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Add logo"
          title="Add logo"
          onClick={upload}
        >
          <ImagePlus size={16} />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Add rectangle"
          title="Add rectangle"
          onClick={() =>
            add(shapeLayer("rectangle", 0.1, 0.1, 0.3, 0.2, "#d8e5ed"))
          }
        >
          <Square size={16} />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Add circle"
          title="Add circle"
          onClick={() =>
            add(shapeLayer("circle", 0.1, 0.1, 0.25, 0.25, "#d8e5ed"))
          }
        >
          <Circle size={16} />
        </Button>
      </div>
      <div className="max-h-52 space-y-1 overflow-auto">
        <button
          className={`flex w-full items-center gap-2 rounded p-2 text-left text-sm ${selected === "subject" ? "bg-accent" : ""}`}
          onClick={() => select("subject")}
        >
          <Layers size={14} />
          Subject
        </button>
        {[...d.overlays].reverse().map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-1 rounded p-1 ${selected === item.id ? "bg-accent" : ""}`}
          >
            <button
              className="min-w-0 flex-1 truncate p-1 text-left text-sm"
              onClick={() => select(item.id)}
            >
              {item.name ||
                (item.type === "text" ? item.text || "Empty text" : item.type)}
            </button>
            <button
              className="p-1"
              title={item.visible ? "Hide layer" : "Show layer"}
              aria-label={`${item.visible ? "Hide" : "Show"} ${item.id}`}
              onClick={() =>
                change({
                  overlays: d.overlays.map((value) =>
                    value.id === item.id
                      ? { ...value, visible: !value.visible }
                      : value,
                  ),
                })
              }
            >
              {item.visible ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
            <button
              className="p-1"
              title={item.locked ? "Unlock layer" : "Lock layer"}
              aria-label={`${item.locked ? "Unlock" : "Lock"} ${item.id}`}
              onClick={() =>
                change({
                  overlays: d.overlays.map((value) =>
                    value.id === item.id
                      ? { ...value, locked: !value.locked }
                      : value,
                  ),
                })
              }
            >
              {item.locked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>
          </div>
        ))}
      </div>
      {layer?.type === "text" && textControls
        ? textControls
        : layer && (
            <fieldset
              disabled={layer.locked}
              className="space-y-3 border-t pt-4"
            >
              {applyElementToAll && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  title="Apply this element's settings to matching elements in all images"
                  onClick={() => applyElementToAll(layer.id)}
                >
                  <Copy size={15} />
                  Apply current element to all images
                </Button>
              )}
              {layer.type === "logo" && replace && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => replace(layer.id)}
                >
                  <ImagePlus size={15} />
                  Replace Image
                </Button>
              )}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Align element to canvas
                </p>
                <div className="grid grid-cols-6 gap-1">
                  {(
                    [
                      ["left", "Align element left", AlignLeft],
                      [
                        "horizontal-center",
                        "Centre element horizontally",
                        AlignCenterHorizontal,
                      ],
                      ["right", "Align element right", AlignRight],
                      ["top", "Align element top", AlignStartVertical],
                      [
                        "vertical-center",
                        "Centre element vertically",
                        AlignCenterVertical,
                      ],
                      ["bottom", "Align element bottom", AlignEndVertical],
                    ] as const
                  ).map(([alignment, label, Icon]) => (
                    <Button
                      key={alignment}
                      variant="outline"
                      size="icon"
                      title={label}
                      aria-label={label}
                      onClick={() =>
                        patch(
                          alignOverlayToCanvas(
                            layer,
                            alignment as CanvasAlignment,
                          ),
                        )
                      }
                    >
                      <Icon size={14} />
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  title="Move layer up"
                  aria-label="Move layer up"
                  onClick={() => shift(1)}
                >
                  <ArrowUp size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  title="Move layer down"
                  aria-label="Move layer down"
                  onClick={() => shift(-1)}
                >
                  <ArrowDown size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  title="Duplicate layer"
                  aria-label="Duplicate layer"
                  onClick={() =>
                    add({
                      ...layer,
                      id: crypto.randomUUID(),
                      templateCode: crypto.randomUUID(),
                      x: layer.x + 0.03,
                      y: layer.y + 0.03,
                    })
                  }
                >
                  <Copy size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  title="Delete layer"
                  aria-label="Delete layer"
                  onClick={() => {
                    change({
                      overlays: d.overlays.filter(
                        (item) => item.id !== selected,
                      ),
                    });
                    select("subject");
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
              {layer.type === "text" && (
                <>
                  <Textarea
                    id="studio-layer-text"
                    maxLength={10000}
                    aria-label="Layer text"
                    rows={3}
                    value={layer.text}
                    onChange={(event) => patch({ text: event.target.value })}
                  />
                  <select
                    className={selectClass}
                    aria-label="Font family"
                    value={layer.font}
                    onChange={(event) =>
                      patch({
                        font: event.target.value as StudioOverlay["font"],
                      })
                    }
                  >
                    {["Arial", "Georgia", "Verdana", "Impact"].map((font) => (
                      <option key={font}>{font}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField
                      label="Font size"
                      value={layer.fontSize}
                      min={5}
                      max={1000}
                      onChange={(fontSize) => patch({ fontSize })}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        aria-label="Bold text"
                        checked={layer.bold}
                        onChange={(event) =>
                          patch({ bold: event.target.checked })
                        }
                      />
                      Bold
                    </label>
                  </div>
                  <div className="flex gap-2">
                    {(["left", "center", "right"] as const).map(
                      (align, index) => {
                        const Icon = [AlignLeft, AlignCenter, AlignRight][
                          index
                        ];
                        return (
                          <Button
                            key={align}
                            size="icon"
                            variant={
                              layer.align === align ? "secondary" : "outline"
                            }
                            title={`Align ${align}`}
                            aria-label={`Align text ${align}`}
                            onClick={() => patch({ align })}
                          >
                            <Icon size={14} />
                          </Button>
                        );
                      },
                    )}
                  </div>
                </>
              )}
              {layer.type !== "logo" && (
                <ColorField
                  label="Layer colour"
                  value={layer.color}
                  onChange={(color) => patch({ color })}
                />
              )}
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Layer X (px)"
                  value={layer.x * d.width}
                  onChange={(x) => patch({ x: x / d.width })}
                />
                <NumberField
                  label="Layer Y (px)"
                  value={layer.y * d.height}
                  onChange={(y) => patch({ y: y / d.height })}
                />
                <NumberField
                  label="Layer width (px)"
                  value={layer.width * d.width}
                  min={1}
                  max={d.width * 4}
                  onChange={(width) => patch({ width: width / d.width })}
                />
                <NumberField
                  label="Layer height (px)"
                  value={layer.height * d.height}
                  min={1}
                  max={d.height * 4}
                  onChange={(height) => patch({ height: height / d.height })}
                />
              </div>
              <NumberField
                label="Layer rotation"
                value={layer.rotation}
                min={-360}
                max={360}
                onChange={(rotation) => patch({ rotation })}
              />
              <RangeField
                label="Layer opacity (%)"
                value={layer.opacity * 100}
                onChange={(opacity) => patch({ opacity: opacity / 100 })}
              />
            </fieldset>
          )}
    </div>
  );
}
