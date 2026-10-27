import {
  AutoProcessor,
  PreTrainedModel,
  RawImage,
  env,
  type ProgressInfo,
} from "@huggingface/transformers";
import type { RemovalMode, RemovalProgress } from "../lib/backgroundRemoval";
env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.numThreads = 1;
const MODELS = {
  general: {
    id: "Ko033/isnet-general-use-onnx",
    revision: "5349b617911fd60c619b52f32e2b593517b78df3",
    dtype: "fp16" as const,
  },
  portrait: {
    id: "Xenova/modnet",
    revision: "fa2fa546052fba4c08921230a26cc69a333fca12",
    dtype: "fp32" as const,
  },
};
let cached:
  | {
      mode: RemovalMode;
      device: "webgpu" | "wasm";
      model: PreTrainedModel;
      processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
    }
  | undefined;
async function modelFor(
  mode: RemovalMode,
  device: "webgpu" | "wasm",
  notify: (value: RemovalProgress) => void,
) {
  if (cached?.mode === mode && cached.device === device) return cached;
  if (cached) {
    await cached.model.dispose();
    cached = undefined;
  }
  const config = MODELS[mode];
  const progress_callback = (value: ProgressInfo) =>
    notify({
      stage: "Loading AI model",
      progress: "progress" in value ? value.progress : undefined,
      device,
    });
  const dtype =
    mode === "general" && device === "webgpu" ? "fp16" : config.dtype;
  const model = await PreTrainedModel.from_pretrained(config.id, {
    revision: config.revision,
    dtype,
    device,
    progress_callback,
  });
  try {
    const processor = await AutoProcessor.from_pretrained(config.id, {
      revision: config.revision,
    });
    cached = { mode, device, model, processor };
    return cached;
  } catch (error) {
    await model.dispose();
    throw error;
  }
}
self.onmessage = async ({
  data,
}: MessageEvent<{
  id: string;
  file: Blob;
  mode: RemovalMode;
  device?: "auto" | "cpu";
}>) => {
  const { id, file, mode } = data;
  const notify = (value: RemovalProgress) =>
    self.postMessage({ id, type: "progress", value });
  let bitmap: ImageBitmap | undefined;
  try {
    if (!(mode in MODELS)) throw new Error("Unknown removal mode.");
    notify({ stage: "Decoding image" });
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale)),
      height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height),
      context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    bitmap = undefined;
    const rgba = context.getImageData(0, 0, width, height).data,
      rgb = new Uint8ClampedArray(width * height * 3);
    for (let i = 0; i < width * height; i++)
      rgb.set(rgba.subarray(i * 4, i * 4 + 3), i * 3);
    const input = new RawImage(rgb, width, height, 3);
    const gpu = data.device !== "cpu" && "gpu" in navigator;
    let lastError: unknown;
    for (const device of gpu
      ? (["webgpu", "wasm"] as const)
      : (["wasm"] as const)) {
      try {
        const engine = await modelFor(mode, device, notify);
        notify({
          stage:
            device === "wasm" && gpu
              ? "Processing on CPU fallback"
              : "Removing background",
          device,
        });
        const inputs = await engine.processor(input);
        const session = engine.model.sessions.model;
        const output = await engine.model({
          [session.inputNames[0]]: inputs.pixel_values,
        });
        const tensor = output[session.outputNames[0]];
        const maskWidth = tensor.dims.at(-1)!,
          maskHeight = tensor.dims.at(-2)!;
        if (
          !maskWidth ||
          !maskHeight ||
          tensor.data.length < maskWidth * maskHeight
        )
          throw new Error("The model returned an invalid foreground mask.");
        let low = Infinity,
          high = -Infinity;
        for (let i = 0; i < maskWidth * maskHeight; i++) {
          const value = Number(tensor.data[i]);
          if (!Number.isFinite(value))
            throw new Error("The model returned invalid mask values.");
          low = Math.min(low, value);
          high = Math.max(high, value);
        }
        const mask = new Uint8ClampedArray(maskWidth * maskHeight);
        for (let i = 0; i < mask.length; i++) {
          const value = Number(tensor.data[i]);
          const alpha =
            mode === "general" && high - low > 1e-6
              ? (value - low) / (high - low)
              : value;
          mask[i] = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
        }
        self.postMessage(
          {
            id,
            type: "result",
            mask: {
              data: mask,
              width: maskWidth,
              height: maskHeight,
              device,
              model: MODELS[mode].id,
            },
          },
          { transfer: [mask.buffer] },
        );
        return;
      } catch (error) {
        lastError = error;
        if (cached) {
          await cached.model.dispose().catch(() => {});
          cached = undefined;
        }
      }
    }
    throw lastError;
  } catch (error) {
    self.postMessage({
      id,
      type: "error",
      error: `Background removal failed: ${error instanceof Error ? error.message : String(error)}. Check the model download/network and available memory; your original image is unchanged.`,
    });
  } finally {
    bitmap?.close();
  }
};
