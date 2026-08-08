// Build the contact sheet used to approve downloaded candidates.
//
// This is the step that makes the whole pipeline trustworthy. An image search
// can find "an iPhone 13 Pro"; it cannot promise the one it found is Graphite
// rather than Sierra Blue. So every candidate gets looked at by a person before
// it can reach the storefront.
//
//   node src/scripts/media/buildReviewSheet.js
//   then open media-staging/review.html
//
// Tick the photos that genuinely show the named colourway, or mark the whole
// set "no good photo" to drop that variant. The page writes approvals.json for
// you; promoteMedia.js reads it.

import fs from "fs";
import path from "path";

import { STAGING, listFiles, exists } from "./mediaPaths.js";

const SWATCHES = {
  graphite: "#54524F",
  silver: "#E3E4E5",
  "prism black": "#1B1B1D",
  "prism blue": "#3C5A9A",
  "orchid grey": "#8E8A93",
  "space silver": "#C9CDD2",
  "piano black": "#0E0E10",
  "pearl white": "#F0EEEA",
  black: "#1A1A1A",
  "ink blue": "#243B55",
  "space grey": "#535150",
  "sky blue": "#9CC4DC",
  green: "#4C7A52",
  "yuzu yellow": "#E8C33B",
  "flame blue": "#2C6FBB",
  white: "#FFFFFF",
  blue: "#3B6FB6",
  sandstone: "#D8CFC0",
  "heather grey": "#A9A9A6",
  tan: "#B78B60",
  "deep navy": "#2B3A55",
  "pink citrus": "#F2A093",
  "rose gold": "#D6A08C",
};

const escape = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const run = () => {
  const indexPath = path.join(STAGING, "index.json");
  if (!exists(indexPath)) {
    console.error("No media-staging/index.json — run fetchVariantImages.js first.");
    process.exit(1);
  }

  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const sections = [];
  let rowCount = 0;
  let candidateCount = 0;

  for (const entry of index) {
    const dir = path.join(STAGING, entry.slug, entry.folder);
    const files = listFiles(dir, [".jpg", ".jpeg", ".png", ".webp"]);

    let credits = [];
    const creditsPath = path.join(dir, "candidates.json");
    if (exists(creditsPath)) {
      try {
        credits = JSON.parse(fs.readFileSync(creditsPath, "utf8"));
      } catch {
        credits = [];
      }
    }

    const creditFor = (file) => credits.find((c) => c.file === file) || {};
    const colourValue = Object.values(entry.attributes || {}).join(" ");
    const swatch = SWATCHES[colourValue.toLowerCase()] || null;

    rowCount += 1;
    candidateCount += files.length;

    const tiles = files
      .map((file) => {
        const credit = creditFor(file);
        const src = `${encodeURIComponent(entry.slug)}/${encodeURIComponent(entry.folder)}/${encodeURIComponent(file)}`;
        return `
        <label class="tile">
          <input type="checkbox" data-set="${escape(entry.slug)}|${escape(entry.folder)}" value="${escape(file)}">
          <img src="${src}" alt="${escape(file)}" loading="lazy">
          <span class="cap">${escape(file)}</span>
          <span class="meta">${escape(credit.source || "manual")} · ${escape(credit.license || "unknown licence")}</span>
          ${credit.sourceUrl ? `<a class="meta" href="${escape(credit.sourceUrl)}" target="_blank" rel="noreferrer">source</a>` : ""}
        </label>`;
      })
      .join("");

    sections.push(`
    <section class="row" id="${escape(entry.slug)}-${escape(entry.folder)}">
      <header>
        <div>
          <h2>${escape(entry.product)}</h2>
          <p class="sig">
            ${swatch ? `<span class="swatch" style="background:${escape(swatch)}"></span>` : ""}
            wanted: <strong>${escape(entry.signature)}</strong>
            <span class="path">→ ${escape(entry.slug)}/${escape(entry.folder)}/</span>
          </p>
        </div>
        <label class="drop">
          <input type="checkbox" data-drop="${escape(entry.slug)}|${escape(entry.folder)}">
          No acceptable photo — drop this variant
        </label>
      </header>
      <div class="tiles">${tiles || '<p class="empty">Nothing downloaded. Drop a file into this folder and re-run, or mark the variant as dropped.</p>'}</div>
    </section>`);
  }

  const html = `<!doctype html>
<meta charset="utf-8">
<title>NexaMart — variant photo review</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 15px/1.5 system-ui, sans-serif; margin: 0; padding: 24px 24px 120px; }
  h1 { margin: 0 0 4px; }
  .lede { color: #666; max-width: 60ch; }
  .row { border-top: 1px solid #ccc4; padding: 20px 0; }
  .row header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
  h2 { margin: 0; font-size: 17px; }
  .sig { margin: 4px 0 0; color: #666; display: flex; align-items: center; gap: 8px; }
  .swatch { width: 20px; height: 20px; border-radius: 50%; border: 1px solid #8888; display: inline-block; }
  .path { font-family: ui-monospace, monospace; font-size: 12px; opacity: .7; }
  .drop { font-size: 13px; color: #a33; display: flex; gap: 6px; align-items: center; }
  .tiles { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
  .tile { width: 220px; display: flex; flex-direction: column; gap: 4px; cursor: pointer;
          border: 2px solid transparent; border-radius: 8px; padding: 8px; }
  .tile:has(input:checked) { border-color: #2a7; background: #2a71; }
  .tile img { width: 100%; height: 200px; object-fit: contain; background: #fff; border-radius: 4px; }
  .cap { font-size: 12px; font-weight: 600; }
  .meta { font-size: 11px; color: #777; }
  .empty { color: #a33; font-size: 13px; }
  footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 24px;
           background: Canvas; border-top: 1px solid #ccc4; display: flex; gap: 12px; align-items: center; }
  button { font: inherit; padding: 8px 16px; border-radius: 6px; border: 1px solid #8888; cursor: pointer; }
  #status { color: #666; font-size: 13px; }
</style>

<h1>Variant photo review</h1>
<p class="lede">
  ${rowCount} photo set(s), ${candidateCount} candidate(s). Tick only the photos that genuinely show the
  colourway named in <strong>wanted</strong>. If none of them do, tick <em>drop this variant</em> — the
  storefront will lose that option rather than show a photo of a different colour.
  The first ticked photo in a set becomes its main image.
</p>

${sections.join("\n")}

<footer>
  <button id="save">Copy approvals JSON</button>
  <button id="download">Download approvals.json</button>
  <span id="status"></span>
</footer>

<script>
  const collect = () => {
    const out = {};
    for (const box of document.querySelectorAll('input[data-drop]:checked')) {
      const [slug, folder] = box.dataset.drop.split('|');
      out[slug] = out[slug] || {};
      out[slug][folder] = { drop: true };
    }
    for (const box of document.querySelectorAll('input[data-set]:checked')) {
      const [slug, folder] = box.dataset.set.split('|');
      out[slug] = out[slug] || {};
      if (out[slug][folder]?.drop) continue;
      out[slug][folder] = out[slug][folder] || { approve: [] };
      out[slug][folder].approve.push(box.value);
    }
    return JSON.stringify(out, null, 2);
  };

  const status = document.getElementById('status');

  document.getElementById('save').onclick = async () => {
    await navigator.clipboard.writeText(collect());
    status.textContent = 'Copied — paste into media-staging/approvals.json';
  };

  document.getElementById('download').onclick = () => {
    const blob = new Blob([collect()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'approvals.json';
    a.click();
    status.textContent = 'Saved — move it to media-staging/approvals.json';
  };
</script>
`;

  const out = path.join(STAGING, "review.html");
  fs.writeFileSync(out, html);

  console.log(`Wrote ${out}`);
  console.log(`${rowCount} photo set(s), ${candidateCount} candidate(s) to review.`);
  console.log("\nOpen it, tick the correct photos, save approvals.json into media-staging/,");
  console.log("then run: node src/scripts/media/promoteMedia.js --write");
};

run();
