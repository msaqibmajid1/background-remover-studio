import {describe,it,expect} from 'vitest';
import {postType,postWithinDates} from './facebookPosts';
describe('Facebook result filters',()=>{
 it('does not classify video thumbnails as photos',()=>{expect(postType({attachments:{data:[{media_type:'video'}]}})).toBe('video');expect(postType({attachments:{data:[{media_type:'album'}]}})).toBe('photo');});
 it('checks requested dates and excludes unknown dates when filtering',()=>{expect(postWithinDates({created_time:'2026-10-03T12:00:00+05:00'},'2026-10-03','2026-10-03')).toBe(true);expect(postWithinDates({created_time:'2026-10-01T12:00:00+05:00'},'2026-10-03','')).toBe(false);expect(postWithinDates({},'2026-10-03','')).toBe(false);});
});
