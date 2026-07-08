import { rankByTemporalScore } from './temporalScorer.js';
import { getSettings } from '../utils/storage.js';
import { isBreakingStory } from './breakingNewsService.js';

export const TOP_STORIES_MAX_AGE_MS = 12 * 60 * 60 * 1000;
export const TOP_STORIES_LIVE_MAX_AGE_MS = 36 * 60 * 60 * 1000;

const LOW_CONFIDENCE_TIMESTAMP_SOURCES = new Set([
    'missing',
    'invalid',
    'fetch_time_fallback',
    'unknown',
]);

function storyTimestampMs(article) {
    const raw = Number(article?.publishedAt || article?.pubDate || article?.date || 0);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return raw < 10_000_000_000 ? raw * 1000 : raw;
}

function hasLowConfidenceTimestamp(article) {
    const explicit = String(article?.timestampConfidence || '').toLowerCase();
    if (explicit === 'low') return true;

    const source = String(article?.publishedAtSource || article?.timestampSource || '').toLowerCase();
    return LOW_CONFIDENCE_TIMESTAMP_SOURCES.has(source) || storyTimestampMs(article) <= 0;
}

function isLiveLikeArticle(article) {
    const text = `${article?.title || article?.headline || ''} ${article?.summary || article?.description || ''}`;
    return Boolean(
        isBreakingStory(article) ||
        /^live\b/i.test(text) ||
        /\b(live\s+blog|live\s+updates?|live\s+coverage|developing|ongoing)\b/i.test(text) ||
        String(article?.url || article?.link || '').includes('/live/')
    );
}

function isEligibleForTopStories(article, now = Date.now()) {
    const publishedAt = storyTimestampMs(article);
    if (!publishedAt) return false;
    if (hasLowConfidenceTimestamp(article)) return false;

    const maxAge = isLiveLikeArticle(article) ? TOP_STORIES_LIVE_MAX_AGE_MS : TOP_STORIES_MAX_AGE_MS;
    return now - publishedAt <= maxAge;
}

/**
 * Composes a balanced front page with diversity constraints.
 * Top Stories is a current-news surface: stale or timestamp-ambiguous rows are
 * excluded here even when deeper sections retain them for archive/history use.
 */
export function composeBalancedFeed(articles, limit = 20, maxTopicPercent = 40, maxGeoPercent = 30) {
    const settings = getSettings();
    const diversitySettings = settings?.frontPageDiversity || {};
    const effectiveTopicPercent = Number(diversitySettings.maxTopicPercent ?? maxTopicPercent);
    const effectiveGeoPercent = Number(diversitySettings.maxGeoPercent ?? maxGeoPercent);
    const selected = [];
    const topicCounts = new Map();
    const geoCounts = new Map();
    const now = Date.now();

    const currentArticles = articles.filter(article => isEligibleForTopStories(article, now));

    // Quality gate: filter out low-relevance articles before sorting.
    // 2.5 keeps breaking news while filtering celebrity filler / listicle fodder.
    // Safety: if fewer than 5 qualify, use the freshest top-scored current rows
    // instead of falling back to stale rows.
    const MIN_IMPACT = 2.5;
    const qualified  = currentArticles.filter(a => isBreakingStory(a) || (a.impactScore || 0) >= MIN_IMPACT);
    const pool       = qualified.length >= 5
        ? qualified
        : [...currentArticles].sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0)).slice(0, limit * 2);

    // Rank by temporal decay scoring (freshness + impact)
    const sorted = rankByTemporalScore(pool);

    const sectionBuckets = new Map();
    for (const article of sorted) {
        const section = article.section || 'general';
        if (!sectionBuckets.has(section)) sectionBuckets.set(section, []);
        sectionBuckets.get(section).push(article);
    }

    const sectionOrder = Array.from(sectionBuckets.keys());
    let sectionCursor = 0;

    while (selected.length < limit && sectionOrder.length > 0) {
        const section = sectionOrder[sectionCursor % sectionOrder.length];
        const bucket = sectionBuckets.get(section) || [];
        const article = bucket.shift();
        if (!article) {
            sectionBuckets.delete(section);
            sectionOrder.splice(sectionCursor % sectionOrder.length, 1);
            continue;
        }
        if (selected.length >= limit) break;

        // Extract topic and geography
        const topic = article.section || 'general';
        const geo = extractGeography(article.title, article.description);

        const topicCount = topicCounts.get(topic) || 0;
        const geoCount = geoCounts.get(geo) || 0;

        // Diversity constraints
        const maxPerTopic = Math.max(1, Math.floor(limit * (effectiveTopicPercent / 100)));
        const maxPerGeo = Math.max(1, Math.floor(limit * (effectiveGeoPercent / 100)));

        // Skip if exceeds constraints
        if (topicCount >= maxPerTopic) {
            sectionCursor += 1;
            continue;
        }

        if (geoCount >= maxPerGeo) {
            sectionCursor += 1;
            continue;
        }

        selected.push(article);
        topicCounts.set(topic, topicCount + 1);
        geoCounts.set(geo, geoCount + 1);
        sectionCursor += 1;
    }

    console.log('[Composer] Final composition:', {
        total: selected.length,
        byTopic: Object.fromEntries(topicCounts),
        byGeo: Object.fromEntries(geoCounts),
        rejectedAsStaleOrUnproven: articles.length - currentArticles.length,
    });

    // Pin breaking news to the top, but only when it passes the current-news
    // timestamp gate above. Breaking cannot resurrect stale/undated rows.
    const breaking = currentArticles
        .filter(isBreakingStory)
        .sort((a, b) =>
            (Number(b.breakingScore || 0) - Number(a.breakingScore || 0)) ||
            (Number(b.publishedAt || 0) - Number(a.publishedAt || 0)));

    if (breaking.length === 0) return selected;

    const keyOf = (a) => String(a?.id || a?.url || a?.link || a?.title || '').toLowerCase();
    const seenKeys = new Set();
    const pinned = [];
    for (const article of [...breaking, ...selected]) {
        const key = keyOf(article);
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        pinned.push(article);
        if (pinned.length >= limit) break;
    }

    return pinned;
}

/**
 * Extract primary geography from article
 */
export function extractGeography(title, description) {
    const text = `${title || ''} ${description || ''}`.toLowerCase();

    // Priority order: local > regional > national > global
    if (/chennai|madras/i.test(text)) return 'chennai';
    if (/trichy|tiruchirappalli/i.test(text)) return 'trichy';
    if (/tamil nadu|tn /i.test(text)) return 'tamil-nadu';
    if (/india|delhi|mumbai|bangalore/i.test(text)) return 'india';

    return 'global';
}

export const __frontPageComposerInternalsForTest = {
    storyTimestampMs,
    hasLowConfidenceTimestamp,
    isEligibleForTopStories,
    isLiveLikeArticle,
};
