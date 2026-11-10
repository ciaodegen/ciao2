// 3D dünya: yol, apartmanlar, ağaçlar, bitiş takı, kamera ve efektler.

import * as THREE from '../../vendor/three.module.js';
import { CarView, buildTruck } from './car.js';

export const STAGE_W = 1080;
export const STAGE_H = 1920;
const LANE_W = 3.7;

const FACADES = ['#f1dca7', '#f4a261', '#e9c46a', '#a8dadc', '#f1faee', '#cdb4db', '#ffc8dd', '#bde0fe', '#d4a373', '#ccd5ae', '#e5989b', '#b7b7a4'];
const LEAVES = ['#3a7d44', '#4f9d4f', '#2d6a4f', '#6a994e'];

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

export class World {
  constructor(canvas, cfg, opts = {}) {
    this.cfg = cfg;
    this.lanes = cfg.race.lanes;
    this.roadW = this.lanes * LANE_W + 2;
    this.trackLength = cfg.race.trackLength;
    this.renderScale = opts.renderScale || 1;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.renderScale >= 0.75, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(Math.round(STAGE_W * this.renderScale), Math.round(STAGE_H * this.renderScale), false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = canvasTexture(4, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#3d8fd6');
      g.addColorStop(0.55, '#9fd0f2');
      g.addColorStop(1, '#ffe2b8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    this.scene.fog = new THREE.Fog('#f3dcc0', 110, 420);

    this.camera = new THREE.PerspectiveCamera(58, STAGE_W / STAGE_H, 0.5, 900);
    this.focus = -16;
    this.camX = 0;

    this.scene.add(new THREE.HemisphereLight('#ffffff', '#5c6b4a', 1.15));
    const sun = new THREE.DirectionalLight('#fff1d6', 1.35);
    sun.position.set(-40, 80, 30);
    this.scene.add(sun);

    this.carViews = new Map();
    this.buildEnvironment();
    this.buildFinishArch();
    this.buildEffects();
    this.ownerName = null;
    this.archMode = null;
  }

  laneX(lane) {
    return (lane - (this.lanes - 1) / 2) * LANE_W;
  }

  // ---------------------------------------------------------------- çevre

  buildEnvironment() {
    const start = 120;
    const end = -(this.trackLength + 420);
    const length = start - end;
    const midZ = (start + end) / 2;
    const roadW = this.roadW;
    const lanes = this.lanes;

    const roadTex = canvasTexture(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#3b4048';
      ctx.fillRect(0, 0, w, h);
      const r = rng(7);
      for (let i = 0; i < 2500; i++) {
        const v = 50 + r() * 30;
        ctx.fillStyle = `rgb(${v},${v + 3},${v + 8})`;
        ctx.fillRect(r() * w, r() * h, 2, 2);
      }
      const margin = (1 / (lanes * LANE_W + 2)) * w;
      ctx.fillStyle = '#f2f2f2';
      ctx.fillRect(margin - 3, 0, 6, h);
      ctx.fillRect(w - margin - 3, 0, 6, h);
      const inner = w - margin * 2;
      for (let i = 1; i < lanes; i++) {
        const x = margin + (inner / lanes) * i;
        ctx.fillRect(x - 3, 0, 6, h * 0.5);
      }
    });
    roadTex.wrapS = THREE.ClampToEdgeWrapping;
    roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(1, length / 14);
    roadTex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());

    const road = new THREE.Mesh(new THREE.PlaneGeometry(roadW, length), new THREE.MeshLambertMaterial({ map: roadTex }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, midZ);
    this.scene.add(road);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, length), new THREE.MeshLambertMaterial({ color: '#7aa35a' }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.06, midZ);
    this.scene.add(ground);

    const walkMat = new THREE.MeshLambertMaterial({ color: '#c9c2b6' });
    const curbMat = new THREE.MeshLambertMaterial({ color: '#8d8a84' });
    for (const side of [-1, 1]) {
      const walk = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, length), walkMat);
      walk.position.set(side * (roadW / 2 + 2.5), 0.15, midZ);
      this.scene.add(walk);
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.34, length), curbMat);
      curb.position.set(side * (roadW / 2 + 0.17), 0.17, midZ);
      this.scene.add(curb);
    }

    // Apartmanlar
    const windowTex = canvasTexture(128, 256, (ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      const cols = 3;
      const rows = 6;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = 10 + c * ((w - 20) / cols);
          const y = 14 + r * ((h - 20) / rows);
          ctx.fillStyle = '#4a5866';
          ctx.fillRect(x + 4, y + 4, (w - 20) / cols - 12, (h - 20) / rows - 18);
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(x + 4, y + 4, 6, (h - 20) / rows - 18);
          ctx.fillStyle = '#d8d2c8';
          ctx.fillRect(x, y + (h - 20) / rows - 12, (w - 20) / cols - 4, 4);
        }
      }
    });
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const buildingMat = new THREE.MeshLambertMaterial({ map: windowTex });
    const r = rng(12345);
    const slots = [];
    for (const side of [-1, 1]) {
      let z = start;
      while (z > end) {
        const depth = 10 + r() * 6;
        const width = 11 + r() * 7;
        const height = 10 + Math.floor(r() * 5) * 3.2;
        slots.push({ x: side * (roadW / 2 + 5.5 + depth / 2 + r() * 2), z: z - width / 2, w: depth, h: height, d: width });
        z -= width + 1.5 + r() * 2;
      }
    }
    const buildings = new THREE.InstancedMesh(buildingGeo, buildingMat, slots.length);
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    slots.forEach((s, i) => {
      m.makeScale(s.w, s.h, s.d);
      m.setPosition(s.x, 0, s.z);
      buildings.setMatrixAt(i, m);
      buildings.setColorAt(i, color.set(FACADES[Math.floor(r() * FACADES.length)]));
    });
    this.scene.add(buildings);

    // Çatılar (kiremit)
    const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: '#b5543c' }), slots.length);
    slots.forEach((s, i) => {
      m.makeScale(s.w + 0.6, 0.7, s.d + 0.6);
      m.setPosition(s.x, s.h, s.z);
      roofs.setMatrixAt(i, m);
    });
    this.scene.add(roofs);

    // Ağaçlar ve sokak lambaları
    const treeSpots = [];
    const lampSpots = [];
    for (const side of [-1, 1]) {
      for (let z = start; z > end; z -= 15) {
        if (r() < 0.82) treeSpots.push({ x: side * (roadW / 2 + 3.2), z: z - r() * 4, s: 0.8 + r() * 0.5 });
      }
      for (let z = start - (side > 0 ? 0 : 16); z > end; z -= 32) lampSpots.push({ x: side * (roadW / 2 + 1.1), z, side });
    }
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.3, 2.4, 6).translate(0, 1.2, 0), new THREE.MeshLambertMaterial({ color: '#6b4a2b' }), treeSpots.length);
    const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.7, 0).translate(0, 3.6, 0), new THREE.MeshLambertMaterial({ color: '#ffffff' }), treeSpots.length);
    treeSpots.forEach((t, i) => {
      m.makeScale(t.s, t.s, t.s);
      m.setPosition(t.x, 0.3, t.z);
      trunks.setMatrixAt(i, m);
      crowns.setMatrixAt(i, m);
      crowns.setColorAt(i, color.set(LEAVES[i % LEAVES.length]));
    });
    this.scene.add(trunks, crowns);

    const poles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 7, 0.18).translate(0, 3.5, 0), new THREE.MeshLambertMaterial({ color: '#4a4e57' }), lampSpots.length);
    const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.14, 0.3).translate(-1.1, 7, 0), new THREE.MeshLambertMaterial({ color: '#4a4e57' }), lampSpots.length);
    lampSpots.forEach((l, i) => {
      m.makeRotationY(l.side > 0 ? 0 : Math.PI);
      m.setPosition(l.x, 0.3, l.z);
      poles.setMatrixAt(i, m);
      arms.setMatrixAt(i, m);
    });
    this.scene.add(poles, arms);

    // Başlangıç ve bitiş çizgileri
    const checker = canvasTexture(256, 32, (ctx, w, h) => {
      const size = 16;
      for (let x = 0; x < w; x += size) {
        for (let y = 0; y < h; y += size) {
          ctx.fillStyle = ((x + y) / size) % 2 === 0 ? '#ffffff' : '#111111';
          ctx.fillRect(x, y, size, size);
        }
      }
    });
    for (const z of [0, -this.trackLength]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(roadW - 0.6, 2.2), new THREE.MeshLambertMaterial({ map: checker }));
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.02, z);
      this.scene.add(line);
    }
  }

  buildFinishArch() {
    const z = -this.trackLength;
    const half = this.roadW / 2 + 1.4;
    const mat = new THREE.MeshLambertMaterial({ color: '#1f4fd8' });
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 11, 1.4), mat);
      pillar.position.set(side * half, 5.5, z);
      this.scene.add(pillar);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 1.4, 3, 1.2), mat);
    beam.position.set(0, 11.5, z);
    this.scene.add(beam);

    this.archCanvas = document.createElement('canvas');
    this.archCanvas.width = 1024;
    this.archCanvas.height = 128;
    this.archTex = new THREE.CanvasTexture(this.archCanvas);
    this.archTex.colorSpace = THREE.SRGBColorSpace;
    this.archTex.anisotropy = 4;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 1.2, 2.7), new THREE.MeshBasicMaterial({ map: this.archTex }));
    sign.position.set(0, 11.5, z + 0.62);
    this.scene.add(sign);
    this.drawArch('race', null);
  }

  drawArch(mode, ownerName) {
    if (mode === this.archMode && ownerName === this.ownerName) return;
    this.archMode = mode;
    this.ownerName = ownerName;
    const ctx = this.archCanvas.getContext('2d');
    const w = this.archCanvas.width;
    const h = this.archCanvas.height;
    ctx.fillStyle = '#f7f7f2';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1f4fd8';
    ctx.fillRect(0, 0, 90, h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TR', 45, h / 2);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 64px Arial, sans-serif';
    const main = mode === 'konvoy' ? 'HAYIRLI OLSUN' : 'BİTİŞ';
    const sub = ownerName ? (mode === 'konvoy' ? `DAMAT: ${ownerName}` : `PİST SAHİBİ: ${ownerName}`) : '';
    if (sub) {
      ctx.fillText(main, 90 + (w - 90) / 2, 42);
      ctx.font = 'bold 40px Arial, sans-serif';
      ctx.fillStyle = '#c1121f';
      ctx.fillText(sub.toLocaleUpperCase('tr'), 90 + (w - 90) / 2, 98);
    } else {
      ctx.fillText(main, 90 + (w - 90) / 2, h / 2);
    }
    this.archTex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- efektler

  buildEffects() {
    // Duman parçacıkları (drift ve kayma)
    const smokeTex = canvasTexture(64, 64, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    });
    this.smokeMat = new THREE.SpriteMaterial({ map: smokeTex, color: '#e9e9e9', transparent: true, depthWrite: false });
    this.smoke = [];
    for (let i = 0; i < 90; i++) {
      const s = new THREE.Sprite(this.smokeMat.clone());
      s.visible = false;
      this.scene.add(s);
      this.smoke.push({ sprite: s, life: 0, vx: 0, vy: 0, vz: 0 });
    }
    this.smokeIndex = 0;

    // Yağ birikintileri
    const oilTex = canvasTexture(64, 64, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
      g.addColorStop(0, 'rgba(10,10,14,0.95)');
      g.addColorStop(0.7, 'rgba(30,20,50,0.8)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    });
    this.oilMat = new THREE.MeshBasicMaterial({ map: oilTex, transparent: true, depthWrite: false });
    this.oilGeo = new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2);
    this.puddles = [];

    // Tır
    this.truck = buildTruck();
    this.truck.visible = false;
    this.scene.add(this.truck);

    // Konfeti (podyum)
    const confettiGeo = new THREE.PlaneGeometry(0.35, 0.22);
    this.confetti = new THREE.InstancedMesh(confettiGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), 260);
    this.confettiData = [];
    const colors = ['#ffd23f', '#ff4d6d', '#3a86ff', '#06d6a0', '#ffffff', '#f15bb5'];
    const c = new THREE.Color();
    for (let i = 0; i < 260; i++) {
      this.confetti.setColorAt(i, c.set(colors[i % colors.length]));
      this.confettiData.push({ x: 0, y: -100, z: 0, vy: 0, rot: Math.random() * 6, spin: 1 + Math.random() * 4 });
    }
    this.confetti.frustumCulled = false;
    this.scene.add(this.confetti);
    this.confettiOn = false;
  }

  puffSmoke(x, z, color = '#e9e9e9') {
    const p = this.smoke[this.smokeIndex];
    this.smokeIndex = (this.smokeIndex + 1) % this.smoke.length;
    p.life = 1;
    p.sprite.visible = true;
    p.sprite.position.set(x + (Math.random() - 0.5) * 1.4, 0.5, z + 1.8);
    p.sprite.material.color.set(color);
    p.vx = (Math.random() - 0.5) * 2;
    p.vy = 1 + Math.random() * 1.5;
    p.vz = 2 + Math.random() * 3;
  }

  dropOil(x, z) {
    const mesh = new THREE.Mesh(this.oilGeo, this.oilMat);
    mesh.position.set(x, 0.035, z);
    mesh.renderOrder = -1;
    this.scene.add(mesh);
    this.puddles.push({ mesh, life: 5 });
  }

  startConfetti(z) {
    this.confettiOn = true;
    this.confettiData.forEach((d) => {
      d.x = (Math.random() - 0.5) * 30;
      d.y = 12 + Math.random() * 18;
      d.z = z + (Math.random() - 0.5) * 30;
      d.vy = 3 + Math.random() * 4;
    });
  }

  // ---------------------------------------------------------------- senkron

  sync(game, dt, time) {
    const cars = game.cars;
    for (const [id, view] of this.carViews) {
      if (!cars.has(id)) {
        view.dispose(this.scene);
        this.carViews.delete(id);
      }
    }
    const ownerId = game.session.owner?.id;
    const globalNitro = game.phase === 'race' && game.now < game.globalNitroUntil;
    for (const car of cars.values()) {
      let view = this.carViews.get(car.id);
      if (!view) {
        view = new CarView(car, this.scene);
        this.carViews.set(car.id, view);
      }
      view.refresh(car, game.mode === 'konvoy' && car.id === ownerId);
      const x = this.laneX(car.lane);
      const z = -car.progress;
      view.update(car, x, z, time, car.nitroLeft > 0 || globalNitro);
      if ((car.driftLeft > 0 || car.oilLeft > 0) && Math.random() < dt * 22) {
        this.puffSmoke(x, z, car.oilLeft > 0 ? '#9a9a9a' : '#f2f2f2');
      }
    }

    const owner = game.owner();
    this.drawArch(game.mode, owner ? owner.name : null);
    this.updateEffects(game, dt, time);
    this.updateCamera(game, dt, time);
  }

  onOil({ target }, game) {
    const car = game.cars.get(target);
    if (car) this.dropOil(this.laneX(car.lane), -car.progress - 2);
  }

  onTruck() {
    this.truckAnim = { t: 0 };
  }

  updateEffects(game, dt, time) {
    for (const p of this.smoke) {
      if (p.life <= 0) continue;
      p.life -= dt * 1.2;
      const s = p.sprite;
      s.position.x += p.vx * dt;
      s.position.y += p.vy * dt;
      s.position.z += p.vz * dt;
      const k = 1 - p.life;
      s.scale.setScalar(1.2 + k * 3.5);
      s.material.opacity = Math.max(0, p.life) * 0.75;
      if (p.life <= 0) s.visible = false;
    }
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.puddles.splice(i, 1);
      }
    }

    // Tır: liderin önünde yolu soldan sağa keser
    if (game.truck && this.truckAnim) {
      const span = game.truck.until - game.truck.started;
      const k = Math.min(1, (game.now - game.truck.started) / span);
      const lead = game.standings()[0];
      const z = lead ? -lead.progress - 26 : this.camera.position.z - 50;
      this.truck.visible = true;
      this.truck.rotation.y = -Math.PI / 2;
      this.truck.position.set(-this.roadW * 1.1 + k * this.roadW * 2.2, 0, z);
    } else {
      this.truck.visible = false;
      this.truckAnim = null;
    }

    if (game.phase === 'podium') {
      if (!this.confettiOn) this.startConfetti(-this.focus);
    } else {
      this.confettiOn = false;
    }
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    this.confettiData.forEach((d, i) => {
      if (this.confettiOn) {
        d.y -= d.vy * dt;
        d.rot += d.spin * dt;
        if (d.y < 0) d.y = 14 + Math.random() * 8;
      } else {
        d.y = -100;
      }
      e.set(d.rot, d.rot * 0.7, 0);
      q.setFromEuler(e);
      v.set(d.x, d.y, d.z);
      m.compose(v, q, one);
      this.confetti.setMatrixAt(i, m);
    });
    this.confetti.instanceMatrix.needsUpdate = true;
  }

  focusTarget(game) {
    const list = game.standings();
    if (game.phase === 'lobby' || game.phase === 'countdown') return -2;
    if (!list.length) return this.focus;
    if (game.phase === 'konvoy') return list[0].progress - 2;
    if (game.phase === 'podium') return this.trackLength + 6;
    const active = list.filter((c) => !c.finished);
    if (active.length === 0) return this.trackLength + 6;
    // Lider ekranın ortasında, grup altında kalsın
    return Math.min(this.trackLength + 6, active[0].progress - 2);
  }

  updateCamera(game, dt, time) {
    const target = this.focusTarget(game);
    // Yeni yarışa geçerken kamera pistin başına anında döner
    if (Math.abs(target - this.focus) > 150) this.focus = target;
    else this.focus += (target - this.focus) * Math.min(1, dt * 3);
    const sway = Math.sin(time * 0.25) * 1.2;
    const z = -this.focus;
    const idle = game.phase === 'lobby' || game.phase === 'countdown';
    const height = idle ? 30 : 26;
    const dist = idle ? 44 : 42;
    this.camera.position.set(sway, height, z + dist);
    this.camera.lookAt(sway * 0.3, 0, z - 4);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /** 3D noktayı sahne (1080x1920) koordinatına çevirir. */
  project(x, y, z, out) {
    const v = this._v || (this._v = new THREE.Vector3());
    v.set(x, y, z);
    const dist = v.distanceTo(this.camera.position);
    v.project(this.camera);
    out.x = (v.x + 1) * 0.5 * STAGE_W;
    out.y = (1 - v.y) * 0.5 * STAGE_H;
    out.visible = v.z < 1 && v.z > -1 && out.x > -100 && out.x < STAGE_W + 100 && out.y > -100 && out.y < STAGE_H + 100;
    out.dist = dist;
    return out;
  }
}
