import JSZip from 'jszip';
import * as XLSX from 'xlsx';

export type FacebookExportFormat = 'xlsx' | 'csv' | 'json';
export type FacebookMediaProgress = {completed: number; total: number; images: number; failed: number; archives: number; percent: number; packaging: number | null};
export function serializeFacebookRows(rows: Record<string, string | number>[], format: FacebookExportFormat) {
  if (format === 'json') return JSON.stringify(rows, null, 2);
  const sheet = XLSX.utils.json_to_sheet(rows);
  if (format === 'csv') return '\ufeff' + XLSX.utils.sheet_to_csv(sheet);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Posts');
  return XLSX.write(workbook, {type: 'array', bookType: 'xlsx'});
}

type Attachment = {media_type?: string; media?: {image?: {src?: string}; source?: string}; subattachments?: {data?: Attachment[]}};
export type ExportPost = {
  id: string; message?: string; created_time?: string; permalink_url?: string;
  full_picture?: string; from?: {name?: string}; attachments?: {data?: Attachment[]};
  reactions?: {summary?: {total_count?: number}}; comments?: {summary?: {total_count?: number}};
  shares?: {count?: number};
};

export function facebookExportRows(posts: ExportPost[], url: string, start = 0) {
  return posts.map((p, i) => ({
    'Sr No': start + i + 1, 'Post ID': p.id, 'Page / Group': url, Author: p.from?.name || '',
    Text: p.message || '', Date: p.created_time || '', Link: p.permalink_url || '',
    Image: p.full_picture || p.attachments?.data?.[0]?.media?.image?.src || '',
    Video: p.attachments?.data?.[0]?.media?.source || '',
    Reactions: p.reactions?.summary?.total_count ?? '', Comments: p.comments?.summary?.total_count ?? '', Shares: p.shares?.count ?? '',
  }));
}

export function postImageUrls(post: ExportPost) {
  const urls = new Set<string>();
  const visit = (attachment: Attachment) => {
    const children = attachment.subattachments?.data;
    if (children?.length) children.forEach(visit);
    else if (attachment.media?.image?.src) urls.add(attachment.media.image.src);
  };
  post.attachments?.data?.forEach(visit);
  if (!urls.size && post.full_picture) urls.add(post.full_picture);
  return [...urls];
}

export async function exportFacebookMedia(options: {
  posts: ExportPost[]; url: string; signal: AbortSignal;
  download: (url: string) => Promise<{data: Uint8Array; extension: string}>;
  save: (data: Uint8Array, filename: string) => void | Promise<void>;
  progress: (message: string) => void;
  maxPosts?: number; maxBytes?: number;
  format?: FacebookExportFormat;
  finishRequested?: () => boolean;
  onProgress?: (progress: FacebookMediaProgress) => void;
  imagesPerZip?: number;
  requestedParts?: number;
}) {
  const {posts, url, signal, download, save, progress} = options;
  const customPartition = options.imagesPerZip || options.requestedParts;
  const maxPosts = options.maxPosts ?? (customPartition ? Infinity : 100);
  const totalUnits = posts.reduce((sum, post) => sum + Math.max(1,postImageUrls(post).length),0);
  const requestedParts = options.requestedParts ? Math.max(1,Math.min(totalUnits,Math.floor(options.requestedParts))) : 0;
  const imagesPerZip = options.imagesPerZip ? Math.max(1,Math.floor(options.imagesPerZip)) : Infinity;
  let processedUnits = 0; let plannedPart = 1; let partImages = 0;
  const partitionReached = () => requestedParts ? processedUnits >= Math.floor(plannedPart*totalUnits/requestedParts) : partImages >= imagesPerZip;
  const maxBytes = options.maxBytes ?? 200 * 1024 * 1024;
  const timestamp = Date.now();
  let zip = new JSZip();
  let rows: Record<string, string | number>[] = [];
  let bytes = 0; let part = 1; let images = 0; let failed = 0;
  let completed = 0;
  const report = (packaging: number | null = null) => options.onProgress?.({completed,total:posts.length,images,failed,archives:part-1,percent:posts.length ? Math.round(completed/posts.length*100) : 0,packaging});
  const check = () => signal.throwIfAborted();
  const flush = async () => {
    check();
    const format = options.format || 'xlsx';
    zip.file('posts.xlsx', serializeFacebookRows(rows, 'xlsx'));
    if (format !== 'xlsx') zip.file(`posts.${format}`, serializeFacebookRows(rows, format));
    const archive = await zip.generateAsync({type: 'uint8array', compression: 'STORE'}, metadata => {
      if (!signal.aborted) {progress(`Packaging ZIP ${part}: ${Math.round(metadata.percent)}%`);report(Math.round(metadata.percent));}
    });
    check();
    await save(archive, `facebook-media-${timestamp}-part-${String(part).padStart(3, '0')}.zip`);
    zip = new JSZip(); rows = []; bytes = 0; partImages = 0; part += 1;
    report();
  };
  report();
  for (let index = 0; index < posts.length; index += 1) {
    check();
    if (options.finishRequested?.()) break;
    const post = posts[index];
    const urls = postImageUrls(post);
    const files: string[] = []; const errors: string[] = [];
    let segmented = false;
    const addRow = (partial = false) => {
      rows.push({...facebookExportRows([post], url, index)[0], 'Media Files': files.join('\n'), 'Media Download': partial ? 'Partial download' : errors.length ? errors.join('\n') : urls.length ? 'Downloaded' : 'No image'});
      files.length=0;errors.length=0;segmented=true;
    };
    for (let image = 0; image < urls.length; image += 1) {
      if (options.finishRequested?.()) break;
      check(); progress(`Downloading post ${index + 1}/${posts.length}, image ${image + 1}/${urls.length}`);
      let result: {data: Uint8Array; extension: string} | undefined;
      try {
        result = await download(urls[image]);
        check();
        if (!result.data.byteLength) throw new Error('Empty image response');
      } catch (error) {
        result=undefined;
        check();
        if (options.finishRequested?.()) break;
        failed += 1;report();
        errors.push(`Image ${image + 1}: ${error instanceof Error ? error.message : 'Download failed'}`);
      }
      if (result) {
        const extension = /^(jpg|jpeg|png|webp|gif|avif|bmp|tiff)$/i.test(result.extension) ? result.extension.toLowerCase() : 'jpg';
        const filename = `images/${String(index + 1).padStart(6, '0')}_${String(image + 1).padStart(2, '0')}.${extension}`;
        if (bytes && bytes+result.data.byteLength>maxBytes) {
          if (files.length || errors.length) addRow();
          await flush();
        }
        zip.file(filename, result.data); bytes += result.data.byteLength; files.push(filename); images += 1;partImages += 1;
        report();
      }
      processedUnits += 1;
      const boundary=partitionReached();
      if (boundary || bytes>=maxBytes) {
        addRow();await flush();
        if (boundary && requestedParts) plannedPart += 1;
      }
    }
    const finishing = options.finishRequested?.();
    if (finishing && !files.length && urls.length) break;
    if (files.length || errors.length || !segmented) addRow(!!finishing && files.length < urls.length);
    if (!urls.length) processedUnits += 1;
    completed += 1;report();
    const boundary=partitionReached();
    if (rows.length && (rows.length >= maxPosts || bytes >= maxBytes || boundary || index === posts.length - 1)) {
      await flush();if(boundary && requestedParts)plannedPart += 1;
    }
    if (finishing) break;
  }
  if (rows.length) await flush();
  return {archives: part - 1, images, failed};
}
