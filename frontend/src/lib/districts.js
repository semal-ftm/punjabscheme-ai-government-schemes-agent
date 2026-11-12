// Punjab's 41 districts with the approximate latitude/longitude of each district headquarters.
// Names match backend/app/eligibility.py PUNJAB_DISTRICTS (lower-cased there).
// Used for the hexagon tile map: positions follow real geography, snapped to a hex grid.
export const DISTRICTS = [
  ["Attock", "ATK", 33.77, 72.36], ["Rawalpindi", "RWP", 33.6, 73.04], ["Murree", "MRE", 33.91, 73.39],
  ["Chakwal", "CKW", 32.93, 72.86], ["Talagang", "TLG", 32.93, 72.42], ["Jhelum", "JHL", 32.94, 73.73],
  ["Mianwali", "MWI", 32.58, 71.54], ["Khushab", "KHB", 32.3, 72.35], ["Sargodha", "SGD", 32.08, 72.67],
  ["Mandi Bahauddin", "MBD", 32.59, 73.49], ["Gujrat", "GRT", 32.57, 74.08], ["Wazirabad", "WZD", 32.44, 74.12],
  ["Sialkot", "SKT", 32.49, 74.53], ["Narowal", "NRW", 32.1, 74.87], ["Gujranwala", "GRW", 32.16, 74.19],
  ["Hafizabad", "HFD", 32.07, 73.69], ["Sheikhupura", "SKP", 31.71, 73.98], ["Lahore", "LHR", 31.55, 74.34],
  ["Nankana Sahib", "NKS", 31.45, 73.71], ["Kasur", "KSR", 31.12, 74.45], ["Chiniot", "CNT", 31.72, 72.98],
  ["Faisalabad", "FSD", 31.42, 73.08], ["Jhang", "JHG", 31.27, 72.32], ["Toba Tek Singh", "TTS", 30.97, 72.48],
  ["Bhakkar", "BKR", 31.63, 71.06], ["Layyah", "LYH", 30.96, 70.94], ["Okara", "OKR", 30.81, 73.45],
  ["Sahiwal", "SWL", 30.66, 73.11], ["Pakpattan", "PPN", 30.34, 73.39], ["Khanewal", "KWL", 30.3, 71.93],
  ["Vehari", "VHR", 30.04, 72.35], ["Multan", "MUL", 30.2, 71.47], ["Muzaffargarh", "MZG", 30.07, 71.19],
  ["Kot Addu", "KTA", 30.47, 70.97], ["Taunsa", "TNS", 30.7, 70.65], ["Dera Ghazi Khan", "DGK", 30.05, 70.64],
  ["Lodhran", "LDN", 29.54, 71.63], ["Bahawalnagar", "BWN", 29.99, 73.25], ["Bahawalpur", "BWP", 29.4, 71.68],
  ["Rajanpur", "RJP", 29.1, 70.33], ["Rahim Yar Khan", "RYK", 28.42, 70.3],
].map(([name, abbr, lat, lon]) => ({ name, abbr, lat, lon }));

/**
 * Snap every district to the nearest free cell of a pointy-top hex grid, so each one gets its own tile
 * while the overall shape still looks like Punjab.
 */
export function hexLayout(radius = 22, scale = 78) {
  const w = Math.sqrt(3) * radius;
  const h = 1.5 * radius;
  const minLon = Math.min(...DISTRICTS.map((d) => d.lon));
  const maxLat = Math.max(...DISTRICTS.map((d) => d.lat));
  const toCell = (x, y) => {
    const row = Math.round(y / h);
    const col = Math.round((x - (row % 2 ? w / 2 : 0)) / w);
    return [col, row];
  };
  const center = (col, row) => [col * w + (row % 2 ? w / 2 : 0), row * h];
  const taken = new Set();
  // Place the most crowded (northern / central) districts first, so they keep their true spots.
  const order = [...DISTRICTS].sort((a, b) => b.lat - a.lat);
  const placed = order.map((d) => {
    const x = (d.lon - minLon) * scale;
    const y = (maxLat - d.lat) * scale * 1.15;
    const [c0, r0] = toCell(x, y);
    let best = null;
    for (let ring = 0; ring < 6 && !best; ring += 1) {
      let bestDist = Infinity;
      for (let dr = -ring; dr <= ring; dr += 1)
        for (let dc = -ring; dc <= ring; dc += 1) {
          const key = `${c0 + dc},${r0 + dr}`;
          if (taken.has(key)) continue;
          const [cx, cy] = center(c0 + dc, r0 + dr);
          const dist = (cx - x) ** 2 + (cy - y) ** 2;
          if (dist < bestDist) {
            bestDist = dist;
            best = [c0 + dc, r0 + dr];
          }
        }
    }
    taken.add(`${best[0]},${best[1]}`);
    const [cx, cy] = center(best[0], best[1]);
    return { ...d, cx, cy };
  });
  const xs = placed.map((p) => p.cx);
  const ys = placed.map((p) => p.cy);
  const pad = radius + 4;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  return {
    tiles: placed.map((p) => ({ ...p, cx: p.cx - minX, cy: p.cy - minY })),
    width: Math.max(...xs) - minX + pad,
    height: Math.max(...ys) - minY + pad,
    radius,
  };
}

/** SVG points for a pointy-top hexagon. */
export function hexPoints(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}
