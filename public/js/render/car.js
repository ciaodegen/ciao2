// Low-poly araba modelleri. Her araba tek bir köşe-renkli (vertex color) mesh'ten
// oluşur; böylece 50 araba bile telefonda akıcı çizilir.

import * as THREE from '../../vendor/three.module.js';
import { hashString } from '../shared/rules.js';
import { fold } from '../shared/plates.js';

const BODY_COLORS = [
  '#d62828', '#f4f1de', '#1d3557', '#f2a900', '#2a9d8f', '#7b2cbf',
  '#e5383b', '#3a86ff', '#fb5607', '#06a77d', '#9aa5b1', '#22262e',
  '#ff70a6', '#70d6ff', '#8d99ae', '#b5179e',
];
const ACCENTS = ['#ffd23f', '#00f5d4', '#ff4d6d', '#4cc9f0', '#b8f35d', '#f15bb5'];
const GOLD = '#d9a92a';

const bodyMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
const geometryCache = new Map();

function paint(geometry, color) {
  const c = new THREE.Color(color);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function box(w, h, d, x, y, z, color) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.translate(x, y, z);
  return paint(g, color);
}

function wheel(x, y, z, radius, width, color) {
  const g = new THREE.CylinderGeometry(radius, radius, width, 10).toNonIndexed();
  g.rotateZ(Math.PI / 2);
  g.translate(x, y, z);
  return paint(g, color);
}

function ball(r, x, y, z, color) {
  const g = new THREE.IcosahedronGeometry(r, 0).toNonIndexed();
  g.translate(x, y, z);
  return paint(g, color);
}

export function mergeGeometries(list) {
  let total = 0;
  for (const g of list) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  let offset = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, offset * 3);
    nor.set(g.attributes.normal.array, offset * 3);
    col.set(g.attributes.color.array, offset * 3);
    offset += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

export function carLook(id, garage) {
  const h = hashString(id);
  return {
    body: garage >= 5 ? GOLD : BODY_COLORS[h % BODY_COLORS.length],
    accent: ACCENTS[(h >>> 5) % ACCENTS.length],
  };
}

function buildCarGeometry(look, garage, decorated) {
  const parts = [];
  const body = look.body;
  const glass = '#1b2433';
  const dark = '#15171c';
  const light = new THREE.Color(body).getHSL({}).l;
  const stripe = light > 0.7 ? '#15171c' : '#f8f8f2';

  // Gövde, kabin, tavan
  parts.push(box(1.9, 0.55, 4.1, 0, 0.575, 0, body));
  parts.push(box(1.86, 0.12, 3.6, 0, 0.9, -0.05, body));
  parts.push(box(1.62, 0.48, 2.0, 0, 1.18, 0.3, glass));
  parts.push(box(1.58, 0.1, 1.8, 0, 1.45, 0.3, body));
  // Tamponlar
  parts.push(box(1.94, 0.2, 0.16, 0, 0.36, 2.06, dark));
  parts.push(box(1.94, 0.2, 0.16, 0, 0.36, -2.06, dark));
  // Stop lambaları ve farlar
  parts.push(box(0.42, 0.14, 0.06, -0.66, 0.72, 2.07, '#ff2338'));
  parts.push(box(0.42, 0.14, 0.06, 0.66, 0.72, 2.07, '#ff2338'));
  parts.push(box(0.4, 0.14, 0.06, -0.66, 0.68, -2.07, '#fff3c4'));
  parts.push(box(0.4, 0.14, 0.06, 0.66, 0.68, -2.07, '#fff3c4'));
  // Tekerlekler
  for (const x of [-0.9, 0.9]) {
    for (const z of [-1.3, 1.3]) {
      parts.push(wheel(x, 0.36, z, 0.36, 0.3, '#111214'));
      if (garage >= 1) parts.push(wheel(x + Math.sign(x) * 0.16, 0.36, z, 0.21, 0.04, look.accent));
    }
  }
  // Modifiye: spoiler
  if (garage >= 2) {
    parts.push(box(0.08, 0.26, 0.1, -0.62, 0.98, 1.78, dark));
    parts.push(box(0.08, 0.26, 0.1, 0.62, 0.98, 1.78, dark));
    parts.push(box(1.84, 0.07, 0.42, 0, 1.13, 1.82, garage >= 5 ? dark : look.accent));
  }
  // Modifiye: yarış şeridi
  if (garage >= 4) {
    parts.push(box(0.42, 0.02, 4.12, 0, 0.965, -0.05, stripe));
    parts.push(box(0.42, 0.02, 1.82, 0, 1.51, 0.3, stripe));
  }
  // Düğün arabası süsü (konvoydaki damat)
  if (decorated) {
    parts.push(box(0.06, 0.04, 2.3, -0.55, 0.99, -0.95, '#ffffff'));
    parts.push(box(0.06, 0.04, 2.3, 0.55, 0.99, -0.95, '#ffffff'));
    parts.push(ball(0.22, 0, 1.08, -1.6, '#ff4d8d'));
    parts.push(ball(0.16, -0.22, 1.05, -1.75, '#ffffff'));
    parts.push(ball(0.16, 0.22, 1.05, -1.75, '#ffffff'));
    parts.push(ball(0.13, 0, 1.06, -1.95, '#ff8fb7'));
    parts.push(box(1.2, 0.05, 0.05, 0, 1.52, -0.65, '#ffffff'));
  }
  return mergeGeometries(parts);
}

function carGeometry(look, garage, decorated) {
  const key = `${look.body}|${look.accent}|${garage}|${decorated ? 1 : 0}`;
  if (!geometryCache.has(key)) geometryCache.set(key, buildCarGeometry(look, garage, decorated));
  return geometryCache.get(key);
}

// ---------------------------------------------------------------- plaka

function plateLetters(name, id) {
  const letters = fold(name || id).toUpperCase().replace(/[^A-Z]/g, '');
  const two = (letters + 'PY').slice(0, 2);
  const digits = String(100 + (hashString(id) % 900));
  return `${two} ${digits}`;
}

function drawPlate(canvas, code, name, id) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#f7f7f2';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.fillStyle = '#1f4fd8';
  ctx.fillRect(4, 4, 34, h - 8);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TR', 21, h - 18);
  ctx.fillStyle = '#111';
  ctx.font = 'bold 38px Arial, sans-serif';
  const plate = code ? String(code).padStart(2, '0') : '--';
  ctx.fillText(`${plate} ${plateLetters(name, id)}`, 38 + (w - 38) / 2, h / 2 + 2);
}

const plateGeometry = new THREE.PlaneGeometry(0.98, 0.23);

// ---------------------------------------------------------------- gölge, neon, alev

function radialTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let shared = null;
function sharedAssets() {
  if (shared) return shared;
  const shadowTex = radialTexture('rgba(0,0,0,0.55)', 'rgba(0,0,0,0)');
  const glowTex = radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  shared = {
    shadowGeo: new THREE.PlaneGeometry(2.9, 5.0).rotateX(-Math.PI / 2),
    shadowMat: new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
    neonGeo: new THREE.PlaneGeometry(3.2, 5.4).rotateX(-Math.PI / 2),
    glowTex,
    flameGeo: new THREE.ConeGeometry(0.15, 0.8, 8).rotateX(Math.PI / 2).translate(0, 0, 0.4),
    flameMat: new THREE.MeshBasicMaterial({ color: '#ff7a1a', transparent: true, opacity: 0.95 }),
    flameCoreMat: new THREE.MeshBasicMaterial({ color: '#fff27a' }),
  };
  return shared;
}

// ---------------------------------------------------------------- araba görünümü

export class CarView {
  constructor(car, scene) {
    const a = sharedAssets();
    this.id = car.id;
    this.group = new THREE.Group();
    this.mesh = new THREE.Mesh(undefined, bodyMaterial);
    this.group.add(this.mesh);

    const shadow = new THREE.Mesh(a.shadowGeo, a.shadowMat);
    shadow.position.y = 0.03;
    shadow.renderOrder = -1;
    this.group.add(shadow);

    this.neon = new THREE.Mesh(a.neonGeo, new THREE.MeshBasicMaterial({
      map: a.glowTex, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.neon.position.y = 0.05;
    this.neon.visible = false;
    this.group.add(this.neon);

    this.plateCanvas = document.createElement('canvas');
    this.plateCanvas.width = 256;
    this.plateCanvas.height = 60;
    this.plateTex = new THREE.CanvasTexture(this.plateCanvas);
    this.plateTex.colorSpace = THREE.SRGBColorSpace;
    this.plateTex.anisotropy = 4;
    const plate = new THREE.Mesh(plateGeometry, new THREE.MeshBasicMaterial({ map: this.plateTex }));
    plate.position.set(0, 0.6, 2.15);
    this.group.add(plate);

    this.flames = new THREE.Group();
    for (const x of [-0.5, 0.5]) {
      const f = new THREE.Mesh(a.flameGeo, a.flameMat);
      f.position.set(x, 0.4, 2.12);
      const core = new THREE.Mesh(a.flameGeo, a.flameCoreMat);
      core.scale.set(0.5, 0.5, 0.6);
      f.add(core);
      this.flames.add(f);
    }
    this.flames.visible = false;
    this.group.add(this.flames);

    this.appliedKey = '';
    scene.add(this.group);
  }

  refresh(car, decorated) {
    const prof = car.player.profile;
    const garage = prof.garage || 0;
    const key = `${car.version}|${garage}|${decorated}|${prof.plate}|${prof.name}`;
    if (key === this.appliedKey) return;
    this.appliedKey = key;
    const look = carLook(car.id, garage);
    this.mesh.geometry = carGeometry(look, garage, decorated);
    this.neon.visible = garage >= 3;
    this.neon.material.color.set(look.accent);
    drawPlate(this.plateCanvas, prof.plate, prof.name, car.id);
    this.plateTex.needsUpdate = true;
  }

  update(car, x, z, time, nitro) {
    this.group.position.set(x, 0, z);
    this.group.rotation.y = car.spin || 0;
    const moving = car.speed > 1;
    this.mesh.position.y = moving ? Math.sin(time * 18 + x) * 0.015 : Math.sin(time * 30 + x * 3) * 0.008;
    this.flames.visible = nitro;
    if (nitro) {
      const s = 0.8 + Math.random() * 0.5;
      for (const f of this.flames.children) f.scale.set(1, 1, s);
    }
    if (this.neon.visible) this.neon.material.opacity = 0.7 + Math.sin(time * 4) * 0.15;
  }

  dispose(scene) {
    scene.remove(this.group);
    this.plateTex.dispose();
    this.neon.material.dispose();
  }
}

// ---------------------------------------------------------------- tır

export function buildTruck() {
  const parts = [];
  parts.push(box(2.6, 3.0, 11, 0, 2.0, 1.6, '#e9ecef'));
  parts.push(box(2.62, 0.5, 11.02, 0, 0.75, 1.6, '#c1121f'));
  parts.push(box(2.5, 2.4, 2.6, 0, 1.6, -5.4, '#c1121f'));
  parts.push(box(2.3, 0.9, 0.08, 0, 2.2, -6.72, '#1b2433'));
  for (const x of [-1.2, 1.2]) {
    for (const z of [-5.2, 2.5, 4.2, 5.8]) parts.push(wheel(x, 0.5, z, 0.5, 0.4, '#111214'));
  }
  const mesh = new THREE.Mesh(mergeGeometries(parts), bodyMaterial);
  return mesh;
}
