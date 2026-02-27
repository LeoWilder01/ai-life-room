"use client";

import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCityLatLon } from "@/lib/utils/geocode";
import PhotoThumb from "@/components/ui/PhotoThumb";

// ─── Constants ─────────────────────────────────────────────────────────────────

const GRID_W = 100;
const GRID_H = 50;
const MAX_TRAIL = 10;
const PIXEL_FONT = "var(--font-vt323), 'VT323', monospace";

const AGENT_COLORS = [
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#ffd93d",
  "#ff9f43",
  "#a29bfe",
  "#fd79a8",
  "#55efc4",
  "#74b9ff",
  "#e17055",
];

// ─── Land map ─────────────────────────────────────────────────────────────────

const LAND_RECTS: Array<[number, number, number, number]> = [
  [-170, -52, 24, 75],
  [-170, -130, 54, 72],
  [-58, -18, 60, 84],
  [-24, -13, 63, 67],
  [-82, -34, -56, 12],
  [-9, 4, 36, 44],
  [-5, 8, 43, 52],
  [-8, 2, 50, 59],
  [4, 32, 56, 72],
  [8, 32, 40, 56],
  [7, 18, 37, 47],
  [18, 28, 36, 46],
  [26, 45, 36, 43],
  [-17, 51, -35, 37],
  [32, 60, 12, 30],
  [44, 75, 25, 40],
  [43, 50, -26, -12],
  [60, 93, 6, 36],
  [28, 65, 50, 75],
  [60, 180, 50, 78],
  [50, 90, 36, 56],
  [73, 135, 18, 53],
  [126, 130, 34, 42],
  [129, 146, 30, 46],
  [92, 110, 0, 28],
  [95, 110, -6, 8],
  [105, 115, -9, -6],
  [108, 119, -5, 7],
  [118, 127, 4, 20],
  [131, 148, -10, 0],
  [113, 154, -39, -11],
  [166, 178, -47, -34],
];

function isLandPoint(lon: number, lat: number): boolean {
  return LAND_RECTS.some(
    ([lo, hi, la, lb]) => lon >= lo && lon <= hi && lat >= la && lat <= lb,
  );
}

const LAND_GRID: boolean[][] = (() => {
  const g: boolean[][] = [];
  for (let r = 0; r < GRID_H; r++) {
    g[r] = [];
    for (let c = 0; c < GRID_W; c++)
      g[r][c] = isLandPoint(
        (c + 0.5) * (360 / GRID_W) - 180,
        90 - (r + 0.5) * (180 / GRID_H),
      );
  }
  return g;
})();

// ─── Utilities ─────────────────────────────────────────────────────────────────

function latLonToGrid(lat: number, lon: number) {
  return {
    col: Math.max(
      0,
      Math.min(GRID_W - 2, Math.floor(((lon + 180) / 360) * GRID_W)),
    ),
    row: Math.max(
      0,
      Math.min(GRID_H - 2, Math.floor(((90 - lat) / 180) * GRID_H)),
    ),
  };
}

function findFreeCell(tc: number, tr: number, occupied: Set<string>) {
  const cc = (c: number) => Math.max(0, Math.min(GRID_W - 2, c));
  const cr = (r: number) => Math.max(0, Math.min(GRID_H - 2, r));
  const visited = new Set<string>();
  const queue: [number, number][] = [[cc(tc), cr(tr)]];
  while (queue.length) {
    const [col, row] = queue.shift()!;
    const key = `${col},${row}`;
    if (visited.has(key)) continue;
    visited.add(key);
    let free = true;
    outer: for (let dr = 0; dr < 2; dr++)
      for (let dc = 0; dc < 2; dc++)
        if (occupied.has(`${col + dc},${row + dr}`)) {
          free = false;
          break outer;
        }
    if (free) return { col, row };
    for (const [dc, dr] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ])
      queue.push([cc(col + (dc as number)), cr(row + (dr as number))]);
  }
  return null;
}

function seededInt(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
}

/** Deterministic Fisher-Yates shuffle */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const r = [...arr];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.abs(seededInt(seed + i * 17, 0, i));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/**
 * Find a free land cell near (targetCol, targetRow):
 * 1. Natural target (if land & free) → done
 * 2. Up to 5 rounds of random 3×3 walk (seeded, stable)
 * 3. BFS 2 levels (3×3 then 5×5 ring), land only
 */
function findFreeTrailCell(
  targetCol: number,
  targetRow: number,
  occupied: Set<string>,
  baseSeed: number,
): { col: number; row: number } | null {
  const cc = (c: number) => Math.max(0, Math.min(GRID_W - 1, c));
  const cr = (r: number) => Math.max(0, Math.min(GRID_H - 1, r));
  const isValid = (c: number, r: number) =>
    LAND_GRID[r]?.[c] === true && !occupied.has(`${c},${r}`);

  const tc = cc(targetCol),
    tr = cr(targetRow);

  // Step 1: natural position
  if (isValid(tc, tr)) return { col: tc, row: tr };

  // Step 2: random walk up to 5 rounds
  let cx = tc,
    cy = tr;
  for (let round = 0; round < 5; round++) {
    const candidates: [number, number][] = [];
    for (let dc = -1; dc <= 1; dc++)
      for (let dr = -1; dr <= 1; dr++)
        candidates.push([cc(cx + dc), cr(cy + dr)]);

    const shuffled = seededShuffle(candidates, baseSeed + round * 97);
    const found = shuffled.find(([c, r]) => isValid(c, r));
    if (found) return { col: found[0], row: found[1] };

    // Move to first shuffled cell as new center for next iteration
    cx = shuffled[0][0];
    cy = shuffled[0][1];
  }

  // Step 3: BFS from original target, 2 levels, land cells only
  const visited = new Set<string>();
  const queue: [number, number, number][] = [];

  const expand = (c: number, r: number, level: number) => {
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (dc === 0 && dr === 0) continue;
        const nc = cc(c + dc),
          nr = cr(r + dr);
        const key = `${nc},${nr}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push([nc, nr, level]);
        }
      }
    }
  };

  visited.add(`${tc},${tr}`);
  expand(tc, tr, 1);

  while (queue.length) {
    const [c, r, level] = queue.shift()!;
    if (isValid(c, r)) return { col: c, row: r };
    if (level < 2) expand(c, r, level + 1);
  }

  return null; // all cells in range are occupied or ocean
}

function getLifeDayCoords(day: LifeDay): { lat: number; lon: number } | null {
  const c = day.location.coordinates;
  if (Array.isArray(c) && c.length >= 2) {
    const [lat, lon] = c;
    if (
      !isNaN(lat) &&
      !isNaN(lon) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lon) <= 180 &&
      (lat !== 0 || lon !== 0)
    )
      return { lat, lon };
  }
  return getCityLatLon(day.location.city, day.location.country);
}

function fmtDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface LifeDay {
  _id: string;
  agentName: string;
  roundNumber: number;
  fictionalDate: string;
  fictionalAge: number;
  location: { city: string; country: string; coordinates?: [number, number] };
  photo: { originalUrl: string; caption: string };
  thoughtBubble: string;
  interactions?: {
    withAgentName: string;
    description: string;
    isAttraction: boolean;
  }[];
}

interface Agent {
  _id: string;
  name: string;
  description: string;
  claimStatus: string;
  hasPersona: boolean;
  lastActive?: string;
}
interface Persona {
  displayName: string;
  birthPlace: { city: string; country: string };
  birthDate: string;
}
interface Intersection {
  _id: string;
  initiatingAgent: string;
  otherAgent: string;
}

interface AgentData {
  agent: Agent;
  persona?: Persona | null;
  latestLifeDay?: LifeDay | null;
  intersectionCount?: number;
}

interface AgentOnMap {
  name: string;
  displayName: string;
  col: number;
  row: number;
  color: string;
  latestLifeDay: LifeDay;
  agentIdx: number;
}

interface TrailPoint {
  col: number;
  row: number;
  day: LifeDay;
}

// Hover state: hovering agent avatar vs hovering a trail dot
type HoverItem =
  | { type: "agent"; agentName: string }
  | { type: "trail"; agentName: string; day: LifeDay };

interface Props {
  agentData: AgentData[];
  allLifeDays: LifeDay[];
  intersections: Intersection[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCountdown(
  lastActive: string | undefined,
  now: number,
): { text: string; urgent: boolean } {
  if (!lastActive) return { text: "UNACTIVE", urgent: false };
  const remaining = new Date(lastActive).getTime() + 24 * 60 * 60 * 1000 - now;
  if (remaining <= 0) return { text: "UPDATING", urgent: true };
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { text: `${pad(h)}:${pad(m)}:${pad(s)}`, urgent: h === 0 };
}


// ─── Component ────────────────────────────────────────────────────────────────

export default function WorldMap({
  agentData,
  allLifeDays,
  intersections,
}: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cellSize, setCellSize] = useState(12);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState<HoverItem | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  // LLM-resolved positions
  const [llmAgents, setLlmAgents] = useState<AgentOnMap[]>([]);
  const llmAttempted = useRef(new Set<string>());

  // Pan state
  const [panX, setPanX] = useState(0);
  const dragRef = useRef({ dragging: false, startX: 0, startPanX: 0 });
  const hasDraggedRef = useRef(false);

  // Bottom-bar hover (for aligned arrows)
  const [hoveredBarAgent, setHoveredBarAgent] = useState<string | null>(null);

  // Pan-to animation
  const [targetPanX, setTargetPanX] = useState<number | null>(null);
  const panXRef = useRef(0); // mirrors panX for stale-closure-free RAF access
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  // Keep panXRef in sync
  useEffect(() => {
    panXRef.current = panX;
  }, [panX]);

  // Live clock for countdowns (1s tick)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Agents sorted by life days descending (for status bar)
  const sortedAgentData = useMemo(
    () =>
      agentData
        .map((d, i) => ({ d, colorIdx: i }))
        .sort(
          (a, b) =>
            (b.d.latestLifeDay?.roundNumber ?? -1) -
            (a.d.latestLifeDay?.roundNumber ?? -1),
        ),
    [agentData],
  );

  // Smooth pan-to animation (RAF interpolation toward targetPanX)
  useEffect(() => {
    if (targetPanX === null) return;
    let rafId: number;
    const step = () => {
      const diff = targetPanX - panXRef.current;
      if (Math.abs(diff) < 0.5) {
        setPanX(targetPanX);
        setTargetPanX(null);
        return;
      }
      setPanX(panXRef.current + diff * 0.12);
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [targetPanX]);

  // ── Life days grouped by agent ────────────────────────────────────────────
  const lifeDaysByAgent = useMemo(() => {
    const map = new Map<string, LifeDay[]>();
    for (const day of allLifeDays) {
      if (!map.has(day.agentName)) map.set(day.agentName, []);
      map.get(day.agentName)!.push(day);
    }
    for (const days of map.values())
      days.sort(
        (a, b) =>
          new Date(b.fictionalDate).getTime() -
          new Date(a.fictionalDate).getTime(),
      );
    return map;
  }, [allLifeDays]);

  // ── Intersection adjacency ────────────────────────────────────────────────
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const ix of intersections) {
      if (!map.has(ix.initiatingAgent)) map.set(ix.initiatingAgent, new Set());
      if (!map.has(ix.otherAgent)) map.set(ix.otherAgent, new Set());
      map.get(ix.initiatingAgent)!.add(ix.otherAgent);
      map.get(ix.otherAgent)!.add(ix.initiatingAgent);
    }
    return map;
  }, [intersections]);

  // ── Sync agent placement ──────────────────────────────────────────────────
  const { agentsOnMap, agentsNeedingLLM } = useMemo(() => {
    const placed: AgentOnMap[] = [];
    const needLLM: {
      name: string;
      displayName: string;
      city: string;
      country: string;
      agentIdx: number;
    }[] = [];
    const occupied = new Set<string>();

    agentData.forEach((d, i) => {
      const days = lifeDaysByAgent.get(d.agent.name) || [];
      if (days.length === 0) return;
      let coords: { lat: number; lon: number } | null = null;
      for (const day of days) {
        coords = getLifeDayCoords(day);
        if (coords) break;
      }

      if (!coords) {
        needLLM.push({
          name: d.agent.name,
          displayName: d.persona?.displayName || d.agent.name,
          city: days[0].location.city,
          country: days[0].location.country,
          agentIdx: i,
        });
        return;
      }
      const { col, row } = latLonToGrid(coords.lat, coords.lon);
      const cell = findFreeCell(col, row, occupied);
      if (!cell) return;
      for (let dr = 0; dr < 2; dr++)
        for (let dc = 0; dc < 2; dc++)
          occupied.add(`${cell.col + dc},${cell.row + dr}`);
      placed.push({
        name: d.agent.name,
        displayName: d.persona?.displayName || d.agent.name,
        col: cell.col,
        row: cell.row,
        color: AGENT_COLORS[i % AGENT_COLORS.length],
        latestLifeDay: days[0],
        agentIdx: i,
      });
    });

    return { agentsOnMap: placed, agentsNeedingLLM: needLLM };
  }, [agentData, lifeDaysByAgent]);

  // ── LLM fallback ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!agentsNeedingLLM.length) return;
    async function resolve() {
      for (const {
        name,
        displayName,
        city,
        country,
        agentIdx,
      } of agentsNeedingLLM) {
        const key = `${name}::${city}::${country}`;
        if (llmAttempted.current.has(key)) continue;
        llmAttempted.current.add(key);
        try {
          const res = await fetch("/api/geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ city, country }),
          });
          const data = await res.json();
          if (typeof data.lat === "number" && typeof data.lon === "number") {
            const { col, row } = latLonToGrid(data.lat, data.lon);
            const days = lifeDaysByAgent.get(name) || [];
            if (!days.length) continue;
            setLlmAgents((prev) =>
              prev.some((a) => a.name === name)
                ? prev
                : [
                    ...prev,
                    {
                      name,
                      displayName,
                      col,
                      row,
                      color: AGENT_COLORS[agentIdx % AGENT_COLORS.length],
                      latestLifeDay: days[0],
                      agentIdx,
                    },
                  ],
            );
          }
        } catch {
          /* skip */
        }
      }
    }
    resolve();
  }, [agentsNeedingLLM, lifeDaysByAgent]);

  // ── All agents on map ─────────────────────────────────────────────────────
  const allAgentsOnMap = useMemo(
    () => [
      ...agentsOnMap,
      ...llmAgents.filter((a) => !agentsOnMap.some((b) => b.name === a.name)),
    ],
    [agentsOnMap, llmAgents],
  );

  const agentPosMap = useMemo(() => {
    const m = new Map<string, AgentOnMap>();
    for (const a of allAgentsOnMap) m.set(a.name, a);
    return m;
  }, [allAgentsOnMap]);

  // Pan map so that agent's map position aligns with their bottom-bar card
  const panToAgent = useCallback(
    (agentName: string) => {
      const agent = agentPosMap.get(agentName);
      if (!agent || !containerRef.current) return;
      const cardEl = cardRefs.current.get(agentName);
      if (!cardEl) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const cardRect = cardEl.getBoundingClientRect();
      const cardCenterX =
        cardRect.left - containerRect.left + cardRect.width / 2;

      // Agent's natural X center on map (col+1 = center of 2×2 cell)
      const agentNaturalX = mapOffset.x + (agent.col + 1) * cellSize;

      // Raw target: we want agentNaturalX + newPan = cardCenterX
      const rawTarget = cardCenterX - agentNaturalX;

      // Pick the wraparound copy closest to current pan to avoid long detour
      const mw = GRID_W * cellSize;
      const best = [rawTarget - mw, rawTarget, rawTarget + mw].reduce((a, b) =>
        Math.abs(b - panXRef.current) < Math.abs(a - panXRef.current) ? b : a,
      );

      setTargetPanX(best);
    },
    [agentPosMap, mapOffset, cellSize],
  );

  // ── Trail points (shared occupied set across all agents) ─────────────────
  const agentTrails = useMemo((): Map<string, TrailPoint[]> => {
    const trails = new Map<string, TrailPoint[]>();
    const trailOccupied = new Set<string>(); // shared — prevents stacking

    for (const agent of allAgentsOnMap) {
      const days = (lifeDaysByAgent.get(agent.name) || []).slice(0, MAX_TRAIL);
      const points: TrailPoint[] = [];

      days.forEach((day, dayIdx) => {
        // Initial target: stored coords → static lookup → 5×5 seeded random
        const coords = getLifeDayCoords(day);
        let targetCol: number, targetRow: number;
        if (coords) {
          ({ col: targetCol, row: targetRow } = latLonToGrid(
            coords.lat,
            coords.lon,
          ));
        } else {
          const seed = agent.name.length * 31 + day.roundNumber * 7;
          targetCol = Math.max(
            0,
            Math.min(GRID_W - 1, agent.col + seededInt(seed, -2, 2)),
          );
          targetRow = Math.max(
            0,
            Math.min(GRID_H - 1, agent.row + seededInt(seed + 1, -2, 2)),
          );
        }

        // Find free land cell near target (random walk → BFS)
        const baseSeed =
          (agent.name.charCodeAt(0) || 0) * 37 +
          day.roundNumber * 113 +
          dayIdx * 59;
        const cell = findFreeTrailCell(
          targetCol,
          targetRow,
          trailOccupied,
          baseSeed,
        );
        if (!cell) return; // no space found — skip this dot

        trailOccupied.add(`${cell.col},${cell.row}`);
        points.push({ col: cell.col, row: cell.row, day });
      });

      trails.set(agent.name, points);
    }
    return trails;
  }, [allAgentsOnMap, lifeDaysByAgent]);

  // ── Container measurement ─────────────────────────────────────────────────
  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width } = el.getBoundingClientRect();
    // Fill width exactly; map may overflow the bottom (clipped by overflow:hidden)
    const cs = Math.max(1, width / GRID_W);
    setCellSize(cs);
    setMapOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // ── Canvas ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const { width, height } = container.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Render land dots onto an offscreen tile
    const mapW = GRID_W * cellSize;
    const mapH = GRID_H * cellSize;
    const off = document.createElement("canvas");
    off.width = mapW;
    off.height = mapH;
    const octx = off.getContext("2d");
    if (!octx) return;
    const radius = Math.max(0.5, (cellSize * 0.55) / 2);
    octx.fillStyle = "#000000";
    for (let row = 0; row < GRID_H; row++) {
      for (let col = 0; col < GRID_W; col++) {
        if (!LAND_GRID[row][col]) continue;
        octx.beginPath();
        octx.arc(
          (col + 0.5) * cellSize,
          (row + 0.5) * cellSize,
          radius,
          0,
          Math.PI * 2,
        );
        octx.fill();
      }
    }

    // Paint background and draw 3 tiled copies for seamless wrap
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    const pxn = ((panX % mapW) + mapW) % mapW;
    const startX = mapOffset.x + pxn - mapW;
    for (let i = 0; i < 3; i++)
      ctx.drawImage(off, startX + i * mapW, mapOffset.y);
  }, [cellSize, mapOffset, panX]);

  // ── Derived hover info ────────────────────────────────────────────────────
  const highlightedAgent = hoveredItem?.agentName ?? null;
  const hoveredAgent =
    hoveredItem?.type === "agent" ? hoveredItem.agentName : null;
  const connectedNames = hoveredAgent
    ? (adjacency.get(hoveredAgent) ?? new Set<string>())
    : new Set<string>();

  // Pan helpers
  const mapWidth = GRID_W * cellSize;
  const panXNorm = ((panX % mapWidth) + mapWidth) % mapWidth; // always in [0, mapWidth)

  // Dot radii
  const landDotR = Math.max(0.5, (cellSize * 0.55) / 2);
  const trailDotR = Math.max(3, Math.round(landDotR * 1.6)); // slightly bigger than land dots
  const trailDotRHl = Math.max(5, Math.round(trailDotR * 1.6)); // highlighted: bigger

  // Position helpers
  const avatarCenter = (a: AgentOnMap) => ({
    x: mapOffset.x + (a.col + 1) * cellSize,
    y: mapOffset.y + (a.row + 1) * cellSize,
  });
  const trailCenter = (p: TrailPoint) => ({
    x: mapOffset.x + (p.col + 0.5) * cellSize,
    y: mapOffset.y + (p.row + 0.5) * cellSize,
  });

  const updatePopupPos = (e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    setPopupPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{
        height: "calc(100vh - 64px)",
        background: "#ffffff",
        cursor: dragRef.current.dragging ? "grabbing" : "grab",
      }}
      onMouseDown={(e) => {
        setTargetPanX(null); // cancel any ongoing pan animation
        dragRef.current = {
          dragging: true,
          startX: e.clientX,
          startPanX: panX,
        };
        hasDraggedRef.current = false;
      }}
      onMouseMove={(e) => {
        if (!dragRef.current.dragging) return;
        const dx = e.clientX - dragRef.current.startX;
        if (Math.abs(dx) > 3) hasDraggedRef.current = true;
        setPanX(dragRef.current.startPanX + dx);
      }}
      onMouseUp={() => {
        dragRef.current.dragging = false;
      }}
      onMouseLeave={() => {
        dragRef.current.dragging = false;
      }}
      onTouchStart={(e) => {
        dragRef.current = {
          dragging: true,
          startX: e.touches[0].clientX,
          startPanX: panX,
        };
        hasDraggedRef.current = false;
      }}
      onTouchMove={(e) => {
        if (!dragRef.current.dragging) return;
        const dx = e.touches[0].clientX - dragRef.current.startX;
        if (Math.abs(dx) > 3) hasDraggedRef.current = true;
        setPanX(dragRef.current.startPanX + dx);
      }}
      onTouchEnd={() => {
        dragRef.current.dragging = false;
      }}
    >
      {/* Land canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 0 }}
      />

      {/* SVG: trail lines + attraction lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
      >
        {/* ── Graticule (lat/lon grid lines) ── */}
        {([-60, -30, 0, 30, 60] as const).map((lat) => {
          const y = mapOffset.y + ((90 - lat) / 180) * GRID_H * cellSize;
          return (
            <line
              key={`lat${lat}`}
              x1={0}
              y1={y}
              x2="100%"
              y2={y}
              stroke="rgba(0,0,0,0.13)"
              strokeWidth={0.6}
              strokeDasharray="5 5"
            />
          );
        })}
        {([-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150] as const).map(
          (lon) => {
            const baseX = mapOffset.x + ((lon + 180) / 360) * GRID_W * cellSize;
            return ([-1, 0, 1] as const).map((copy) => (
              <line
                key={`lon${lon}_${copy}`}
                x1={baseX + panXNorm + copy * mapWidth}
                y1={0}
                x2={baseX + panXNorm + copy * mapWidth}
                y2="100%"
                stroke="rgba(0,0,0,0.13)"
                strokeWidth={0.6}
                strokeDasharray="5 5"
              />
            ));
          },
        )}

        {([-1, 0, 1] as const).map((copy) => (
          <g
            key={`map-copy-${copy}`}
            transform={`translate(${panXNorm + copy * mapWidth}, 0)`}
          >
            {allAgentsOnMap.map((agent) => {
              const trail = agentTrails.get(agent.name);
              if (!trail || trail.length === 0) return null;
              const ac = avatarCenter(agent);
              const pts = [...trail].reverse().map(trailCenter);
              pts.push(ac);
              const d = pts
                .map(
                  (p, i) =>
                    `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
                )
                .join(" ");
              const isHighlighted = highlightedAgent === agent.name;
              return (
                <path
                  key={`tl-${agent.name}`}
                  d={d}
                  fill="none"
                  stroke={agent.color}
                  strokeWidth={isHighlighted ? 1.5 : 0.8}
                  strokeOpacity={isHighlighted ? 0.85 : 0.3}
                  strokeDasharray="3 3"
                />
              );
            })}
            {hoveredAgent &&
              Array.from(connectedNames).map((name) => {
                const target = agentPosMap.get(name);
                const src = agentPosMap.get(hoveredAgent);
                if (!target || !src) return null;
                const a = avatarCenter(src),
                  b = avatarCenter(target);
                return (
                  <line
                    key={`att-${name}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#ff79c6"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    opacity={0.8}
                  />
                );
              })}
          </g>
        ))}
      </svg>

      {/* Trail dots (colored circles, pointer-events enabled) */}
      {allAgentsOnMap.map((agent) => {
        const trail = agentTrails.get(agent.name);
        if (!trail) return null;
        const isHighlighted = highlightedAgent === agent.name;
        const r = isHighlighted ? trailDotRHl : trailDotR;

        return trail.flatMap((point, idx) => {
          const tc = trailCenter(point);
          const hitSize = Math.max(cellSize, 14);
          return ([-1, 0, 1] as const).map((copy) => (
            <div
              key={`td-${agent.name}-${idx}-${copy}`}
              className="absolute"
              style={{
                left: tc.x + panXNorm + copy * mapWidth - hitSize / 2,
                top: tc.y - hitSize / 2,
                width: hitSize,
                height: hitSize,
                zIndex: 15,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                setHoveredItem({
                  type: "trail",
                  agentName: agent.name,
                  day: point.day,
                });
                updatePopupPos(e);
              }}
              onMouseLeave={() => {
                setHoveredItem(null);
                setPopupPos(null);
              }}
              onMouseMove={updatePopupPos}
            >
              <div
                style={{
                  width: r * 2,
                  height: r * 2,
                  borderRadius: "50%",
                  background: agent.color,
                  opacity: isHighlighted ? 1 : 0.55,
                  boxShadow: isHighlighted
                    ? `0 0 6px 2px ${agent.color}88`
                    : "none",
                  transition: "all 0.15s",
                  pointerEvents: "none",
                }}
              />
            </div>
          ));
        });
      })}

      {/* Agent avatars — rendered at 3 x-positions for wraparound */}
      {allAgentsOnMap.flatMap((agent) => {
        const basePx = mapOffset.x + agent.col * cellSize;
        const py = mapOffset.y + agent.row * cellSize;
        const avatarSize = Math.max(18, Math.min(cellSize * 2 - 2, 36));
        const isHovered = hoveredAgent === agent.name;
        const isConnected = connectedNames.has(agent.name);

        return ([-1, 0, 1] as const).map((copy) => (
          <div
            key={`${agent.name}-${copy}`}
            className="absolute select-none"
            style={{
              left: basePx + panXNorm + copy * mapWidth,
              top: py,
              width: cellSize * 2,
              height: cellSize * 2,
              zIndex: isHovered ? 30 : 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            onClick={() => {
              if (!hasDraggedRef.current) router.push(`/agent/${agent.name}`);
            }}
            onMouseEnter={(e) => {
              setHoveredItem({ type: "agent", agentName: agent.name });
              updatePopupPos(e);
            }}
            onMouseLeave={() => {
              setHoveredItem(null);
              setPopupPos(null);
            }}
            onMouseMove={updatePopupPos}
          >
            {isConnected && !isHovered && (
              <div
                className="absolute rounded-full animate-pulse"
                style={{
                  width: avatarSize + 8,
                  height: avatarSize + 8,
                  background: "rgba(255,121,198,0.3)",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%,-50%)",
                }}
              />
            )}
            {/* Downward arrow below avatar when this agent is hovered in bottom bar */}
            {hoveredBarAgent === agent.name && (
              <div
                style={{
                  position: "absolute",
                  bottom: -10,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: `7px solid ${agent.color}`,
                  pointerEvents: "none",
                }}
              />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(agent.name)}&backgroundColor=ffffff`}
              alt={agent.displayName}
              width={avatarSize}
              height={avatarSize}
              style={
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: "50%",
                  border: `2px solid ${isHovered ? "#111" : agent.color}`,
                  boxShadow: isHovered
                    ? `0 0 0 3px ${agent.color}, 0 4px 16px rgba(0,0,0,0.2)`
                    : `0 2px 8px rgba(0,0,0,0.15)`,
                  transition: "box-shadow 0.15s, border-color 0.15s",
                  background: "#f0f0f0",
                  pointerEvents: "auto",
                  userSelect: "none",
                  draggable: false,
                } as React.CSSProperties
              }
              draggable={false}
            />
          </div>
        ));
      })}

      {/* Popups */}
      {hoveredItem &&
        popupPos &&
        (() => {
          if (hoveredItem.type === "agent") {
            const agent = agentPosMap.get(hoveredItem.agentName);
            if (!agent) return null;
            const trailDays = (lifeDaysByAgent.get(agent.name) || []).slice(
              0,
              MAX_TRAIL,
            );
            return (
              <AgentPopup
                agent={agent}
                trailDays={trailDays}
                pos={popupPos}
                containerRef={containerRef}
              />
            );
          } else {
            const agent = agentPosMap.get(hoveredItem.agentName);
            return (
              <TrailDayPopup
                day={hoveredItem.day}
                agentColor={agent?.color ?? "#aaa"}
                agentName={agent?.displayName ?? hoveredItem.agentName}
                pos={popupPos}
                containerRef={containerRef}
              />
            );
          }
        })()}

      {/* Empty state */}
      {allAgentsOnMap.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 40 }}
        >
          <p className="text-gray-400 font-mono text-sm">
            No agents on the map yet
          </p>
        </div>
      )}

      {/* ── Bottom agent status bar ── */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 0,
          right: 0,
          zIndex: 50,
          overflowX: "auto",
          overflowY: "hidden",
          display: "flex",
          justifyContent: "center",
          padding: "2px 20px 6px",
          scrollbarWidth: "none",
        }}
        className="no-scrollbar"
      >
        <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
          {sortedAgentData.map(({ d, colorIdx }) => {
            const color = AGENT_COLORS[colorIdx % AGENT_COLORS.length];
            const displayName = d.persona?.displayName ?? d.agent.name;
            const { text: cdText, urgent } = formatCountdown(
              d.agent.lastActive,
              now,
            );
            const avatarUrl = `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(d.agent.name)}&backgroundColor=ffffff`;
            const cdColor =
              cdText === "UNACTIVE" ? "#556" : urgent ? "#ff6b6b" : "#f7dc6f";

            return (
              <div
                key={d.agent.name}
                ref={(el) => {
                  if (el) cardRefs.current.set(d.agent.name, el);
                  else cardRefs.current.delete(d.agent.name);
                }}
                onClick={() => router.push(`/agent/${d.agent.name}`)}
                onMouseEnter={() => {
                  panToAgent(d.agent.name);
                  setHoveredBarAgent(d.agent.name);
                }}
                onMouseLeave={() => setHoveredBarAgent(null)}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                  cursor: "pointer",
                  width: 72,
                }}
              >
                {/* Upward arrow above avatar (fixed height to avoid layout shift) */}
                <div
                  style={{
                    height: 10,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderBottom: `7px solid ${color}`,
                      visibility:
                        hoveredBarAgent === d.agent.name ? "visible" : "hidden",
                    }}
                  />
                </div>

                {/* Avatar */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl}
                  alt={displayName}
                  width={52}
                  height={52}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    border: `3px solid ${color}`,
                    background: "#f0f0f0",
                    display: "block",
                  }}
                />

                {/* Name */}
                <div
                  style={{
                    fontFamily: PIXEL_FONT,
                    fontSize: 15,
                    color: "#000000",
                    textAlign: "center",
                    lineHeight: 1.1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    width: "100%",
                  }}
                >
                  {displayName}
                </div>

                {/* Next day label + countdown */}
                <div
                  style={{
                    textAlign: "center",
                    lineHeight: 1.3,
                    background: "rgba(0,0,0,0.55)",
                    borderRadius: 4,
                    padding: "2px 6px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: PIXEL_FONT,
                      fontSize: 12,
                      color: "#a0c4cc",
                      letterSpacing: "0.06em",
                    }}
                  >
                    NEXT DAY
                  </div>
                  <div
                    style={{
                      fontFamily: PIXEL_FONT,
                      fontSize: 18,
                      color: cdColor,
                      letterSpacing: "0.04em",
                      lineHeight: 1,
                    }}
                  >
                    {cdText}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Agent popup (tall: header + all trail life days) ─────────────────────────

function AgentPopup({
  agent,
  trailDays,
  pos,
  containerRef,
}: {
  agent: AgentOnMap;
  trailDays: LifeDay[];
  pos: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const POPUP_W = 300;
  const ENTRY_H = 70; // approx per entry
  const POPUP_H = 110 + trailDays.length * ENTRY_H;

  const container = containerRef.current;
  let px = pos.x + 16,
    py = pos.y - 16;
  if (container) {
    const { width, height } = container.getBoundingClientRect();
    if (px + POPUP_W > width - 8) px = pos.x - POPUP_W - 16;
    if (py + POPUP_H > height - 8) py = height - POPUP_H - 8;
    if (py < 8) py = 8;
    if (px < 8) px = 8;
  }

  return (
    <div
      className="rpg-popup absolute pointer-events-none"
      style={{
        left: px,
        top: py,
        width: POPUP_W,
        zIndex: 60,
        fontFamily: "'VT323', monospace",
      }}
    >
      {/* Agent header */}
      <div className="flex items-center gap-2 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(agent.name)}&backgroundColor=ffffff`}
          alt={agent.displayName}
          width={36}
          height={36}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: `2px solid ${agent.color}`,
            background: "#f0f0f0",
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{ color: agent.color, fontSize: 22, lineHeight: 1 }}>
            {agent.displayName}
          </div>
          <div style={{ color: "#8892a4", fontSize: 16, lineHeight: 1 }}>
            @{agent.name}
          </div>
          <div style={{ color: "#6a7a8e", fontSize: 14, lineHeight: 1 }}>
            {agent.latestLifeDay.location.city},{" "}
            {agent.latestLifeDay.location.country}
          </div>
        </div>
      </div>

      {trailDays.length > 0 && (
        <>
          <div style={{ borderTop: "1px solid #2a3a4a", marginBottom: 6 }} />
          <div style={{ color: "#6a7a8e", fontSize: 14, marginBottom: 6 }}>
            {trailDays.length} entr{trailDays.length !== 1 ? "ies" : "y"}
          </div>
          {trailDays.map((day, i) => {
            const proxyPhoto = day.photo.originalUrl
              ? `/api/photos/proxy?url=${encodeURIComponent(day.photo.originalUrl)}`
              : null;
            return (
              <div
                key={day._id || i}
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 8,
                  alignItems: "flex-start",
                }}
              >
                {/* Photo thumbnail */}
                <div
                  style={{
                    width: 52,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: 2,
                    overflow: "hidden",
                    background: "#1a2a3a",
                    border: `1px solid ${agent.color}44`,
                  }}
                >
                  {proxyPhoto && <PhotoThumb src={proxyPhoto} alt="" />}
                </div>
                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ color: agent.color, fontSize: 15, lineHeight: 1 }}
                  >
                    Day {day.roundNumber} · Age {day.fictionalAge}
                  </div>
                  <div
                    style={{ color: "#6a7a8e", fontSize: 13, lineHeight: 1 }}
                  >
                    {day.location.city} · {fmtDate(day.fictionalDate)}
                  </div>
                  <div
                    style={{
                      color: "#a8b2c4",
                      fontSize: 14,
                      lineHeight: 1.2,
                      marginTop: 2,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {day.thoughtBubble}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── Trail day popup (single day) ─────────────────────────────────────────────

function TrailDayPopup({
  day,
  agentColor,
  agentName,
  pos,
  containerRef,
}: {
  day: LifeDay;
  agentColor: string;
  agentName: string;
  pos: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const proxyPhoto = day.photo.originalUrl
    ? `/api/photos/proxy?url=${encodeURIComponent(day.photo.originalUrl)}`
    : null;

  const POPUP_W = 260;
  const POPUP_H = proxyPhoto ? 240 : 160;

  const container = containerRef.current;
  let px = pos.x + 14,
    py = pos.y - 14;
  if (container) {
    const { width, height } = container.getBoundingClientRect();
    if (px + POPUP_W > width - 8) px = pos.x - POPUP_W - 14;
    if (py + POPUP_H > height - 8) py = pos.y - POPUP_H;
    if (py < 8) py = 8;
    if (px < 8) px = 8;
  }

  return (
    <div
      className="rpg-popup absolute pointer-events-none"
      style={{
        left: px,
        top: py,
        width: POPUP_W,
        zIndex: 60,
        fontFamily: "'VT323', monospace",
      }}
    >
      {/* Day header */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ color: agentColor, fontSize: 19, lineHeight: 1 }}>
          {agentName} · Day {day.roundNumber}
        </div>
        <div style={{ color: "#a8b2c4", fontSize: 16, lineHeight: 1.2 }}>
          Age {day.fictionalAge} · {day.location.city}, {day.location.country}
        </div>
        <div style={{ color: "#6a7a8e", fontSize: 14 }}>
          {fmtDate(day.fictionalDate)}
        </div>
      </div>

      {/* Photo */}
      {proxyPhoto && (
        <div
          style={{
            width: "100%",
            height: 110,
            borderRadius: 3,
            overflow: "hidden",
            marginBottom: 6,
            border: `1px solid ${agentColor}44`,
          }}
        >
          <PhotoThumb src={proxyPhoto} alt={day.photo.caption} />
        </div>
      )}

      <div style={{ borderTop: "1px solid #2a3a4a", marginBottom: 5 }} />

      {/* Thought bubble */}
      <div
        style={{
          color: "#c8d8e8",
          fontSize: 16,
          lineHeight: 1.3,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
        }}
      >
        &ldquo;{day.thoughtBubble}&rdquo;
      </div>
    </div>
  );
}
