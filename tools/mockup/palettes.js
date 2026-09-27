// Art-directed palettes, one per time of day (the Mark Ferrari approach: the art stays, the palette
// changes). Every material is a short ramp, dark to light, hue-shifted: shadows lean cool, lights
// lean warm. Colours are shared across ramps where the materials are cousins.
import { hex } from './color.js';

const P = list => list.map(hex);

export const KEYFRAMES = {
  day: {
    ink: '#11151e',
    sky: ['#2b5ea9', '#3a72bd', '#548ccd', '#78a9dc', '#a8c9e6', '#d4e5ee'],
    haze: ['#4f6b88', '#6a87a3', '#8ea8bd', '#b5cad6', '#d4e5ee'],
    ramps: {
      grass: ['#1c3a32', '#2b5a34', '#467b37', '#6b9c3c', '#9fc050'],
      grass2: ['#2e3b2a', '#4b582b', '#717c33', '#9a9d44'],
      rock: ['#2c2d39', '#4a4953', '#716b69', '#9c9181', '#c8bba0'],
      snow: ['#7489a9', '#a5b8cf', '#d3dfe8', '#f4f6f0'],
      water: ['#143a60', '#1e5689', '#2b72a9', '#4a93c6', '#86bddc'],
      stone: ['#34343f', '#57545c', '#7f7a78', '#aaa192', '#d6cbb1'],
      wood: ['#2b1d18', '#4b3324', '#735032', '#9c7245'],
      road: ['#4c3e31', '#75624b', '#9e8767', '#c8af85'],
      leaf: ['#0f2620', '#19402b', '#275f31', '#3d8035', '#62a13e'],
      conifer: ['#0d201f', '#14352a', '#1f4c31', '#2e6636'],
      cloud: ['#9aafc7', '#cbd8e4', '#f2f5f4'],
      skin: ['#8f5d45', '#c98b66', '#edbd94'],
      dark: ['#1b1820', '#2f2931', '#463d42'],
      robe0: ['#5e2226', '#943630', '#c1573c'], robe1: ['#1f2c52', '#334a84', '#5173ad'],
      robe2: ['#1d3a26', '#33593a', '#54804a'], robe3: ['#3e2a1f', '#684831', '#967049'],
      fire: ['#8a2a18', '#d0542a', '#f59038', '#ffcd5e', '#fff4cc'],
      lit: ['#3b2622', '#6b3f2b', '#a4653a', '#d8964c', '#f8c870'],
      sun: ['#ffe7a6', '#fff6d4'], moon: ['#b9c2d0', '#e6eaf0'],
    },
    glow: '#ffe7a6', star: '#dfe6f2', starBright: '#ffffff', bird: '#1b1820',
  },
  dusk: {
    ink: '#120f1a',
    sky: ['#231f4a', '#3a2e62', '#62406c', '#9a546a', '#d27660', '#f0a86c'],
    haze: ['#4a3a5a', '#6e4d66', '#9a626c', '#c98272', '#f0a86c'],
    ramps: {
      grass: ['#1a1a28', '#2a2c2e', '#43482f', '#6a6a36', '#9a8a44'],
      grass2: ['#1f1c26', '#38352c', '#5c5530', '#86783c'],
      rock: ['#1f1a28', '#3a2f3e', '#5e4852', '#8e6760', '#c48f72'],
      snow: ['#5a5578', '#8a7c9a', '#c3a6ae', '#f2cfb4'],
      water: ['#17163a', '#26255a', '#423a70', '#6a4f7a', '#a56e78'],
      stone: ['#231d2c', '#3f3242', '#654c56', '#957062', '#cb9a78'],
      wood: ['#1d141a', '#3a2524', '#5e3a2c', '#87573a'],
      road: ['#2e2226', '#52392f', '#7c563c', '#aa7c50'],
      leaf: ['#0f1119', '#1a1f22', '#2b3326', '#454a2c', '#6c6636'],
      conifer: ['#0d0f17', '#161a1f', '#232a24', '#343c2a'],
      cloud: ['#6b4a6a', '#b86e70', '#f0a98a'],
      skin: ['#6e4040', '#b0725a', '#e0a47c'],
      dark: ['#150f18', '#261c26', '#3a2c34'],
      robe0: ['#4a1c22', '#7e2e2e', '#b04a3a'], robe1: ['#1a1c40', '#2e3462', '#4a5288'],
      robe2: ['#1a2420', '#2e3c2e', '#4a5a3c'], robe3: ['#2e1e1c', '#553628', '#80563a'],
      fire: ['#8a2a18', '#d0542a', '#f59038', '#ffcd5e', '#fff4cc'],
      lit: ['#3a2222', '#6a3a2a', '#a45a36', '#d8884a', '#f8c070'],
      sun: ['#ff9a58', '#ffd9a0'], moon: ['#a8a4b8', '#d9dce6'],
    },
    glow: '#ff9a58', star: '#b8b0d0', starBright: '#e8e0f4', bird: '#150f18',
  },
  night: {
    ink: '#05070c',
    sky: ['#03050b', '#060a16', '#0a1122', '#0f182e', '#16223a', '#1d2c46'],
    haze: ['#0d1626', '#142034', '#1c2b42', '#25374f', '#1d2c46'],
    ramps: {
      grass: ['#050b0e', '#0a1518', '#102224', '#183230', '#24463f'],
      grass2: ['#070b0d', '#0f1616', '#18221f', '#243027'],
      rock: ['#06080d', '#0d121b', '#172030', '#253247', '#3a4b63'],
      snow: ['#25324a', '#3d4f6c', '#62789a', '#93a8c4'],
      water: ['#03070f', '#07101f', '#0c1a30', '#142745', '#203a5e'],
      stone: ['#07090f', '#0f141e', '#1b2331', '#2c3749', '#445066'],
      wood: ['#08070b', '#120f13', '#1d181c', '#2a2226'],
      road: ['#0b0c10', '#15171c', '#22252b', '#32363c'],
      leaf: ['#03080a', '#061112', '#0a1b1b', '#112a26', '#1b3c33'],
      conifer: ['#03070a', '#051010', '#081a18', '#0e2622'],
      cloud: ['#0f1626', '#1a2438', '#283650'],
      skin: ['#3a3440', '#5e5460', '#8a7c84'],
      dark: ['#040508', '#0b0c12', '#15161e'],
      robe0: ['#1e0f16', '#33171f', '#4d2530'], robe1: ['#0c1024', '#141c3a', '#1f2c52'],
      robe2: ['#0a1410', '#12201a', '#1c3026'], robe3: ['#140e10', '#241a1a', '#382a26'],
      fire: ['#6a1c12', '#b8421f', '#ec7a30', '#ffbb4c', '#ffecb0'],
      lit: ['#1e1418', '#3e2320', '#6e3a26', '#a85c30', '#de8c40', '#ffc466'],
      sun: ['#ff9a58', '#ffb268'], moon: ['#b8c0cc', '#e2e7f0'],
    },
    glow: '#404860', star: '#8e9cb8', starBright: '#e6ecf8', bird: '#0b0c12',
  },
};

export function keyframeFor(hour) {
  if (hour >= 7 && hour < 17) return 'day';
  if ((hour >= 5 && hour < 7) || (hour >= 17 && hour < 19.5)) return 'dusk';
  return 'night';
}

// Resolve a keyframe to RGB arrays and give every ramp an id.
export function resolve(name) {
  const k = KEYFRAMES[name];
  const ramps = {};
  for (const [n, list] of Object.entries(k.ramps)) ramps[n] = P(list);
  ramps.sky = P(k.sky); ramps.haze = P(k.haze);
  ramps.ink = [hex(k.ink)]; ramps.star = [hex(k.star), hex(k.starBright)];
  return { name, ramps, ink: hex(k.ink), glow: hex(k.glow), star: hex(k.star), starBright: hex(k.starBright), bird: hex(k.bird) };
}

// A strict 16-colour palette for the "ink" candidate: one foreground colour per cell on a fixed ink.
export const SIXTEEN = P(['#0b0d13', '#1d2b4a', '#3a6ea5', '#8bbbdc', '#1e4a2e', '#4f8a3a', '#a9cb58', '#6b4a2f',
  '#c7a676', '#5a5e6c', '#a9a8a0', '#eef0e6', '#b8402f', '#ea8a3a', '#f6d46c', '#6c4a7c']);
