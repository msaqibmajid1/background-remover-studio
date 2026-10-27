import { postType } from './facebookPosts';
import type { ExportPost } from './facebookMediaExport';

export type MediaCategory = 'photo' | 'text' | 'video';
export type SortKey = 'date' | 'reactions' | 'comments' | 'shares' | 'engagement';
export function exportCategory(post: ExportPost & {type?: string}): MediaCategory {
  const type = postType(post);
  return type === 'video' ? 'video' : type === 'photo' || post.full_picture && type !== 'link' ? 'photo' : 'text';
}
export function selectExportPosts<T extends ExportPost>(posts: T[], categories: MediaCategory[], sort: SortKey, descending: boolean): T[] {
  const metric = (p: T) => {
    const reactions = p.reactions?.summary?.total_count || 0;
    const comments = p.comments?.summary?.total_count || 0;
    const shares = p.shares?.count || 0;
    return sort === 'date' ? Date.parse(p.created_time || '') || 0 : sort === 'reactions' ? reactions : sort === 'comments' ? comments : sort === 'shares' ? shares : reactions + comments + shares;
  };
  return posts.filter(p => categories.includes(exportCategory(p))).sort((a,b) => (metric(a)-metric(b)) * (descending ? -1 : 1));
}
