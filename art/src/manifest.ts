import { ICONS, type IconName, iconSize } from '../../packages/design/src/icons';
import * as furniture from '../../packages/design/src/paint/map';
import { digits, icon, notchedBox } from '../../packages/design/src/paint/painter';
import { map, primitive as p, type TeamId, team } from '../../packages/design/src/tokens';
import type { FrameSpec, Raster } from '../scripts/lib';
import bitmaps from './bitmaps.json';

export interface Source extends FrameSpec {
  draw(g: Raster, t: TeamId): void;
}
const canvas = (reason: string, x: number, y: number): FrameSpec['canvas'] => ({ reason, pivot: [x, y] });
export const sources: Source[] = [];
const add = (spec: FrameSpec, draw: Source['draw']) => sources.push({ ...spec, draw });

// These painters remain the source of truth: never duplicate their pixel geometry here.
for (const name of Object.keys(ICONS) as IconName[]) {
  const { w, h } = iconSize(name);
  add({ name: `icon_${name}`, width: w, height: h, canvas: canvas('Original icon alignment canvas', 0, 0) }, (g) =>
    icon(g, name, 0, 0),
  );
}
for (const ch of '0123456789+-/:%?s ') {
  const codepoint = ch.codePointAt(0) as number;
  const width = ch === ' ' ? 3 : 5;
  add(
    {
      name: `digit_${codepoint}`,
      width,
      height: 7,
      canvas: { reason: 'Fixed glyph baseline and advance', pivot: [0, 7], blank: ch === ' ' },
      glyph: { codepoint, xAdvance: (ch === ':' ? 1 : width) + 1 },
    },
    (g) => digits(g, 0, 0, ch, p.white),
  );
}
for (const kind of ['pc', 'phone', 'tablet', 'chart', 'paper'] as const) {
  add({ name: `desk_${kind}`, width: 20, height: 17, team: true, painterOrigin: [1, 1] }, (g, t) =>
    furniture.desk(g, 1, 1, t, kind),
  );
}
add({ name: 'cabinet', width: 10, height: 16, painterOrigin: [0, 0] }, (g) => furniture.cabinet(g, 0, 0));
add({ name: 'plant', width: 11, height: 12, painterOrigin: [0, 0] }, (g) => furniture.plant(g, 0, 0));
add({ name: 'rack', width: 12, height: 20, painterOrigin: [0, 0] }, (g) => furniture.rack(g, 0, 0));
add({ name: 'sofa', width: 26, height: 11, painterOrigin: [1, 1] }, (g) => furniture.sofa(g, 1, 1));
add({ name: 'pantry', width: 40, height: 15, painterOrigin: [1, 5] }, (g) => furniture.pantryCounter(g, 1, 5, 38));
add({ name: 'meeting_table', width: 32, height: 28, team: true, painterOrigin: [1, 7] }, (g, t) =>
  furniture.meetingTable(g, 1, 7, 30, 14, t),
);
add({ name: 'round_table', width: 30, height: 14, team: true, painterOrigin: [9, 1] }, (g, t) =>
  furniture.roundTable(g, 9, 1, t),
);
add({ name: 'boss_desk', width: 38, height: 28, team: true, painterOrigin: [1, 1] }, (g, t) =>
  furniture.bossDesk(g, 1, 1, t),
);
add({ name: 'boss_rug', width: 40, height: 28, painterOrigin: [0, 0] }, (g) => furniture.rug(g, 0, 0, 40, 28));
add({ name: 'bug_board', width: 22, height: 14, painterOrigin: [1, 1] }, (g) => furniture.bugBoard(g, 1, 1));
add({ name: 'easel', width: 16, height: 14, painterOrigin: [1, 1] }, (g) => furniture.easel(g, 1, 1));

for (const direction of ['up', 'down', 'left', 'right']) {
  for (const frame of [0, 1]) {
    add(
      {
        name: `person_{team}_${direction}_${frame}`,
        width: 5,
        height: 7,
        team: true,
        canvas: canvas('Walking animation foot anchor', 2, 7),
        animation: { direction, frame, fps: 6 },
      },
      (g, t) => furniture.person(g, 0, 0, t, frame, direction),
    );
  }
}

add({ name: 'tile_corridor', width: 16, height: 16 }, (g) => {
  g.rect(0, 0, 16, 16, map.corridor);
  g.rect(0, 0, 16, 1, map.corridorLine);
  g.rect(0, 0, 1, 16, map.corridorLine);
});
add({ name: 'tile_carpet', width: 8, height: 8 }, (g) => {
  g.rect(0, 0, 8, 8, p.sand);
  g.rect(0, 0, 4, 4, p.tan);
});
for (const t of Object.keys(team) as TeamId[]) {
  add({ name: `carpet_${t}`, width: 8, height: 8, derived: true }, (g) => {
    g.rect(0, 0, 8, 8, team[t].carpet);
    g.rect(0, 0, 4, 4, p.tan);
  });
}
for (const [name, width, height] of [
  ['wall_horizontal', 16, 3],
  ['wall_vertical', 3, 16],
  ['wall_corner', 3, 3],
] as const) {
  add({ name, width, height }, (g) => g.rect(0, 0, width, height, map.wall));
}
add({ name: 'wall_face', width: 16, height: 12 }, (g) => {
  g.rect(0, 0, 16, 12, map.wallFace);
  g.rect(0, 0, 16, 3, map.wall);
  g.rect(0, 3, 16, 1, map.wallFaceLight);
  g.rect(0, 11, 16, 1, map.wallFaceBase);
});
add({ name: 'door_frame', width: 3, height: 12 }, (g) => {
  g.rect(0, 0, 3, 12, p.ink);
  g.rect(1, 1, 1, 10, p.wood);
});
add({ name: 'door_mat', width: 18, height: 3, team: true }, (g, t) => {
  g.rect(0, 0, 18, 3, team[t].main);
  g.rect(0, 0, 18, 1, team[t].light);
  g.rect(0, 2, 18, 1, team[t].dark);
});

// Blank count-plate shell uses the same notchedBox geometry as countPlate, without baked digits.
add(
  { name: 'count_plate', width: 20, height: 16, team: true, nineSlice: { left: 3, right: 3, top: 3, bottom: 4 } },
  (g, t) => {
    notchedBox(g, 0, 0, 20, 15, team[t].main);
    g.rect(2, 2, 16, 11, p.ink);
    g.rect(1, 15, 18, 1, p.ink);
  },
);
for (const [name, fill] of [
  ['ui_panel', p.white],
  ['ui_button', p.magenta],
  ['ui_button_pressed', p.plum],
] as const) {
  const pressed = name === 'ui_button_pressed';
  add({ name, width: 12, height: pressed ? 10 : 12, nineSlice: { left: 3, right: 3, top: 3, bottom: 3 } }, (g) => {
    notchedBox(g, 0, 0, 12, 10, fill);
    if (!pressed) g.rect(1, 10, 10, 2, p.ink);
    g.rect(1, 8, 10, 1, name === 'ui_panel' ? p.gray100 : p.plum);
  });
}
add({ name: 'particle', width: 2, height: 2, team: true }, (g, t) => g.rect(0, 0, 2, 2, team[t].main));

for (const [name, rows] of Object.entries(bitmaps)) {
  const cursor = name.startsWith('cursor_');
  const size = cursor ? 12 : 7;
  const hotspot: [number, number] = name === 'cursor_default' ? [0, 0] : name === 'cursor_pointer' ? [4, 0] : [5, 5];
  add(
    {
      name,
      width: size,
      height: size,
      ...(cursor ? { hotspot, canvas: canvas('Fixed cursor canvas and hotspot', ...hotspot) } : {}),
    },
    (g) => {
      if (rows.length !== size) throw new Error(`Wrong bitmap height: ${name}`);
      rows.forEach((row, y) => {
        if (row.length !== size) throw new Error(`Wrong bitmap width: ${name}`);
        [...row].forEach((ch, x) => {
          if (ch !== '.') {
            const color = { '#': p.ink, w: p.white, y: p.yellow }[ch];
            if (!color) throw new Error(`Unknown bitmap color: ${ch}`);
            g.rect(x, y, 1, 1, color);
          }
        });
      });
    },
  );
}
