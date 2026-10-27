import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundStudio } from "./BackgroundStudio";
import {
  newDesign,
  newProject,
  type StudioImage,
  type StudioProject,
} from "@/lib/backgroundStudio/types";
import { textLayer } from "@/lib/backgroundStudio/templates";

vi.setConfig({ testTimeout: 15000 });
vi.mock("../ThemeToggle", () => ({
  ThemeToggle: () => <button>Theme</button>,
}));

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  stop: vi.fn(),
  upload: vi.fn(),
  role: vi.fn(),
  getUser: vi.fn(),
  admin: true,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: mocks.getUser }, rpc: mocks.role },
}));
vi.mock("@/lib/backgroundRemoval", () => ({
  createBackgroundMask: mocks.remove,
  stopBackgroundRemoval: mocks.stop,
}));
vi.mock("@/lib/backgroundStudio/render", () => ({
  clearStudioRasters: vi.fn(),
  renderStudio: vi.fn(async () => document.createElement("canvas")),
}));
vi.mock("@/lib/backgroundStudio/storage", () => ({
  loadStudioProject: mocks.load,
  saveStudioProject: mocks.save,
  studioAsset: vi.fn(async () => new Blob()),
  maskBlob: vi.fn(async () => new Blob()),
  canvasBlob: vi.fn(async () => new Blob()),
  putStudioAsset: vi.fn(async () => "new-mask"),
  portableStudioParts: vi.fn(),
  importStudioProject: vi.fn(),
  readStudioUpload: mocks.upload,
}));
vi.mock("./StudioCanvas", () => ({
  StudioCanvas: () => <div data-testid="studio-canvas" />,
}));
vi.mock("./AssetImage", () => ({
  AssetImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
vi.mock("./TemplatePreview", () => ({ TemplatePreview: () => <canvas /> }));
vi.mock("@/lib/backgroundStudio/downloads", () => ({
  studioDownloads: vi.fn(async () => []),
  cacheStudioDownload: vi.fn(),
  studioDownloadBlob: vi.fn(),
  removeStudioDownload: vi.fn(),
}));
const image = (index: number): StudioImage => ({
  id: String(index),
  name: `photo-${index}.jpg`,
  type: "image/jpeg",
  width: 100,
  height: 200,
  originalKey: `original-${index}`,
  thumbnailKey: `thumb-${index}`,
  maskKey: `mask-${index}`,
  status: "ready",
  strokes: [{ mode: "erase", size: 0.1, hardness: 1, points: [[0.2, 0.2]] }],
  design: {
    ...newDesign(100, 200),
    subject: { ...newDesign().subject, x: index / 100, manual: true },
  },
});
let project: StudioProject;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.admin = true;
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "studio-user" } },
    error: null,
  });
  mocks.role.mockImplementation(async () => ({
    data: mocks.admin,
    error: null,
  }));
  project = {
    ...newProject(),
    workflow: "edit",
    images: [image(1), image(2)],
    activeId: "1",
  };
  mocks.load.mockImplementation(async () => project);
  mocks.save.mockResolvedValue(undefined);
});
afterEach(cleanup);
async function open() {
  render(
    <BrowserRouter>
      <BackgroundStudio />
    </BrowserRouter>,
  );
  await screen.findByRole("button", { name: "photo-1.jpg" });
}
async function saved() {
  await waitFor(() => expect(mocks.save).toHaveBeenCalled());
  return mocks.save.mock.calls.at(-1)![0] as StudioProject;
}

describe("Background Studio workflows", () => {
  it("shows template import and delete controls only to administrators", async () => {
    project.templates = [
      {
        id: "saved-template",
        name: "Saved Test Template",
        category: "Saved",
        design: newDesign(100, 200),
      },
    ];
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Templates" }));
    expect(
      await screen.findByRole("button", { name: "Import SVG / ZIP" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(document.querySelector('input[accept=".svg,.zip"]')).not.toBeNull();

    cleanup();
    mocks.admin = false;
    render(
      <BrowserRouter>
        <BackgroundStudio />
      </BrowserRouter>,
    );
    await screen.findByRole("button", { name: "photo-1.jpg" });
    fireEvent.click(screen.getByRole("button", { name: "Templates" }));
    await waitFor(() => expect(mocks.role).toHaveBeenCalledTimes(2));
    expect(
      screen.queryByRole("button", { name: "Import SVG / ZIP" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    expect(document.querySelector('input[accept=".svg,.zip"]')).toBeNull();
  });
  it("places custom template management in step 1 for administrators", async () => {
    project.templates = [
      {
        id: "imported-template",
        name: "Imported Test Template",
        category: "Imported",
        design: newDesign(100, 200),
      },
    ];
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Template step" }));
    expect(
      await screen.findByRole("heading", { name: "Template Management" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Import SVG / ZIP" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Cinema Portraits / Glass Caption",
      }),
    ).toHaveAttribute("src", "/background-studio/cinema/2.webp?v=5");
    expect(
      screen.getByRole("button", { name: "Delete Imported Test Template" }),
    ).toBeInTheDocument();

    cleanup();
    mocks.admin = false;
    render(
      <BrowserRouter>
        <BackgroundStudio />
      </BrowserRouter>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Template step" }),
    );
    await waitFor(() => expect(mocks.role).toHaveBeenCalledTimes(2));
    expect(
      screen.queryByRole("heading", { name: "Template Management" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Delete Imported Test Template" }),
    ).toBeNull();
  });
  it("continues with original images without AI, preserves masks and brush corrections, and supports Undo", async () => {
    project.workflow = "remove";
    project.images[1].maskKey = undefined;
    project.images[1].status = "pending";
    render(
      <BrowserRouter>
        <BackgroundStudio />
      </BrowserRouter>,
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Continue with Original Images",
      }),
    );
    await screen.findByTestId("studio-canvas");
    expect(screen.getByText("2/2 ready")).toBeInTheDocument();
    expect(mocks.remove).not.toHaveBeenCalled();
    const value = await saved();
    expect(value.images.every((item) => item.useOriginal)).toBe(true);
    expect(value.images[0].maskKey).toBe("mask-1");
    expect(value.images[0].strokes).toEqual(project.images[0].strokes);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)));
    expect((await saved()).images.every((item) => !item.useOriginal)).toBe(
      true,
    );
  });
  it("selects a template before upload, carries it into each image, then removes backgrounds and opens settings", async () => {
    project = newProject();
    let number = 0;
    mocks.upload.mockImplementation(async (file: File) => ({
      ...image(++number),
      name: file.name,
      maskKey: undefined,
      status: "pending",
      strokes: [],
      design: newDesign(100, 200),
    }));
    mocks.remove.mockResolvedValue({
      data: new Uint8ClampedArray([255]),
      width: 1,
      height: 1,
      device: "wasm",
    });
    render(
      <BrowserRouter>
        <BackgroundStudio />
      </BrowserRouter>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Use Template" }),
      ).toBeEnabled(),
    );
    expect(screen.queryByRole("button", { name: "Upload Images" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Setup template category"), {
      target: { value: "Product" },
    });
    fireEvent.click(screen.getByRole("button", { name: "White Studio" }));
    fireEvent.click(screen.getByRole("button", { name: "Use Template" }));
    await screen.findByRole("button", { name: "Upload Images" });
    const input = document.querySelector(
      'input[accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif"]',
    )!;
    fireEvent.change(input, {
      target: {
        files: [
          new File(["one"], "one.jpg", { type: "image/jpeg" }),
          new File(["two"], "two.jpg", { type: "image/jpeg" }),
        ],
      },
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.queryByTestId("studio-canvas")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Backgrounds (2)" }),
    );
    await screen.findByTestId("studio-canvas");
    expect(screen.getByLabelText("Background type")).toBeEnabled();
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByText("2/2 ready")).toBeInTheDocument(),
    );
    const value = await saved();
    expect(value.workflow).toBe("edit");
    expect(value.starterTemplate?.id).toBe("studio-white");
    expect(
      value.images.every((image) => image.design.templateId === "studio-white"),
    ).toBe(true);
    expect(value.images.every((image) => image.design.width === 1080)).toBe(
      true,
    );
  });
  it("opens older populated projects in the editor without forcing the setup flow", async () => {
    delete project.workflow;
    await open();
    expect(screen.getByTestId("studio-canvas")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Choose a template" }),
    ).toBeNull();
  });
  it("provides first, previous, next, last, direct, and keyboard image navigation", async () => {
    project.images.push(image(3));
    await open();
    expect(screen.getByText("Image 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "First image" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(screen.getByText("Image 2 of 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Last image" }));
    expect(screen.getByText("Image 3 of 3")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Home" });
    expect(screen.getByText("Image 1 of 3")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "PageDown" });
    expect(screen.getByText("Image 2 of 3")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Image number"), {
      target: { value: "3" },
    });
    fireEvent.keyDown(screen.getByLabelText("Image number"), { key: "Enter" });
    expect(screen.getByText("Image 3 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Last image" })).toBeDisabled();
  });
  it("does not reset finished image placement or masks when a starter template is selected for new uploads", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Template step" }));
    fireEvent.change(screen.getByLabelText("Setup template category"), {
      target: { value: "Product" },
    });
    fireEvent.click(screen.getByRole("button", { name: "White Studio" }));
    const value = await saved();
    expect(value.starterTemplate?.id).toBe("studio-white");
    expect(value.images).toEqual(project.images);
  });
  it("restores the selected template and upload stage before any photo is added", async () => {
    project = {
      ...newProject(),
      workflow: "upload",
      starterTemplate: {
        id: "own",
        name: "Saved Starting Template",
        category: "Imported",
        design: newDesign(1080, 1350),
        previewKey: "preview",
      },
    };
    render(
      <BrowserRouter>
        <BackgroundStudio />
      </BrowserRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: "Saved Starting Template" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload Images" })).toBeEnabled();
  });
  it("applies only the checked property to all images and supports Undo/Redo", async () => {
    await open();
    fireEvent.click(screen.getAllByRole("button", { name: "design" })[1]);
    fireEvent.change(screen.getByLabelText("Background type"), {
      target: { value: "solid" },
    });
    fireEvent.change(screen.getByLabelText("Background colour"), {
      target: { value: "#b31d42" },
    });
    fireEvent.click(screen.getByRole("button", { name: "batch" }));
    fireEvent.change(screen.getByLabelText("Apply settings scope"), {
      target: { value: "all" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply Settings" }));
    const value = await saved();
    expect(value.images[1].design.background.color).toBe("#b31d42");
    expect(value.images[1].design.subject).toEqual(
      project.images[1].design.subject,
    );
    expect(value.images[1].maskKey).toBe("mask-2");
    expect(value.images[1].strokes).toEqual(project.images[1].strokes);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)));
    expect((await saved()).images[1].design.background.type).toBe(
      "transparent",
    );
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)));
    expect((await saved()).images[1].design.background.color).toBe("#b31d42");
  });
  it("batch updates matching text content and preserves each image style", async () => {
    const first = textLayer("First old", 0.1, 0.2, 0.8),
      second = textLayer("Second old", 0.1, 0.2, 0.8);
    first.templateCode = "shared-headline";
    second.templateCode = "shared-headline";
    first.color = "#ff0000";
    second.color = "#00ff00";
    project.images[0].design.overlays = [first];
    project.images[1].design.overlays = [second];
    await open();
    fireEvent.click(screen.getByRole("button", { name: "batch" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Batch Update Text Elements" }),
    );
    fireEvent.change(screen.getByPlaceholderText(/Paste your texts here/), {
      target: { value: "First new\nSecond new" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update 2 Texts" }));
    const value = await saved();
    expect(value.images.map((item) => item.design.overlays[0].text)).toEqual([
      "First new",
      "Second new",
    ]);
    expect(value.images.map((item) => item.design.overlays[0].color)).toEqual([
      "#ff0000",
      "#00ff00",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)));
    expect(
      (await saved()).images.map((item) => item.design.overlays[0].text),
    ).toEqual(["First old", "Second old"]);
  });
  it("keeps editing enabled during processing and resumes a stopped reprocess queue", async () => {
    let reject: (error: Error) => void;
    mocks.remove
      .mockImplementationOnce(
        () =>
          new Promise((_, fail) => {
            reject = fail;
          }),
      )
      .mockResolvedValue({
        data: new Uint8ClampedArray([255]),
        width: 1,
        height: 1,
        device: "wasm",
      });
    mocks.stop.mockImplementation(() =>
      reject?.(new DOMException("Stopped", "AbortError")),
    );
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Reprocess Image" }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "Next image" })).toBeEnabled();
    expect(screen.getAllByRole("button", { name: "Erase" })[0]).toBeEnabled();
    fireEvent.click(screen.getAllByRole("button", { name: "design" })[1]);
    fireEvent.change(screen.getByLabelText("Centre X (px)"), {
      target: { value: "65" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Stop Processing" }));
    fireEvent.click(screen.getByRole("button", { name: "remove" }));
    const resume = await screen.findByRole("button", {
      name: "Continue Queue (1)",
    });
    expect(resume).toBeEnabled();
    fireEvent.click(resume);
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Reprocess Image" }),
      ).toBeEnabled(),
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)));
    const value = await saved();
    expect(value.images[0].design.subject.x).toBe(0.65);
    expect(value.images[0].strokes).toEqual(project.images[0].strokes);
    expect(value.queue).toEqual([]);
  });
  it("does not overwrite stored work after failed recovery", async () => {
    mocks.load.mockRejectedValue(new Error("Storage unavailable"));
    render(
      <BrowserRouter>
        <BackgroundStudio />
      </BrowserRouter>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Autosave is paused",
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("keeps a 35-image library bounded and searches all images", async () => {
    project.images = Array.from({ length: 35 }, (_, index) => image(index + 1));
    await open();
    expect(
      screen.getAllByRole("checkbox", { name: /^Select photo-/ }),
    ).toHaveLength(30);
    fireEvent.click(
      screen.getByRole("button", { name: "Next image library page" }),
    );
    expect(
      screen.getAllByRole("checkbox", { name: /^Select photo-/ }),
    ).toHaveLength(5);
    fireEvent.change(screen.getByLabelText("Find images"), {
      target: { value: "photo-35.jpg" },
    });
    expect(
      screen.getAllByRole("checkbox", { name: /^Select photo-/ }),
    ).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "photo-35.jpg" }));
    const value = await saved();
    expect(value.activeId).toBe("35");
    expect(value.images).toHaveLength(35);
  });
});
