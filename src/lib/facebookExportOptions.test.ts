import { describe, expect, it } from 'vitest';
import { selectExportPosts, exportCategory } from './facebookExportOptions';
import { serializeFacebookRows } from './facebookMediaExport';

describe('Facebook export options', () => {
  const posts = [
    {id:'a',type:'photo',created_time:'2026-10-01',reactions:{summary:{total_count:10}},shares:{count:1}},
    {id:'b',type:'video',created_time:'2026-10-03',comments:{summary:{total_count:20}}},
    {id:'c',message:'Text only',created_time:'2026-10-02'},
  ];
  it('filters and sorts without changing preview order', () => {
    expect(selectExportPosts(posts,['photo','text','video'],'date',true).map(p=>p.id)).toEqual(['b','c','a']);
    expect(selectExportPosts(posts,['photo','video'],'engagement',false).map(p=>p.id)).toEqual(['a','b']);
    expect(selectExportPosts(posts,[],'date',true)).toEqual([]);
    expect(posts.map(p=>p.id)).toEqual(['a','b','c']);
  });
  it('groups text and link posts separately from media', () => {
    expect(exportCategory({id:'x',type:'link',full_picture:'thumbnail'})).toBe('text');
    expect(exportCategory({id:'x',attachments:{data:[{media_type:'video'}]}})).toBe('video');
  });
  it('preserves captions in CSV and JSON', () => {
    const rows=[{Text:'Hello, "world"\nNext line', 'Sr No':1}];
    expect(JSON.parse(serializeFacebookRows(rows,'json'))).toEqual(rows);
    expect(serializeFacebookRows(rows,'csv')).toContain('"Hello, ""world""\nNext line"');
  });
});
