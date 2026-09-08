/**
 * Generates the PWA icons as PNGs with no image dependencies.
 *
 * The mark is a falling line on a dark ground: a dropping barometer, which is
 * the single most-cited weather trigger the app tracks. Run with:
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const BG = [0x14, 0x11, 0x0f];
const INK = [0xf0, 0xa8, 0x68];

/** Distance from point p to segment ab, used to stroke lines with round caps. */
function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function render(size, scale = 4) {
  const s = size * scale;
  // Accumulate coverage at `scale`x, then box-filter down for antialiasing.
  const acc = new Float32Array(size * size * 4);

  const radius = s * 0.22;
  const strokeWidth = s * 0.085;
  // A falling trace: high on the left, dropping and levelling off on the right.
  const trace = [
    [0.2, 0.34],
    [0.38, 0.42],
    [0.52, 0.66],
    [0.7, 0.62],
    [0.82, 0.7],
  ].map(([x, y]) => [x * s, y * s]);

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      // Rounded-square mask.
      const cx = Math.max(radius - x, x - (s - radius), 0);
      const cy = Math.max(radius - y, y - (s - radius), 0);
      if (Math.hypot(cx, cy) > radius) continue;

      let color = BG;
      let onTrace = false;
      for (let i = 0; i < trace.length - 1; i++) {
        const [ax, ay] = trace[i];
        const [bx, by] = trace[i + 1];
        if (distanceToSegment(x, y, ax, ay, bx, by) <= strokeWidth / 2) {
          onTrace = true;
          break;
        }
      }
      // A dot at the end of the trace, like the current reading on a chart.
      const [ex, ey] = trace[trace.length - 1];
      if (Math.hypot(x - ex, y - ey) <= strokeWidth * 0.95) onTrace = true;
      if (onTrace) color = INK;

      const dx = Math.floor(x / scale);
      const dy = Math.floor(y / scale);
      const o = (dy * size + dx) * 4;
      acc[o] += color[0];
      acc[o + 1] += color[1];
      acc[o + 2] += color[2];
      acc[o + 3] += 255;
    }
  }

  const samples = scale * scale;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // PNG filter type "none"
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      const p = y * (size * 4 + 1) + 1 + x * 4;
      // Divide by full sample count so partially covered edge pixels fade out.
      raw[p] = Math.round(acc[o] / samples);
      raw[p + 1] = Math.round(acc[o + 1] / samples);
      raw[p + 2] = Math.round(acc[o + 2] / samples);
      raw[p + 3] = Math.round(acc[o + 3] / samples);
    }
  }
  return raw;
}

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // truecolour with alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(render(size), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const [size, file] of [
  [192, "public/icon.png"],
  [512, "public/icon-512.png"],
  [180, "public/apple-icon.png"],
  [32, "public/favicon.png"],
]) {
  writeFileSync(file, png(size));
  console.log(`wrote ${file} (${size}x${size})`);
}
