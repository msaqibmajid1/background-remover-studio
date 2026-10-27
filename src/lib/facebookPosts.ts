export function postType(post: {type?: string; attachments?: {data?: {media_type?: string}[]}}) {
  const types = post.attachments?.data?.map(item => item.media_type) || [];
  if(post.type === 'video' || types.includes('video')) return 'video';
  if(post.type === 'photo' || types.some(type => type === 'photo' || type === 'album')) return 'photo';
  return post.type || (types.includes('link') ? 'link' : 'status');
}
export function postWithinDates(post: {created_time?: string}, from: string, to: string) {
  if(!from && !to)return true;
  if(!post.created_time)return false;
  const time = Date.parse(post.created_time);
  return Number.isFinite(time) && (!from || time >= Date.parse(from+'T00:00:00')) && (!to || time <= Date.parse(to+'T23:59:59'));
}
