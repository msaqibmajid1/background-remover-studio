import {describe,it,expect,vi} from 'vitest';
import {normalizeFetchSafety,waitForFetchInterval} from './facebookFetchSafety';
describe('Facebook fetch safeguards',()=>{
  it('normalizes request pacing and finite batch sizes',()=>{
    expect(normalizeFetchSafety(0,0)).toEqual({interval:2,pages:1});
    expect(normalizeFetchSafety(NaN,Infinity)).toEqual({interval:5,pages:10});
    expect(normalizeFetchSafety(999,999)).toEqual({interval:300,pages:100});
  });
  it('allows stopping during cooldown',async()=>{
    vi.useFakeTimers();
    try {
      let stopped=false;
      const waiting=waitForFetchInterval(5,()=>stopped);
      stopped=true;await vi.advanceTimersByTimeAsync(200);
      expect(await waiting).toBe(false);
    } finally {vi.useRealTimers();}
  });
});
