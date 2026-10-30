import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./iso-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "public", "assets");

const WIDTH = 640;
const HEIGHT = 360;
const M = 7;

const LANE = 24;
const ROAD_FROM = -2;
const PLATE_H = 12;
const FOOT_H = 5;

const PAD = { x: -38, y: -12, w: 26, d: 24, r: 3 };
const PAD_H = 5;
const POST = [-25, 0];
const HOUSING = { x: -31, y: -9, w: 28, d: 18, r: 2.5 };
const HOUSING_Z = 20;
const HOUSING_TOP = 34;
const LENS = { x: -3, y: -6.5, w: 3, d: 13, r: 1.2 };
const LENS_Z = 27.5;
const LED = [-25, 5];

const CAR_LEN = 30;
const GAP_MIN = 3;
const GAP_MAX = 36;
const NEIGHBOUR_GAP = 15;
const STOP = { x: ROAD_FROM + GAP_MAX * M + CAR_LEN + 4, y: -9, w: 5, d: 18, r: 1.2 };
const ROAD_TO = STOP.x + 7;
const PLATE = { x: -48, y: -28, w: ROAD_TO + 8 + 48, d: 84, r: 8 };
const ECU = { x: -44, y: 17, w: 32, d: 22, r: 2.5 };
const ECU_H = 9;
const PORT = { x: -27, y: ECU.y + 3, w: 4, d: 4, r: 0.8 };
const PORT_AT = [PORT.x + 2, PORT.y + 2, ECU_H + 2.4];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(HOUSING, HOUSING_TOP, HOUSING_TOP + 2)],
  WIDTH,
  HEIGHT,
  { pad: 18, azimuth: 50 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const face = (points) => k.pathOf(points.map(at), true);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  const seam = k.sideSeam(PLATE, -PLATE_H + 4, P, 8);
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(seam, { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

function ruler() {
  const strip = { x: ROAD_FROM - 4, y: 41, w: GAP_MAX * M + 12, d: 7, r: 1 };
  const out = [S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" })];
  const ticks = k.topTicks(ROAD_FROM, ROAD_FROM + GAP_MAX * M, M, 5, strip.y + 0.8, 0.6, [2, 3.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([ROAD_FROM, strip.y + 0.8], [ROAD_FROM, strip.y + strip.d], 0.6, P), { tone: "hi" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  return out.join("");
}

function road() {
  const out = [];
  const edge = (y) => S(k.slabOf({ x: ROAD_FROM, y: y - 0.6, w: ROAD_TO - ROAD_FROM, d: 1.2, r: 0.4 }, 0, 0.3, P, 2), { tone: "lo", flat: true });
  out.push(edge(-LANE / 2), edge(LANE * 1.5));
  for (let x = ROAD_FROM + 4; x + 16 <= ROAD_TO; x += 28) {
    out.push(S(k.slabOf({ x, y: LANE / 2 - 0.6, w: 16, d: 1.2, r: 0.4 }, 0, 0.3, P, 2), { tone: "lo", flat: true }));
  }
  const studs = [];
  for (let x = ROAD_FROM + 12; x < ROAD_TO - 4; x += 28) studs.push([x, -LANE / 2 - 1.6], [x, LANE * 1.5 + 1.6]);
  out.push(D(studs.map(([x, y]) => at([x, y, 0])), { size: 0.55, tone: "mid" }));
  out.push(L(k.planOutline({ x: ROAD_FROM + 30, y: -0.9, w: STOP.x - ROAD_FROM - 31, d: 1.8, r: 0.9 }, 0, P, 4), { tone: "faint" }));
  return out.join("");
}

function guardRail() {
  const out = [];
  const y = -LANE / 2 - 9;
  const from = ROAD_FROM + 14;
  const to = ROAD_TO - 4;
  for (let x = from; x <= to - 2; x += 26) {
    out.push(S(k.slabOf({ x, y: y - 1, w: 2.2, d: 2.2, r: 0.4 }, 0, 9, P, 2), { tone: "mid", crease: "none" }));
  }
  const beam = { x: from - 3, y: y + 1.2, w: to - from + 3, d: 1.4, r: 0.6 };
  out.push(S(k.slabOf(beam, 5, 3.6, P, 2, 0.3), { tone: "mid", inner: L(k.sideSeam(beam, 6.8, P, 2), { tone: "faint" }) }));
  return out.join("");
}

function stop() {
  const out = [S(k.slabOf(STOP, 0, 6, P, 3, 0.5), { tone: "mid" })];
  out.push(D([at([STOP.x + 2.5, STOP.y + 3, 6]), at([STOP.x + 2.5, STOP.y + STOP.d - 3, 6])], { size: 0.45 }));
  return out.join("");
}

function camera() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(PAD, 2), 0, PAD_H, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(PAD, 0, PAD_H, P, 4, 0.6), { tone: "mid" }));
  out.push(D(k.corners(PAD, 3.4).map(([x, y]) => at([x, y, PAD_H])), { size: 0.45 }));
  out.push(S(k.cylinder(POST[0], POST[1], 4.6, PAD_H, 3, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(POST[0], POST[1], 2.8, PAD_H + 3, HOUSING_Z - 2 - PAD_H - 3, P, 24), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(POST[0], POST[1], 2.8, 12.5, P, 16), { tone: "faint" }));
  const clamp = { x: POST[0] - 6, y: POST[1] - 6, w: 12, d: 12, r: 2 };
  out.push(S(k.slabOf(clamp, HOUSING_Z - 2, 2, P, 3, 0.4), { tone: "mid" }));
  const thumb = [clamp.x + 6, clamp.y + clamp.d + 2.4];
  out.push(S(k.slabOf({ x: thumb[0] - 1.2, y: clamp.y + clamp.d, w: 2.4, d: 1.6, r: 0.6 }, HOUSING_Z - 1.8, 1.6, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(thumb[0], thumb[1], 2.2, HOUSING_Z - 2.6, 3.2, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(thumb[0], thumb[1], 2.2, HOUSING_Z - 2.6, HOUSING_Z + 0.6, 18, P), { tone: "lo" }));
  const band = k.sideSeam(HOUSING, HOUSING_Z + 4, P, 4);
  out.push(S(k.slabOf(HOUSING, HOUSING_Z, HOUSING_TOP - HOUSING_Z, P, 4, 0.6), { tone: "hi", crease: "lo", inner: L(band, { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(HOUSING, 2.4), HOUSING_TOP, P, 4), { tone: "faint" }));
  out.push(D(k.corners(HOUSING, 2.2).map(([x, y]) => at([x, y, HOUSING_TOP])), { size: 0.45 }));
  out.push(k.faceTextSvg(k.sideMatrix([HOUSING.x + 4, HOUSING.y + HOUSING.d], HOUSING_Z + 9.4, P, "left"), "FCP", { size: 3.4, tone: "mid" }));
  out.push(S(k.slabOf(LENS, LENS_Z - 6, 12, P, 3, 0.3), { tone: "mid" }));
  out.push(L(k.sideRing([0, 0, LENS_Z], 5.4, "x", P, 40), { tone: "lo" }));
  out.push(`<path class="iso-lens" d="${k.sideRing([0, 0, LENS_Z], 4, "x", P, 40)}"/>`);
  out.push(L(k.sideRing([0, 0, LENS_Z], 4, "x", P, 40), { tone: "hi" }));
  out.push(L(k.sideRing([0, 0, LENS_Z], 2.2, "x", P, 32), { tone: "mid" }));
  out.push(D([at([0, 1.1, LENS_Z + 1.4])], { size: 0.6, tone: "hi" }));
  out.push(S(k.slabOf({ x: -13, y: -10, w: 15, d: 20, r: 1.4 }, HOUSING_TOP, 1.2, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(LED[0], LED[1], 1.7, HOUSING_TOP, 1, P, 20), { tone: "mid" }));
  out.push(`<circle data-part="fcw" class="fcw-lamp" cx="${at([LED[0], LED[1], HOUSING_TOP + 1])[0].toFixed(1)}" cy="${at([LED[0], LED[1], HOUSING_TOP + 1])[1].toFixed(1)}" r="1.5"/>`);
  return out.join("");
}

function ecu() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(ECU, 2), 0, ECU_H, P)}" style="filter:blur(4px)"/>`];
  const seam = k.sideSeam(ECU, 3, P, 4);
  out.push(S(k.slabOf(ECU, 0, ECU_H, P, 4, 0.6), { tone: "mid", inner: L(seam, { tone: "faint" }) }));
  out.push(D(k.corners(ECU, 2.2).map(([x, y]) => at([x, y, ECU_H])), { size: 0.45 }));
  const fins = { x: ECU.x + 4, y: ECU.y + 3, w: 14, d: 16 };
  for (let index = 0; index < 6; index++) {
    out.push(S(k.slabOf({ x: fins.x, y: fins.y + index * 2.9, w: fins.w, d: 1.2, r: 0.4 }, ECU_H, 2.2, P, 2), { tone: "mid", crease: "faint" }));
  }
  const label = { x: ECU.x + 21, y: ECU.y + 3, w: 8, d: 16, r: 1 };
  out.push(S(k.slabOf(label, ECU_H, 0.5, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1), ECU_H + 0.5, P, 3), { tone: "faint" }));
  [[label.y + 4, 4.6], [label.y + 7, 3.4], [label.y + 10, 4.2]].forEach(([y, w]) => out.push(L(k.lineOnTop([label.x + 2, y], [label.x + 2 + w, y], ECU_H + 0.5, P), { tone: "lo", free: true })));
  out.push(D([at([label.x + 4, label.y + 13.4, ECU_H + 0.5])], { size: 0.7, tone: "hi" }));
  out.push(S(k.slabOf(PORT, ECU_H, 2.4, P, 2, 0.3), { tone: "mid" }));
  return out.join("");
}

function cable() {
  const top = PORT_AT[2];
  const points = [[PORT_AT[0], HOUSING.y + HOUSING.d, HOUSING_Z + 3], [PORT_AT[0], HOUSING.y + HOUSING.d + 3, HOUSING_Z + 3], [PORT_AT[0], PORT_AT[1], top + 6], PORT_AT].map(at);
  return k.wireSvg(points[0], points[3], { via: points.slice(1, 3), tone: "mid", size: 1 });
}

function car({ lit }) {
  const platform = { x: 0, y: -8, w: CAR_LEN, d: 16, r: 2.5 };
  const body = { x: 1.5, y: -5.4, w: CAR_LEN - 3, d: 10.8, r: 2.4 };
  const cabin = { x: 8, y: -4.4, w: 14, d: 8.8, r: 2 };
  const tone = { tone: "hi", crease: "lo", lit };
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(platform, 2), 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(platform, 0, 2.2, P, 4, 0.5), { tone: "mid" }));
  out.push(D(k.corners(platform, 1.8).map(([x, y]) => at([x, y, 2.2])), { size: 0.4 }));
  const sill = k.sideSeam(body, 4.2, P, 4);
  const wheels = [6.5, CAR_LEN - 7.5].map((x) => k.sideRing([x, body.y + body.d, 4.9], 2.3, "y", P, 28)).join("");
  out.push(S(k.slabOf(body, 2.2, 5.8, P, 4, 0.5), { ...tone, inner: L(sill, { tone: "faint" }) + L(wheels, { tone: "mid" }) }));
  const lamps = [-3.2, 3.2].map((y) => face([[body.x + body.w, y - 1.2, 6.2], [body.x + body.w, y + 1.2, 6.2], [body.x + body.w, y + 1.2, 7.2], [body.x + body.w, y - 1.2, 7.2]])).join("");
  out.push(L(lamps, { tone: "mid" }));
  const side = face([[cabin.x + 1.6, cabin.y + cabin.d, 9], [cabin.x + cabin.w - 2, cabin.y + cabin.d, 9], [cabin.x + cabin.w - 2, cabin.y + cabin.d, 11.8], [cabin.x + 1.6, cabin.y + cabin.d, 11.8]]);
  const shield = face([[cabin.x + cabin.w, -3.2, 9], [cabin.x + cabin.w, 3.2, 9], [cabin.x + cabin.w, 3.2, 11.8], [cabin.x + cabin.w, -3.2, 11.8]]);
  const pillar = k.segment([cabin.x + 7, cabin.y + cabin.d, 9], [cabin.x + 7, cabin.y + cabin.d, 11.8], P);
  out.push(S(k.slabOf(cabin, 8, 4.6, P, 4, 0.4), { ...tone, inner: L(side + shield, { tone: "lo" }) + L(pillar, { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(cabin, 1.4), 12.6, P, 4), { tone: "faint" }));
  return out.join("");
}

const gapToX = (gap) => ROAD_FROM + gap * M;
const REST_GAP = 18;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "bench-svg",
  label:
    "A camera test bench. A front camera on a post looks down a two-lane model road with a metre ruler. A soft-target car rides a slot in the camera's own lane: it is the closest in-path vehicle. A second car stands in the next lane and is not in path. As the target car closes in, the time to collision falls, and below 2.6 seconds the warning lamp on the camera turns red.",
  body: [
    plate(),
    ruler(),
    road(),
    guardRail(),
    camera(),
    ecu(),
    cable(),
    `<g data-part="cars">`,
    `<g data-part="neighbour" transform="${k.translateAlong(P, [gapToX(NEIGHBOUR_GAP), LANE, 0])}">${car({ lit: false })}</g>`,
    `<g data-part="lead" transform="${k.translateAlong(P, [gapToX(REST_GAP), 0, 0])}">${car({ lit: true })}</g>`,
    `</g>`,
    stop(),
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const M = ${M}, ROAD_FROM = ${ROAD_FROM}, LANE = ${LANE}, CAR_LEN = ${CAR_LEN};
const GAP_MIN = ${GAP_MIN}, GAP_MAX = ${GAP_MAX}, NEIGHBOUR_GAP = ${NEIGHBOUR_GAP}, REST_GAP = ${REST_GAP};
const EGO = 20, FCW_TTC = 2.6;
const PHASES = {
  cruise: { accel: 0, until: (s) => s.time > 2, next: "brake" },
  brake: { accel: -3, until: (s) => s.lead <= 14, next: "close" },
  close: { accel: 0, until: (s) => s.gap <= 10, next: "pull" },
  pull: { accel: 3, until: (s) => s.lead >= 26, next: "open" },
  open: { accel: 0, until: (s) => s.gap >= 28, next: "settle" },
  settle: { accel: -3, until: (s) => s.lead <= EGO, next: "cruise" },
};
const stage = document.querySelector("[data-bench]");
const mount = stage.querySelector("[data-bench-art]");
mount.innerHTML = ${JSON.stringify(svg)};
const svg = mount.querySelector("svg");
const cars = svg.querySelector('[data-part="cars"]');
const lead = svg.querySelector('[data-part="lead"]');
const neighbour = svg.querySelector('[data-part="neighbour"]');
const lamp = svg.querySelector('[data-part="fcw"]');
const out = Object.fromEntries([...stage.querySelectorAll("[data-out]")].map((node) => [node.dataset.out, node]));
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const gapToX = (gap) => ROAD_FROM + gap * M;
const s = { gap: still.matches ? REST_GAP : 34, lead: EGO, phase: "cruise", time: 0, closing: still.matches ? 6 : 0 };
let target = s.gap, touring = !still.matches, frame = 0, last = 0, visible = false, idle = 0, warned = null;
const ttcOf = () => (s.closing > 0.05 ? s.gap / s.closing : Infinity);
const say = (key, text) => { if (out[key] && out[key].textContent !== text) out[key].textContent = text; };
function draw() {
  lead.setAttribute("transform", translateAlong(P, [gapToX(s.gap), 0, 0]));
  const leadNearer = depthOf([gapToX(s.gap) + CAR_LEN / 2, 0, 0], P) > depthOf([gapToX(NEIGHBOUR_GAP) + CAR_LEN / 2, LANE, 0], P);
  if (leadNearer !== (cars.lastElementChild === lead)) cars.appendChild(leadNearer ? lead : neighbour);
  const ttc = ttcOf();
  const warn = ttc < FCW_TTC;
  say("gap", s.gap.toFixed(1) + " m");
  say("closing", (Math.abs(s.closing) < 0.05 ? 0 : s.closing).toFixed(1) + " m/s");
  say("ttc", Number.isFinite(ttc) ? ttc.toFixed(1) + " s" : "not closing");
  say("fcw", warn ? "Warning" : "Off");
  if (warn !== warned) {
    warned = warn;
    stage.dataset.fcw = warn ? "on" : "off";
    describe();
  }
}
function describe() {
  mount.setAttribute("aria-valuenow", String(Math.round(s.gap)));
  mount.setAttribute("aria-valuetext", "Gap " + s.gap.toFixed(0) + " metres, forward collision warning " + (warned ? "on" : "off"));
}
function tour(dt) {
  const phase = PHASES[s.phase];
  s.time += dt;
  s.lead += phase.accel * dt;
  if (phase.until(s)) { s.phase = phase.next; s.time = 0; }
  s.closing = EGO - s.lead;
  s.gap = clamp(s.gap - s.closing * dt, GAP_MIN, GAP_MAX);
  target = s.gap;
}
function steer(dt, calm) {
  const before = s.gap;
  s.gap = calm ? target : s.gap + (target - s.gap) * (1 - Math.exp(-dt / 0.35));
  if (Math.abs(target - s.gap) < 0.01) s.gap = target;
  const rate = (before - s.gap) / dt;
  s.closing = calm ? s.closing : s.closing + (rate - s.closing) * (1 - Math.exp(-dt / 0.15));
  if (s.gap === target && Math.abs(s.closing) < 0.05) s.closing = 0;
  s.lead = EGO - s.closing;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) tour(dt); else steer(dt, still.matches);
  draw();
  const settled = !touring && s.gap === target && (still.matches || s.closing === 0);
  if (settled) describe();
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const resume = () => {
  clearTimeout(idle);
  idle = setTimeout(() => {
    if (still.matches) return;
    touring = true;
    s.lead = EGO - s.closing;
    s.phase = s.gap < 28 ? "pull" : "settle";
    s.time = 0;
    run();
  }, 3600);
};
const aim = (gap) => { touring = false; target = clamp(gap, GAP_MIN, GAP_MAX); if (still.matches) s.closing = 0; resume(); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
const point = (event) => {
  const box = svg.getBoundingClientRect();
  aim(GAP_MIN + clamp(((event.clientX - box.left) / box.width - 0.3) / 0.62, 0, 1) * (GAP_MAX - GAP_MIN));
};
mount.addEventListener("pointermove", point);
mount.addEventListener("pointerdown", point);
mount.addEventListener("pointerleave", () => resume());
mount.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 10 : 2;
  const moves = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, Home: -Infinity, End: Infinity };
  if (!(event.key in moves)) return;
  event.preventDefault();
  aim((touring ? s.gap : target) + moves[event.key]);
});
draw();
`;

const runtime = readFileSync(join(HERE, "iso-kit.mjs"), "utf8").replace(/^export /gm, "");
writeFileSync(join(OUT, "bench.js"), runtime + live);
writeFileSync(join(OUT, "bench.css"), k.ISO_CSS);
console.log("wrote public/assets/bench.js and bench.css");
