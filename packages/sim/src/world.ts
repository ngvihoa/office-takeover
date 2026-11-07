import { type Config, DEFAULT_CONFIG } from './config';
import type { MapDef, PathInfo, World } from './types';

interface Graph {
  ids: string[];
  pos: Map<string, [number, number]>;
  adj: Map<string, { to: string; len: number }[]>;
}

function buildGraph(map: MapDef): Graph {
  const ids = Object.keys(map.corridor.nodes).sort();
  const pos = new Map(ids.map((id) => [id, map.corridor.nodes[id] as [number, number]]));
  const adj = new Map<string, { to: string; len: number }[]>(ids.map((id) => [id, []]));
  for (const [a, b] of map.corridor.edges) {
    const pa = pos.get(a);
    const pb = pos.get(b);
    if (!pa || !pb) throw new Error(`map ${map.id}: edge ${a}-${b} references an unknown node`);
    if (pa[0] !== pb[0] && pa[1] !== pb[1]) throw new Error(`map ${map.id}: edge ${a}-${b} is not axis-aligned`);
    const len = Math.abs(pa[0] - pb[0]) + Math.abs(pa[1] - pb[1]);
    adj.get(a)?.push({ to: b, len });
    adj.get(b)?.push({ to: a, len });
  }
  for (const list of adj.values()) list.sort((x, y) => (x.to < y.to ? -1 : x.to > y.to ? 1 : 0));
  return { ids, pos, adj };
}

/** Dijkstra from one node. Ties break on node id so results never depend on insertion order. */
function shortest(g: Graph, src: string): { dist: Map<string, number>; prev: Map<string, string> } {
  const dist = new Map<string, number>([[src, 0]]);
  const prev = new Map<string, string>();
  const done = new Set<string>();
  for (;;) {
    let best: string | null = null;
    for (const id of g.ids) {
      if (done.has(id)) continue;
      const d = dist.get(id);
      if (d === undefined) continue;
      if (best === null || d < (dist.get(best) as number)) best = id;
    }
    if (best === null) break;
    done.add(best);
    const base = dist.get(best) as number;
    for (const e of g.adj.get(best) ?? []) {
      const nd = base + e.len;
      const cur = dist.get(e.to);
      if (cur === undefined || nd < cur) {
        dist.set(e.to, nd);
        prev.set(e.to, best);
      }
    }
  }
  return { dist, prev };
}

function trace(prev: Map<string, string>, src: string, dst: string): string[] {
  const out = [dst];
  let cur = dst;
  while (cur !== src) {
    cur = prev.get(cur) as string;
    out.push(cur);
  }
  return out.reverse();
}

/** Precompute corridor paths between every pair of rooms (shortest over all door pairs). */
export function buildWorld(map: MapDef, config: Config = DEFAULT_CONFIG): World {
  const g = buildGraph(map);
  map.towers.forEach((t, i) => {
    if (t.id !== i) throw new Error(`map ${map.id}: tower ids must be 0..n-1 in order`);
    if (t.doors.length === 0) throw new Error(`map ${map.id}: tower ${t.name} has no door`);
    for (const d of t.doors) if (!g.pos.has(d.node)) throw new Error(`map ${map.id}: unknown door node ${d.node}`);
  });
  const fromDoor = new Map<string, ReturnType<typeof shortest>>();
  for (const t of map.towers)
    for (const d of t.doors) if (!fromDoor.has(d.node)) fromDoor.set(d.node, shortest(g, d.node));

  const paths: (PathInfo | undefined)[][] = map.towers.map((a) =>
    map.towers.map((b) => {
      if (a.id === b.id) return undefined;
      let best: { len: number; src: string; dst: string } | null = null;
      for (const da of a.doors) {
        const sp = fromDoor.get(da.node);
        for (const db of b.doors) {
          const len = sp?.dist.get(db.node);
          if (len === undefined) continue;
          const key = `${da.node}|${db.node}`;
          if (!best || len < best.len || (len === best.len && key < `${best.src}|${best.dst}`)) {
            best = { len, src: da.node, dst: db.node };
          }
        }
      }
      if (!best) throw new Error(`map ${map.id}: no corridor path from ${a.name} to ${b.name}`);
      const nodes = trace((fromDoor.get(best.src) as ReturnType<typeof shortest>).prev, best.src, best.dst);
      return { length: best.len, points: nodes.map((n) => g.pos.get(n) as [number, number]) };
    }),
  );
  return { map, config, paths };
}

export function pathLength(world: World, from: number, to: number): number {
  return world.paths[from]?.[to]?.length ?? 0;
}
