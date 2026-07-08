// Strongest repro for I001/I002: runs the PRODUCTION hybrid selector against the
// ACTUAL deployed GitHub Pages bytes (captured 2026-06-22), no synthetic aging.
// Run: node audit/evidence/A4.2-SECTIONS-02_repro_real.mjs
import { readFileSync } from 'fs';
import { selectPrefetchedSectionItems } from '../../src/adapters/sectionsSnapshotFetcher.js';
const snap = JSON.parse(readFileSync(new URL('./A4-deployed_sections_2026-06-12.json', import.meta.url), 'utf8'));
console.log('deployed fetchedAt', new Date(snap.fetchedAt).toISOString(), 'contentHash', snap.contentHash, 'ageDays', ((Date.now()-snap.fetchedAt)/86400000).toFixed(1));
for (const s of ['world','india','chennai','trichy','local']) {
  const r = selectPrefetchedSectionItems(snap, s, 15);
  console.log(`  ${s.padEnd(8)} items=${String(r.items.length).padStart(2)} stale=${r.stale} reason=${r.staleReason||'-'} discarded=${r.staleItemCount}`);
}
