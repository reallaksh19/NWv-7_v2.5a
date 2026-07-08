export const NEWS_CLASSES = Object.freeze([
  'news_story',
  'weather_news_story',
  'travel_news_story',
  'market_news_story',
]);

export const INSIGHT_CLASSES = Object.freeze([
  'insight_cluster',
]);

export const ACTIONABLE_CLASSES = Object.freeze([
  'upahead_event',
  'upahead_offer',
  'planner_item',
  'weather_alert',
  'travel_alert',
  'travel_deal',
  'travel_event',
  'market_event',
]);

export const UTILITY_CLASSES = Object.freeze([
  'weather_forecast',
  'market_snapshot',
]);

export const DERIVED_CLASSES = Object.freeze([
  'section_digest',
  'buzz_story',
  'tech_social_trend',
  'entertainment_trend',
  'newspaper_edition',
  'following_topic_story',
  'data_health_record',
  'refresh_status',
]);

export const KNOWN_CONTENT_CLASSES = Object.freeze([
  ...NEWS_CLASSES,
  ...INSIGHT_CLASSES,
  ...ACTIONABLE_CLASSES,
  ...UTILITY_CLASSES,
  ...DERIVED_CLASSES,
]);

const KNOWN_SET = new Set(KNOWN_CONTENT_CLASSES);

export function isKnownContentClass(value) {
  return KNOWN_SET.has(String(value || '').trim());
}

export function requireContentClass(value) {
  const contentClass = String(value || '').trim();
  if (!isKnownContentClass(contentClass)) {
    throw new Error('unknown contentClass');
  }
  return contentClass;
}

export default {
  NEWS_CLASSES,
  INSIGHT_CLASSES,
  ACTIONABLE_CLASSES,
  UTILITY_CLASSES,
  DERIVED_CLASSES,
  KNOWN_CONTENT_CLASSES,
  isKnownContentClass,
  requireContentClass,
};
