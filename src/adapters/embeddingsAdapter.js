/**
 * Fixed-vocabulary TF-IDF embeddings — works on static GitHub Pages.
 *
 * CRITICAL: Uses a hardcoded fixed vocabulary so every vector is ALWAYS
 * the same dimension regardless of input corpus. Dimension consistency
 * is mandatory for cosineSimilarity() which checks a.length !== b.length.
 *
 * Previous implementation produced [0,0,...,0,text.length/1000, charCode/255]
 * giving cosine similarity ≈ 0.99 for ALL pairs → dedup removed everything.
 */

const STOP_WORDS = new Set([
  'a','an','and','are','as','at','be','been','but','by','for','from',
  'has','have','he','her','his','how','i','in','is','it','its','not',
  'of','on','or','she','so','than','that','the','their','they','this',
  'to','up','was','we','were','what','when','which','who','will','with'
]);

// Hardcoded 200-term vocabulary — curated for Indian/global news domain
const DOMAIN_TOKEN_EXPANSIONS = {
  cm: ['chief', 'minister'],
  govt: ['government'],
  gov: ['government'],
  siddaramaiah: ['karnataka'],
  bengaluru: ['karnataka'],
  resigns: ['resign'],
  resigned: ['resign'],
  supports: ['support'],
  supported: ['support'],
  flights: ['flight'],
  returns: ['return'],
};

const FIXED_VOCAB = [
  'government','minister','prime','president','parliament','court','supreme',
  'election','vote','party','opposition','congress','bjp','modi','rahul',
  'economy','gdp','inflation','fiscal','deficit','budget','tax','reform',
  'market','stock','shares','sensex','nifty','trading','rally','crash',
  'bank','rbi','rate','repo','interest','loan','emi','credit','deposit',
  'rupee','dollar','euro','currency','forex','exchange','reserve',
  'oil','crude','petrol','diesel','gas','energy','power','coal','solar',
  'gold','silver','commodity','metal','price','export','import','trade',
  'company','profit','revenue','quarterly','results','earnings','growth',
  'startup','funding','valuation','ipo','listing','investor','venture',
  'technology','ai','artificial','intelligence','digital','software','data',
  'cyber','security','privacy','hack','breach','cloud','computing',
  'india','china','pakistan','usa','russia','ukraine','israel','gaza',
  'chennai','mumbai','delhi','kolkata','bengaluru','hyderabad',
  'muscat','oman','dubai','saudi','gulf','middle','east',
  'cricket','ipl','football','sports','match','final','tournament',
  'player','team','captain','coach','win','victory','defeat','score','bcci',
  'army','military','defence','border','tension','ceasefire','attack',
  'terror','security','police','arrest','investigation','crime',
  'covid','vaccine','health','hospital','disease','medicine','doctor',
  'education','university','school','student','exam','result',
  'climate','flood','cyclone','earthquake','disaster','rain','storm',
  'imd','warning','alert','rescue','relief','evacuation','shelter',
  'infrastructure','road','highway','metro','railway','airport','bridge',
  'housing','real','estate','property','construction','smart','city',
  'film','movie','actor','director','release','box','office','ott',
  'netflix','disney','bollywood','hollywood','tamil','telugu','kollywood',
  'festival','celebration','holiday','pongal','diwali','eid',
  'supreme','verdict','law','bill','act','regulation','policy',
  'un','nato','summit','bilateral','treaty','sanctions','diplomacy',
  'women','child','rights','protest','rally','demonstration',
  'petition','bail','chargesheet','fir',
  'agriculture','farmer','crop','msp','monsoon','irrigation',
  'space','isro','nasa','satellite','launch','mission','orbit',
  'dead','killed','casualties','injured','victims','accident',
  'cm','chief','siddaramaiah','karnataka','resign','resigns',
  'support','supports','tangedco','tneb','civic','corporation',
  'municipality','bandh','strike','crore','lakh','air','flight',
  'return','technical','snag'
];

function tokenize(text) {
  const baseTokens = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => (t.length > 2 || t === 'cm' || t === 'ai') && !STOP_WORDS.has(t));

  return baseTokens.flatMap(token => [
    token,
    ...(DOMAIN_TOKEN_EXPANSIONS[token] || []),
  ]);
}

// Stable, deterministic string hash (djb2-ish) for the OOV feature-hashing fallback.
function stableTokenHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export async function getEmbeddings(texts) {
  if (!texts || texts.length === 0) return [];

  const DIM = FIXED_VOCAB.length;

  return texts.map(text => {
    const tokens = tokenize(text);
    // Sublinear TF: dampens high-frequency terms
    const freq = {};
    tokens.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
    Object.keys(freq).forEach(t => { freq[t] = 1 + Math.log(freq[t]); });

    // Project onto the fixed vocabulary (dimension = FIXED_VOCAB.length).
    const vec = FIXED_VOCAB.map(term => freq[term] || 0);

    // I010 OOV fallback: a story that matches NO vocab term projects to all zeros,
    // so cosineSimilarity returns 0 against everything and it is invisible to dedup
    // and clustering (~15% of a real snapshot — disproportionately hyperlocal).
    // Give such stories a deterministic sparse vector by feature-hashing their own
    // tokens into the SAME dimensional space: distinct OOV stories get distinct
    // vectors and genuinely similar OOV stories cluster — WITHOUT the historical
    // "every vector ≈ identical" collapse (that came from length/charCode features;
    // here weights come from real per-token TF, so unrelated stories stay far apart).
    // In-vocab stories are untouched.
    const hasSignal = vec.some(v => v !== 0);
    if (!hasSignal) {
      for (const tok of Object.keys(freq)) {
        vec[stableTokenHash(tok) % DIM] += freq[tok];
      }
    }

    return vec;
  });
}
