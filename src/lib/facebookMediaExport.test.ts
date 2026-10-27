import {describe, expect, it, vi} from 'vitest';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import {exportFacebookMedia, postImageUrls} from './facebookMediaExport';

describe('Facebook media archives', () => {
  it('saves completed images and matching rows when an incomplete download is requested mid-album', async () => {
    let finish = false;let archive: Uint8Array | undefined;const updates: number[]=[];
    const download = vi.fn(async () => {
      if (download.mock.calls.length === 2) {finish=true;throw new Error('Interrupted');}
      return {data:new Uint8Array([255,216,1]),extension:'jpg'};
    });
    const result = await exportFacebookMedia({posts:[{id:'album',message:'Album caption',attachments:{data:[{subattachments:{data:[{media:{image:{src:'one'}}},{media:{image:{src:'two'}}}]}}]}},{id:'later',full_picture:'three'}],
      url:'page',signal:new AbortController().signal,finishRequested:()=>finish,download,save:data=>{archive=data;},progress:()=>{},onProgress:p=>updates.push(p.images),
    });
    expect(result).toEqual({archives:1,images:1,failed:0});
    expect(download).toHaveBeenCalledTimes(2);
    const zip=await JSZip.loadAsync(archive!);
    expect(zip.file('images/000001_01.jpg')).not.toBeNull();expect(zip.file('images/000001_02.jpg')).toBeNull();
    const workbook=XLSX.read(await zip.file('posts.xlsx')!.async('uint8array'),{type:'array'});
    const rows=XLSX.utils.sheet_to_json<Record<string,unknown>>(workbook.Sheets.Posts);
    expect(rows).toHaveLength(1);expect(rows[0].Text).toBe('Album caption');expect(rows[0]['Media Download']).toBe('Partial download');
    expect(updates).toContain(1);
  });
  it('flushes previous completed posts when the next image is interrupted', async () => {
    let finish=false;const saved=vi.fn();
    const result=await exportFacebookMedia({posts:[{id:'a',full_picture:'one'},{id:'b',full_picture:'two'}],url:'page',signal:new AbortController().signal,
      finishRequested:()=>finish,download:async url=>{if(url==='two'){finish=true;throw new Error('Interrupted');}return {data:new Uint8Array([1]),extension:'jpg'};},save:saved,progress:()=>{},
    });
    expect(result).toEqual({archives:1,images:1,failed:0});expect(saved).toHaveBeenCalledTimes(1);
  });
  it.each(['csv','json'] as const)('includes selected %s format inside media ZIP', async format => {
    let archive: Uint8Array | undefined;
    await exportFacebookMedia({posts:[{id:'p',message:'Caption'}],url:'page',format,signal:new AbortController().signal,
      download:async()=>({data:new Uint8Array([1]),extension:'jpg'}),save:data=>{archive=data;},progress:()=>{},
    });
    const zip = await JSZip.loadAsync(archive!);
    expect(zip.file('posts.xlsx')).not.toBeNull();
    expect(await zip.file(`posts.${format}`)!.async('string')).toContain('Caption');
  });
  it('balances ten images across exactly three requested parts with matching Excel rows',async()=>{
    const saved: Uint8Array[]=[];
    await exportFacebookMedia({posts:Array.from({length:10},(_,i)=>({id:String(i),full_picture:`image${i}`})),url:'page',requestedParts:3,
      signal:new AbortController().signal,download:async()=>({data:new Uint8Array([1,2]),extension:'jpg'}),save:data=>{saved.push(data);},progress:()=>{},
    });
    expect(saved).toHaveLength(3);
    const counts=[];
    for(const data of saved){
      const zip=await JSZip.loadAsync(data);const names=Object.keys(zip.files).filter(name=>name.startsWith('images/')&&!zip.files[name].dir);counts.push(names.length);
      const workbook=XLSX.read(await zip.file('posts.xlsx')!.async('uint8array'),{type:'array'});
      const rows=XLSX.utils.sheet_to_json<Record<string,string>>(workbook.Sheets.Posts);
      expect(rows).toHaveLength(names.length);expect(rows.every(row=>!!zip.file(row['Media Files']))).toBe(true);
    }
    expect(counts).toEqual([3,3,4]);
  });
  it('splits albums by image count and retains captions in every ZIP',async()=>{
    const saved: Uint8Array[]=[];
    await exportFacebookMedia({posts:[{id:'album',message:'Album caption',attachments:{data:[{subattachments:{data:Array.from({length:7},(_,i)=>({media:{image:{src:`image${i}`}}}))}}]}}],url:'page',imagesPerZip:2,
      signal:new AbortController().signal,download:async()=>({data:new Uint8Array([1,2]),extension:'jpg'}),save:data=>{saved.push(data);},progress:()=>{},
    });
    expect(saved).toHaveLength(4);
    for(const data of saved){const zip=await JSZip.loadAsync(data);const workbook=XLSX.read(await zip.file('posts.xlsx')!.async('uint8array'),{type:'array'});const rows=XLSX.utils.sheet_to_json<Record<string,string>>(workbook.Sheets.Posts);
      expect(rows[0].Text).toBe('Album caption');expect(rows[0]['Media Files'].split('\n').every(name=>!!zip.file(name))).toBe(true);
      expect(Object.keys(zip.files).filter(name=>name.startsWith('images/')&&!zip.files[name].dir).length).toBeLessThanOrEqual(2);
    }
  });
  it('creates extra size-limited parts without losing image-to-row mapping',async()=>{
    const saved: Uint8Array[]=[];
    await exportFacebookMedia({posts:[{id:'album',attachments:{data:[{subattachments:{data:[{media:{image:{src:'one'}}},{media:{image:{src:'two'}}}]}}]}}],url:'page',requestedParts:1,maxBytes:3,
      signal:new AbortController().signal,download:async()=>({data:new Uint8Array([1,2]),extension:'jpg'}),save:data=>{saved.push(data);},progress:()=>{},
    });
    expect(saved).toHaveLength(2);
    for(const data of saved){const zip=await JSZip.loadAsync(data);const workbook=XLSX.read(await zip.file('posts.xlsx')!.async('uint8array'),{type:'array'});const rows=XLSX.utils.sheet_to_json<Record<string,string>>(workbook.Sheets.Posts);
      expect(rows).toHaveLength(1);expect(zip.file(rows[0]['Media Files'])).not.toBeNull();
    }
  });
  it('packages original bytes, captions and matching filenames in each Excel part', async () => {
    const saved: {data: Uint8Array; filename: string}[] = [];
    const images = new Uint8Array([255,216,255,1,2,3]);
    const result = await exportFacebookMedia({
      posts:[{id:'p1',message:'First caption',full_picture:'https://example.com/one.jpg'},{id:'p2',message:'Second caption',full_picture:'https://example.com/missing.jpg'},{id:'p3',message:'Third caption'}],
      url:'https://www.facebook.com/page',signal:new AbortController().signal,maxPosts:2,
      download:async url=>{if(url.includes('missing'))throw new Error('Image expired');return {data:images,extension:'jpg'};},
      save:(data,filename)=>{saved.push({data,filename});},progress:()=>{},
    });
    expect(result).toEqual({archives:2,images:1,failed:1});
    const first = await JSZip.loadAsync(saved[0].data);
    expect(await first.file('images/000001_01.jpg')!.async('uint8array')).toEqual(images);
    const workbook = XLSX.read(await first.file('posts.xlsx')!.async('uint8array'),{type:'array'});
    const rows = XLSX.utils.sheet_to_json<Record<string,unknown>>(workbook.Sheets.Posts);
    expect(rows[0].Text).toBe('First caption');expect(rows[0]['Media Files']).toBe('images/000001_01.jpg');
    expect(rows[1]['Media Download']).toContain('Image expired');
    const second = await JSZip.loadAsync(saved[1].data);
    const next = XLSX.read(await second.file('posts.xlsx')!.async('uint8array'),{type:'array'});
    expect(XLSX.utils.sheet_to_json<Record<string,unknown>>(next.Sheets.Posts)[0]['Sr No']).toBe(3);
  });
  it('includes all album photos without downloading a second cover copy', () => {
    expect(postImageUrls({id:'p',full_picture:'cover',attachments:{data:[{subattachments:{data:[{media:{image:{src:'photo1'}}},{media:{image:{src:'photo2'}}},{media:{image:{src:'photo1'}}}]}}]}})).toEqual(['photo1','photo2']);
  });
  it('cancels without publishing an incomplete ZIP',async()=>{
    const controller = new AbortController();const save=vi.fn();
    await expect(exportFacebookMedia({posts:[{id:'p',full_picture:'image'}],url:'page',signal:controller.signal,
      download:async()=>{controller.abort();return {data:new Uint8Array([1]),extension:'jpg'};},save,progress:()=>{},
    })).rejects.toThrow();
    expect(save).not.toHaveBeenCalled();
  });
  it('honours cancellation during archive packaging',async()=>{
    const controller = new AbortController();const save=vi.fn();
    await expect(exportFacebookMedia({posts:[{id:'p',full_picture:'image'}],url:'page',signal:controller.signal,
      download:async()=>({data:new Uint8Array([1]),extension:'jpg'}),save,
      progress:message=>{if(message.startsWith('Packaging'))controller.abort();},
    })).rejects.toThrow();
    expect(save).not.toHaveBeenCalled();
  });
});
