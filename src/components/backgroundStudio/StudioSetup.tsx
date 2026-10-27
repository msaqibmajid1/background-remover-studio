import { useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  LayoutTemplate,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { Button } from "../ui/button";
import { AssetImage } from "./AssetImage";
import { TemplatePreview } from "./TemplatePreview";
import { selectClass } from "./StudioControls";
import { CINEMA_TEMPLATES } from "@/lib/backgroundStudio/svgTemplates";
import { bundledTemplateForName } from "@/lib/backgroundStudio/templateBlueprints";
import { STUDIO_TEMPLATES } from "@/lib/backgroundStudio/templates";
import { studioImageReady } from "@/lib/backgroundStudio/math";
import type {
  StudioProject,
  StudioTemplate,
  StudioStep,
} from "@/lib/backgroundStudio/types";
type CinemaSource = (typeof CINEMA_TEMPLATES)[number];
export function StudioSetup({
  project,
  step,
  busy,
  restored,
  choose,
  next,
  upload,
  importTemplates,
  removeTemplate,
  canManageTemplates,
  remove,
  keepOriginals,
  useTemplateImage,
  mode,
  device,
}: {
  project: StudioProject;
  step: Exclude<StudioStep, "edit">;
  busy: boolean;
  restored: boolean;
  choose: (template?: StudioTemplate, source?: CinemaSource) => void;
  next: (step: StudioStep) => void;
  upload: (files?: File[]) => void;
  importTemplates: () => void;
  removeTemplate: (template: StudioTemplate) => void;
  canManageTemplates: boolean;
  remove: () => void;
  keepOriginals: () => void;
  useTemplateImage: () => void;
  mode: (value: "general" | "portrait") => void;
  device: (value: "auto" | "cpu") => void;
}) {
  const [category, setCategory] = useState("Imported");
  const [page, setPage] = useState(0);
  const selected = project.starterTemplate;
  const ready = project.images.filter(studioImageReady).length;
  const imported = project.templates.filter(
    (template) =>
      !CINEMA_TEMPLATES.some((item) => item.id === template.id) &&
      !bundledTemplateForName(template.name),
  );
  const templates = [...STUDIO_TEMPLATES, ...imported].filter(
    (template) => category === "All" || template.category === category,
  );
  const pageIndex = Math.min(
    page,
    Math.max(0, Math.ceil(project.images.length / 30) - 1),
  );
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-muted/20">
      {step === "template" ? (
        <div className="mx-auto max-w-[1500px] p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="mr-auto text-lg font-semibold">Choose a template</h2>
            <select
              className={`${selectClass} !w-40`}
              aria-label="Setup template category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {[
                "Imported",
                "All",
                "Product",
                "Portrait",
                "Social",
                "Thumbnail",
                "Minimal",
                "Saved",
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
          {canManageTemplates && (
            <section
              aria-labelledby="template-management-title"
              className="mb-4 flex flex-wrap items-center gap-3 rounded-md border bg-background p-3"
            >
              <h3
                id="template-management-title"
                className="mr-auto flex items-center gap-2 text-sm font-semibold"
              >
                <LayoutTemplate size={16} />
                Template Management
              </h3>
              <Button
                variant="outline"
                disabled={busy || !restored}
                onClick={importTemplates}
              >
                <Upload size={15} />
                Import SVG / ZIP
              </Button>
            </section>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            <button
              disabled={busy || !restored}
              aria-label="Blank canvas"
              aria-pressed={!selected}
              onClick={() => choose()}
              className={`overflow-hidden rounded-md border-2 bg-background text-left ${!selected ? "border-primary" : "border-transparent"}`}
            >
              <div className="studio-checker flex aspect-[4/5] items-center justify-center">
                <ImagePlus className="text-muted-foreground" size={36} />
              </div>
              <span className="flex min-h-12 items-center justify-between gap-2 border-t p-2 text-xs font-medium">
                Blank Canvas{!selected && <Check size={14} />}
              </span>
            </button>
            {(category === "Imported" || category === "All") &&
              CINEMA_TEMPLATES.map((source) => (
                <button
                  key={source.id}
                  disabled={busy || !restored}
                  aria-label={source.name}
                  aria-pressed={selected?.id === source.id}
                  onClick={() =>
                    choose(
                      project.templates.find(
                        (template) => template.id === source.id,
                      ),
                      source,
                    )
                  }
                  className={`overflow-hidden rounded-md border-2 bg-background text-left ${selected?.id === source.id ? "border-primary" : "border-transparent"}`}
                >
                  <img
                    src={`/background-studio/cinema/${source.file}.webp?v=${source.revision}`}
                    alt={source.name}
                    className="aspect-[4/5] w-full object-contain"
                    loading="lazy"
                  />
                  <span className="flex min-h-12 items-center justify-between gap-2 border-t p-2 text-xs font-medium">
                    <span>{source.name}</span>
                    {selected?.id === source.id && (
                      <Check className="shrink-0" size={14} />
                    )}
                  </span>
                </button>
              ))}
            {templates.map((template) => (
              <div
                key={template.id}
                className={`group relative overflow-hidden rounded-md border-2 bg-background ${selected?.id === template.id ? "border-primary" : "border-transparent"}`}
              >
                <button
                  className="block w-full text-left"
                  disabled={busy || !restored}
                  aria-label={template.name}
                  aria-pressed={selected?.id === template.id}
                  onClick={() => choose(template)}
                >
                  <div className="aspect-[4/5] overflow-hidden [&_canvas]:h-full">
                    <TemplatePreview template={template} />
                  </div>
                  <span className="flex min-h-12 items-center justify-between gap-2 border-t p-2 text-xs font-medium">
                    <span>{template.name}</span>
                    {selected?.id === template.id && (
                      <Check className="shrink-0" size={14} />
                    )}
                  </span>
                </button>
                {canManageTemplates &&
                  !STUDIO_TEMPLATES.some((item) => item.id === template.id) &&
                  !CINEMA_TEMPLATES.some((item) => item.id === template.id) && (
                    <Button
                      className="absolute right-2 top-2 h-8 w-8 bg-background/95 text-destructive shadow-sm"
                      size="icon"
                      variant="outline"
                      aria-label={`Delete ${template.name}`}
                      title={`Delete ${template.name}`}
                      disabled={busy || !restored}
                      onClick={() => removeTemplate(template)}
                    >
                      <Trash2 size={15} />
                    </Button>
                  )}
              </div>
            ))}
          </div>
          {selected?.outlinedText && (
            <p className="mt-4 text-xs text-muted-foreground">
              Original lettering: vector artwork. Font files are not included in
              this SVG.
            </p>
          )}
          <div className="sticky bottom-0 mt-5 flex flex-wrap items-center justify-between gap-3 border-t bg-background py-3">
            <span className="text-sm font-medium">
              {selected?.name || "Blank Canvas"}
            </span>
            <Button disabled={busy || !restored} onClick={() => next("upload")}>
              Use Template
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[1400px] gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {step === "upload" ? "Upload images" : "Choose image treatment"}
              </h2>
              <span className="text-xs text-muted-foreground">
                {project.images.length} images | {ready} ready
              </span>
            </div>
            {step === "upload" && (
              <div
                className="mb-5 flex min-h-48 flex-col items-center justify-center gap-4 rounded-md border border-dashed bg-background p-5"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  upload(Array.from(event.dataTransfer.files));
                }}
              >
                <ImagePlus size={36} className="text-primary" />
                <Button disabled={busy || !restored} onClick={() => upload()}>
                  <Upload size={16} />
                  Upload Images
                </Button>
                {selected?.sampleImage && (
                  <Button
                    variant="outline"
                    disabled={busy || !restored}
                    onClick={useTemplateImage}
                  >
                    Use Template Image
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">
                  JPG, PNG, WebP, GIF, BMP, AVIF
                </span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {project.images
                .slice(pageIndex * 30, pageIndex * 30 + 30)
                .map((image) => (
                  <div
                    key={image.id}
                    className="min-w-0 overflow-hidden rounded-md border bg-background"
                  >
                    <div className="studio-checker aspect-square">
                      <AssetImage
                        assetKey={image.thumbnailKey}
                        alt={image.name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <p
                      className="truncate border-t p-2 text-xs"
                      title={image.name}
                    >
                      {image.name}
                    </p>
                  </div>
                ))}
            </div>
            {project.images.length > 30 && (
              <div className="mt-3 flex items-center justify-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Previous upload page"
                  disabled={pageIndex === 0}
                  onClick={() => setPage(pageIndex - 1)}
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-xs">
                  {pageIndex + 1} / {Math.ceil(project.images.length / 30)}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Next upload page"
                  disabled={(pageIndex + 1) * 30 >= project.images.length}
                  onClick={() => setPage(pageIndex + 1)}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </section>
          <aside className="space-y-4 border-t pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <LayoutTemplate size={16} />
              {selected?.name || "Blank Canvas"}
            </h3>
            {selected && (
              <div className="mx-auto aspect-[4/5] max-h-[340px] overflow-hidden rounded-md border bg-background [&_canvas]:h-full">
                <TemplatePreview
                  template={selected}
                  image={step === "remove" ? project.images[0] : undefined}
                />
              </div>
            )}
            {step === "remove" && (
              <>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={busy || !project.images.length}
                  onClick={keepOriginals}
                >
                  Continue with Original Images
                  <ChevronRight size={15} />
                </Button>
                <label className="block space-y-1 text-xs">
                  AI mode
                  <select
                    aria-label="Setup AI mode"
                    className={selectClass}
                    value={project.settings.mode}
                    onChange={(event) =>
                      mode(event.target.value as "general" | "portrait")
                    }
                  >
                    <option value="general">General / Products</option>
                    <option value="portrait">Portrait / Hair</option>
                  </select>
                </label>
                <label className="block space-y-1 text-xs">
                  Processing device
                  <select
                    aria-label="Setup processing device"
                    className={selectClass}
                    value={project.settings.device}
                    onChange={(event) =>
                      device(event.target.value as "auto" | "cpu")
                    }
                  >
                    <option value="auto">Automatic / GPU if available</option>
                    <option value="cpu">CPU compatibility</option>
                  </select>
                </label>
                <Button
                  className="w-full"
                  disabled={busy || !project.images.length}
                  onClick={remove}
                >
                  <Wand2 size={15} />
                  Remove Backgrounds (
                  {
                    project.images.filter(
                      (image) => !image.maskKey || image.useOriginal,
                    ).length
                  }
                  )
                </Button>
                {ready > 0 && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => next("edit")}
                  >
                    Continue Editing ({ready})<ChevronRight size={15} />
                  </Button>
                )}
              </>
            )}
            {step === "upload" && (
              <Button
                className="w-full"
                disabled={busy || !project.images.length}
                onClick={() => next("remove")}
              >
                Continue
                <ChevronRight size={16} />
              </Button>
            )}
            <Button
              className="w-full"
              disabled={busy}
              variant="outline"
              onClick={() => next(step === "upload" ? "template" : "upload")}
            >
              <ChevronLeft size={15} />
              Back
            </Button>
          </aside>
        </div>
      )}
    </main>
  );
}
