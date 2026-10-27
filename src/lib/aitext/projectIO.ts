import { supabase } from "@/integrations/supabase/client";
import { GenSettings } from "./genSettings";
import { ProviderConfig } from "./providers";

export type ProjectFile = {
  version: 1;
  exported_at: string;
  settings: GenSettings;
  providers: Array<Omit<ProviderConfig, "apiKey"> & { apiKey?: never }>;
  activeProviderName: string | null;
  inputs: Array<{ serial_no: number | null; raw_text: string; status: string }>;
  outputs: Array<{
    serial_no: number | null;
    raw_text: string;
    title: string | null;
    image_text: string | null;
    detail_description: string | null;
    content_type: string | null;
  }>;
};

export async function exportProject(
  settings: GenSettings,
  providers: ProviderConfig[],
  activeProviderId: string | null,
): Promise<ProjectFile> {
  const { data: inputs } = await supabase
    .from("aitext_inputs")
    .select("id, serial_no, raw_text, status")
    .order("serial_no", { ascending: true, nullsFirst: false });

  const { data: outputs } = await supabase
    .from("aitext_outputs")
    .select("input_id, title, image_text, detail_description, content_type, is_current")
    .eq("is_current", true);

  const outById = new Map<string, any>();
  (outputs || []).forEach((o: any) => outById.set(o.input_id, o));

  const active = providers.find(p => p.id === activeProviderId) || null;

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    settings,
    providers: providers.map(({ apiKey, ...rest }) => rest as any),
    activeProviderName: active?.name || null,
    inputs: (inputs || []).map((r: any) => ({
      serial_no: r.serial_no ?? null,
      raw_text: r.raw_text,
      status: r.status,
    })),
    outputs: (inputs || []).map((r: any) => {
      const o = outById.get(r.id);
      return {
        serial_no: r.serial_no ?? null,
        raw_text: r.raw_text,
        title: o?.title || null,
        image_text: o?.image_text || null,
        detail_description: o?.detail_description || null,
        content_type: o?.content_type || null,
      };
    }),
  };
}

export function downloadProject(p: ProjectFile) {
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `project_${new Date(p.exported_at).getTime()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProject(file: File): Promise<ProjectFile> {
  const text = await file.text();
  const p = JSON.parse(text) as ProjectFile;
  if (!p || p.version !== 1) throw new Error("Unsupported project file version.");
  return p;
}

/** Wipes inputs/outputs and re-inserts from project. Returns inserted input count. */
export async function applyProjectToDatabase(p: ProjectFile): Promise<number> {
  await supabase.from("aitext_outputs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("aitext_inputs").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  if (!p.inputs.length) return 0;

  // Insert inputs and capture their new IDs (matched back by serial_no + raw_text).
  const inputRows = p.inputs.map(r => ({
    raw_text: r.raw_text,
    serial_no: r.serial_no,
    status: r.status === "processing" ? "pending" : r.status,
  }));
  const { data: inserted, error } = await supabase
    .from("aitext_inputs")
    .insert(inputRows)
    .select("id, serial_no, raw_text");
  if (error) throw error;

  // Build a key → new id map.
  const keyToId = new Map<string, string>();
  (inserted || []).forEach((r: any) => {
    keyToId.set(`${r.serial_no}|${r.raw_text}`, r.id);
  });

  const outRows = p.outputs
    .map(o => {
      const id = keyToId.get(`${o.serial_no}|${o.raw_text}`);
      if (!id) return null;
      if (!o.image_text && !o.detail_description) return null;
      return {
        input_id: id,
        title: o.title,
        image_text: o.image_text,
        detail_description: o.detail_description,
        content_type: o.content_type,
        version: 1,
        is_current: true,
        original_data: { raw: o.raw_text },
      };
    })
    .filter(Boolean) as any[];

  if (outRows.length) {
    await supabase.from("aitext_outputs").insert(outRows);
  }
  return inputRows.length;
}