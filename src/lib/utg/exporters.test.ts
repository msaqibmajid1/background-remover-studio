import { describe, expect, it } from "vitest";
import { buildXlsxRows } from "./exporters";
import type { UtgRow } from "./types";

describe("UTG XLSX export", () => {
  it("contains only serial, image text and description", () => {
    const rows: UtgRow[] = [{
      id: "1",
      serial: 7,
      entry: "Original entry must not be exported",
      imageText: "IMAGE TEXT",
      description: "Description text",
      status: "done",
      promptTokens: 100,
    }];

    const data = buildXlsxRows(rows);
    expect(data).toEqual([{
      "Sr. No.": 7,
      "Image Text": "IMAGE TEXT",
      Description: "Description text",
    }]);
    expect(Object.keys(data[0])).toHaveLength(3);
  });
});
