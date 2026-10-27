// @vitest-environment node
import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import {
  cacheStudioDownload,
  studioDownloadBlob,
  studioDownloads,
  removeStudioDownload,
  type StudioDownload,
} from "./downloads";
it("retains every ZIP part for explicit re-download and removes only the selected cached file", async () => {
  const first: StudioDownload = {
      id: "part-1",
      name: "part-001.zip",
      size: 3,
      count: 2,
      kind: "images",
      createdAt: 1,
    },
    second = { ...first, id: "part-2", name: "part-002.zip", createdAt: 2 };
  await cacheStudioDownload(first, new Blob(["one"]));
  await cacheStudioDownload(second, new Blob(["two"]));
  expect((await studioDownloads()).map((part) => part.name)).toEqual([
    "part-002.zip",
    "part-001.zip",
  ]);
  expect(await (await studioDownloadBlob(second.id)).text()).toBe("two");
  await removeStudioDownload(first.id);
  await expect(studioDownloadBlob(first.id)).rejects.toThrow(/no longer/);
  expect(await (await studioDownloadBlob(second.id)).text()).toBe("two");
});
