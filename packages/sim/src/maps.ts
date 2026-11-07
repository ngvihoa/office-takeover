import office01 from '../maps/office-01.json';
import type { MapDef } from './types';

/** Bundled maps. JSON imports widen tuples to arrays, so they are asserted here once (buildWorld validates the graph). */
export const MAPS: Record<string, MapDef> = {
  'office-01': office01 as unknown as MapDef,
};
