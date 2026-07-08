import { describe, expect, it } from 'vitest';
import INSIGHT_POLICY from '../../config/insight_policy.json';

const H = 3_600_000;
const FRESH_MAX_AGE_MS = (INSIGHT_POLICY.freshMaxAgeHours || 8) * H;

function computeEffectiveAge(snapshot, nowMs) {
  const fileAge = nowMs - Number(snapshot.fetchedAt || 0);
  const newestStoryTs = Math.max(0, ...(snapshot.stories || []).map(s => Number(s.publishedAt || 0)));
  const storyAge = newestStoryTs > 0 ? nowMs - newestStoryTs : fileAge;
  return Math.min(fileAge, storyAge);
}

describe('insightSnapshotFreshness', () => {
  it('policy drives the FRESH_MAX_AGE_MS constant', () => {
    expect(FRESH_MAX_AGE_MS).toBe(INSIGHT_POLICY.freshMaxAgeHours * H);
  });

  it('a snapshot with old fetchedAt but a story published 20 min ago is fresh', () => {
    const nowMs = Date.now();
    const snapshot = {
      fetchedAt: nowMs - 10 * H,
      stories: [
        { publishedAt: nowMs - 20 * 60_000 },
      ],
    };
    const effectiveAge = computeEffectiveAge(snapshot, nowMs);
    expect(effectiveAge).toBeLessThan(FRESH_MAX_AGE_MS);
    expect(effectiveAge).toBeCloseTo(20 * 60_000, -3);
  });

  it('all-old snapshot is stale', () => {
    const nowMs = Date.now();
    const snapshot = {
      fetchedAt: nowMs - 10 * H,
      stories: [
        { publishedAt: nowMs - 12 * H },
        { publishedAt: nowMs - 15 * H },
      ],
    };
    const effectiveAge = computeEffectiveAge(snapshot, nowMs);
    expect(effectiveAge).toBeGreaterThan(FRESH_MAX_AGE_MS);
  });

  it('snapshot with no stories uses fileAge for staleCheck', () => {
    const nowMs = Date.now();
    const snapshot = { fetchedAt: nowMs - 2 * H, stories: [] };
    const effectiveAge = computeEffectiveAge(snapshot, nowMs);
    expect(effectiveAge).toBeCloseTo(2 * H, -3);
    expect(effectiveAge).toBeLessThan(FRESH_MAX_AGE_MS);
  });
});
