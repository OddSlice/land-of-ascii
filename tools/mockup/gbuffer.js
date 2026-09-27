// Load a scene's G-buffer (tools/frames/<scene>/) dumped by capture-gbuffer.mjs.
const TYPES = { Uint8Array, Int32Array, Uint32Array, Float32Array };
export async function loadScene(name) {
  const base = `../frames/${name}/`;
  const meta = await (await fetch(base + 'meta.json')).json();
  const ch = {};
  await Promise.all(meta.channels.map(async c => {
    const buf = await (await fetch(base + c.name + '.bin')).arrayBuffer();
    ch[c.name] = new TYPES[c.type](buf);
  }));
  return { meta, ch, W: meta.cols, H: meta.rows };
}
// G-buffer kinds, as recorded by the instrumented v1 renderer.
export const K = { SKY: 0, TERRAIN: 1, WALL: 2, TOP: 3, UNDER: 4, TREE: 5, CONIFER: 6, BUSH: 7, TRUNK: 8, BOULDER: 9, MERCHANT: 10, BIRD: 11, CLOUD: 12, FLAME: 13, LOGS: 14, BRACKET: 15, SUN: 16, MOON: 17, NONE: 255 };
export const MAT = { WATER: 0, GRASS: 1, ROCK: 2, SNOW: 3, HAZE: 4, STONE: 5, WOOD: 6, LEAF: 7, ROAD: 8, GRASS2: 9 };
export const PART = { STAFF: 1, LANTERN: 2, BOOTS: 3, TROUSERS: 4, BELT: 5, ROBE: 6, FOLD: 7, HAND: 8, SLEEVE: 9, FACE: 10, EYE: 11, BRIM: 12, CROWN: 13 };
