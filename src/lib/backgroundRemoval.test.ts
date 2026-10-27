// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    FakeWorker.instances.push(this);
  }
  emit(data: unknown) {
    this.onmessage?.({ data });
  }
}
beforeEach(() => {
  vi.resetModules();
  FakeWorker.instances = [];
  vi.stubGlobal("Worker", FakeWorker);
});
afterEach(() => vi.unstubAllGlobals());
describe("background removal worker lifecycle", () => {
  it("passes the actual image, mode and processing device to a worker", async () => {
    const api = await import("./backgroundRemoval");
    const file = new Blob(["image"]),
      progress = vi.fn();
    const job = api.createBackgroundMask(file, "portrait", progress, "cpu"),
      worker = FakeWorker.instances[0];
    const sent = worker.postMessage.mock.calls[0][0];
    expect(sent).toMatchObject({ file, mode: "portrait", device: "cpu" });
    worker.emit({ id: sent.id, type: "progress", value: { stage: "Loading" } });
    expect(progress).toHaveBeenCalledWith({ stage: "Loading" });
    const mask = { width: 1, height: 1, data: new Uint8ClampedArray([255]) };
    worker.emit({ id: sent.id, type: "result", mask });
    await expect(job).resolves.toBe(mask);
  });
  it("rejects concurrent runs and ignores stale messages", async () => {
    const api = await import("./backgroundRemoval"),
      job = api.createBackgroundMask(new Blob());
    await expect(api.createBackgroundMask(new Blob())).rejects.toThrow(
      /Another image/,
    );
    const worker = FakeWorker.instances[0],
      id = worker.postMessage.mock.calls[0][0].id;
    worker.emit({ id: "old-request", type: "result", mask: "wrong" });
    worker.emit({ id, type: "result", mask: "correct" });
    await expect(job).resolves.toBe("correct");
  });
  it("terminates processing immediately and creates a fresh worker on Continue", async () => {
    const api = await import("./backgroundRemoval"),
      job = api.createBackgroundMask(new Blob());
    const stopped = expect(job).rejects.toMatchObject({ name: "AbortError" });
    api.stopBackgroundRemoval();
    await stopped;
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
    const next = api.createBackgroundMask(new Blob()),
      worker = FakeWorker.instances[1];
    worker.emit({
      id: worker.postMessage.mock.calls[0][0].id,
      type: "result",
      mask: "new",
    });
    await expect(next).resolves.toBe("new");
  });
  it("surfaces inference errors instead of returning a fake transparent output", async () => {
    const api = await import("./backgroundRemoval"),
      job = api.createBackgroundMask(new Blob()),
      worker = FakeWorker.instances[0];
    worker.emit({
      id: worker.postMessage.mock.calls[0][0].id,
      type: "error",
      error: "Network unavailable",
    });
    await expect(job).rejects.toThrow("Network unavailable");
  });
  it("recovers after a worker crash", async () => {
    const api = await import("./backgroundRemoval"),
      job = api.createBackgroundMask(new Blob());
    FakeWorker.instances[0].onerror?.();
    await expect(job).rejects.toThrow(/worker stopped/);
    const next = api.createBackgroundMask(new Blob()),
      worker = FakeWorker.instances[1];
    worker.emit({
      id: worker.postMessage.mock.calls[0][0].id,
      type: "result",
      mask: "recovered",
    });
    await expect(next).resolves.toBe("recovered");
  });
});
