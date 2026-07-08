// Repro for I002 / A4.2-SECTIONS-02.
// Replicates the live deployed (2026-06-12) snapshot condition and shows that
// Hybrid-mode section selection returns 0 items once the snapshot ages out.
// Run: node audit/evidence/A4.2-SECTIONS-02_repro.mjs
import { readFileSync } from 'fs';
import { selectPrefetchedSectionItems } from '../../src/adapters/sectionsSnapshotFetcher.js';

const snap = JSON.parse(readFileSync(new URL('../../public/newsdata/sections_latest.json', import.meta.url), 'utf8'));

function run(label) {
  console.log(`\n[${label}] NOW=${new Date().toISOString()} fetchedAt=${new Date(snap.fetchedAt).toISOString()} ageDays=${((Date.now()-snap.fetchedAt)/86400000).toFixed(1)}`);
  for (const s of ['world','india','chennai','trichy','local']) {
    const r = selectPrefetchedSectionItems(snap, s, 15);
    console.log(`  ${s.padEnd(8)} items=${String(r.items.length).padStart(2)} stale=${r.stale} reason=${r.staleReason||'-'} discarded=${r.staleItemCount}`);
  }
}

run('CONTROL (fresh repo snapshot)');

// Age to the deployed 2026-06-12 condition.
snap.fetchedAt = 1781244728756; // 2026-06-12T06:12:08Z
for (const k of Object.keys(snap.sections)) {
  for (const it of snap.sections[k]) if (it.publishedAt) it.publishedAt -= 10*24*3600*1000;
}
run('DEPLOYED-EQUIVALENT (aged -10d)');
