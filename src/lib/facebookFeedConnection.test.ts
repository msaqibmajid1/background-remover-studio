import {describe, expect, it, vi} from 'vitest';
import {connectFacebookFeed} from './facebookFeedConnection';

describe('Facebook feed target connection', () => {
  const source = {url: 'https://www.facebook.com/britishcinema', mode: 'page', targetId: '100050222420695'};
  it('resolves the URL even when a stale profile ID is saved', async () => {
    const result = {sessionId: 'session', target: {id: '260977384008351', name: 'British Cinema'}};
    const request = vi.fn().mockResolvedValue(result);
    expect(await connectFacebookFeed(request, source)).toEqual(result);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('FACEBOOK_FEED_PREPARE', {...source, targetId: ''});
  });
  it('never falls back to a stale saved target when the new URL cannot resolve', async () => {
    const request = vi.fn().mockRejectedValue(new Error('Page numeric ID unavailable.'));
    await expect(connectFacebookFeed(request, source)).rejects.toThrow('numeric ID unavailable');
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('FACEBOOK_FEED_PREPARE', {...source,targetId:''});
  });
  it('does not retry login failures or mask the error', async () => {
    const request = vi.fn().mockRejectedValue(new Error('Log in to Facebook in this browser first'));
    await expect(connectFacebookFeed(request, source)).rejects.toThrow('Log in to Facebook');
    expect(request).toHaveBeenCalledTimes(1);
  });
});
