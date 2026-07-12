// Injects month labels along the top of a Platane/snk contribution-grid SVG.
// snk has no native month labels; we compute them from the grid geometry
// (53 week-columns, 16px step) and the trailing-year date window.
import { readFileSync, writeFileSync } from "node:fs";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

for (const file of process.argv.slice(2)) {
  let svg;
  try {
    svg = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  // every week column is a <rect class="c…"> — collect their unique x positions
  const rects = svg.match(/<rect[^>]*class="c[^"]*"[^>]*>/g) || [];
  const xs = rects
    .map((r) => {
      const m = r.match(/x="(\d+)"/);
      return m ? Number(m[1]) : null;
    })
    .filter((v) => v !== null);
  const cols = [...new Set(xs)].sort((a, b) => a - b);
  if (cols.length < 10) {
    console.log("no grid found, skipping", file);
    continue;
  }

  // last column = the week containing today; step back 7 days per column
  const today = new Date();
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - today.getDay());
  lastSunday.setHours(0, 0, 0, 0);

  const labels = [];
  let prevMonth = -1;
  for (let c = 0; c < cols.length; c++) {
    const d = new Date(lastSunday);
    d.setDate(lastSunday.getDate() - (cols.length - 1 - c) * 7);
    const m = d.getMonth();
    if (m !== prevMonth) {
      labels.push({ x: cols[c], m });
      prevMonth = m;
    }
  }
  // avoid crowded labels at a window edge
  const kept = labels.filter((l, i) => i === 0 || l.x - labels[i - 1].x >= 22);

  const color = /dark/i.test(file) ? "#8b949e" : "#57606a";
  const texts = kept
    .map(
      (l) =>
        `<text x="${l.x}" y="-21" fill="${color}" font-family="'Segoe UI',Helvetica,Arial,sans-serif" font-size="9">${MONTHS[l.m]}</text>`,
    )
    .join("");

  svg = svg.replace("</svg>", `<g>${texts}</g></svg>`);
  writeFileSync(file, svg);
  console.log(`added ${kept.length} month labels to ${file}`);
}
