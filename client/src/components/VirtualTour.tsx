import { useEffect, useId, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "./virtualTour.css";

export type VirtualTourKind = "demo" | "model" | "embed" | "none";

export interface VirtualTourProps {
  kind: VirtualTourKind;
  url?: string | null;
  title: string;
  onClose: () => void;
}

type RoomId = "living" | "kitchen" | "bedroom";
type ViewMode = "explore" | "dollhouse";
type RuntimeState = "loading" | "ready" | "error" | "unsupported";
type MoveDirection = "forward" | "back" | "left" | "right";

const ROOM_LABELS: Record<RoomId, string> = {
  living: "Living room",
  kitchen: "Kitchen",
  bedroom: "Bedroom",
};

const ROOM_STARTS: Record<
  RoomId,
  { position: [number, number, number]; yaw: number }
> = {
  living: { position: [-3.75, 1.58, 4.85], yaw: 0.1 },
  kitchen: { position: [4.4, 1.58, 3.65], yaw: -0.55 },
  bedroom: { position: [5.2, 1.58, -4.45], yaw: 2.75 },
};

const DEMO_BOUNDS = {
  minX: -7.35,
  maxX: 7.35,
  minZ: -6.35,
  maxZ: 6.35,
};

const COLORS = {
  ink: 0x1f2a26,
  inkSoft: 0x46534c,
  cream: 0xf4ede1,
  plaster: 0xe8dfd1,
  trim: 0xf8f3eb,
  wood: 0x9b6548,
  woodLight: 0xc28f69,
  sage: 0x788f7a,
  sageDark: 0x50675c,
  clay: 0xb7735e,
  blush: 0xd4a391,
  brass: 0xb8955d,
  charcoal: 0x28332f,
  glass: 0xb9d5d1,
  rug: 0xc4b9a6,
  rugSage: 0xa6b5a4,
  leaf: 0x6f8d6f,
};

function createMaterial(
  color: number,
  options: Partial<THREE.MeshStandardMaterialParameters> = {}
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.72,
    metalness: options.metalness ?? 0,
    ...options,
  });
}

function addBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  rotation: [number, number, number] = [0, 0, 0]
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(
  parent: THREE.Object3D,
  radius: number,
  height: number,
  position: [number, number, number],
  material: THREE.Material,
  radialSegments = 20
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.94, height, radialSegments),
    material
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addSphere(
  parent: THREE.Object3D,
  radius: number,
  position: [number, number, number],
  material: THREE.Material
) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 16, 12),
    material
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addPlane(
  parent: THREE.Object3D,
  size: [number, number],
  position: [number, number, number],
  material: THREE.Material
) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(...position);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addPlant(parent: THREE.Object3D, x: number, z: number, scale = 1) {
  const pot = createMaterial(COLORS.clay, { roughness: 0.88 });
  const soil = createMaterial(COLORS.charcoal, { roughness: 1 });
  const leaf = createMaterial(COLORS.leaf, { roughness: 0.92 });
  addCylinder(
    parent,
    0.28 * scale,
    0.42 * scale,
    [x, 0.21 * scale, z],
    pot,
    16
  );
  addCylinder(
    parent,
    0.22 * scale,
    0.045 * scale,
    [x, 0.43 * scale, z],
    soil,
    16
  );
  const leaves = [
    [x - 0.2 * scale, 0.76 * scale, z + 0.02 * scale],
    [x + 0.2 * scale, 0.88 * scale, z - 0.04 * scale],
    [x, 1.12 * scale, z + 0.06 * scale],
    [x - 0.04 * scale, 0.94 * scale, z - 0.22 * scale],
  ] as const;
  leaves.forEach(([leafX, leafY, leafZ], index) => {
    addSphere(
      parent,
      (index === 2 ? 0.22 : 0.18) * scale,
      [leafX, leafY, leafZ],
      leaf
    );
  });
}

function addWindow(
  parent: THREE.Object3D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const frame = createMaterial(COLORS.trim, { roughness: 0.45 });
  const glass = createMaterial(COLORS.glass, {
    transparent: true,
    opacity: 0.36,
    roughness: 0.18,
    metalness: 0.08,
  });
  addBox(parent, [width, height, 0.035], [x, y, -6.88], glass);
  addBox(parent, [0.07, height + 0.16, 0.09], [x - width / 2, y, -6.91], frame);
  addBox(parent, [0.07, height + 0.16, 0.09], [x + width / 2, y, -6.91], frame);
  addBox(parent, [width + 0.16, 0.07, 0.09], [x, y - height / 2, -6.91], frame);
  addBox(parent, [width + 0.16, 0.07, 0.09], [x, y + height / 2, -6.91], frame);
  addBox(parent, [0.045, height, 0.09], [x, y, -6.93], frame);
}

function addWallArt(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  color: number
) {
  const frame = createMaterial(COLORS.brass, {
    metalness: 0.42,
    roughness: 0.4,
  });
  const print = createMaterial(color, { roughness: 0.9 });
  addBox(parent, [1.25, 0.92, 0.05], [x, y, z], frame);
  addBox(parent, [1.08, 0.75, 0.035], [x, y, z - 0.035], print);
}

function addPendant(
  parent: THREE.Object3D,
  x: number,
  z: number,
  shadeColor = COLORS.cream
) {
  const cord = createMaterial(COLORS.charcoal, { roughness: 0.65 });
  const shade = createMaterial(shadeColor, { roughness: 0.82 });
  addCylinder(parent, 0.018, 1.15, [x, 3.15, z], cord, 8);
  addCylinder(parent, 0.27, 0.26, [x, 2.56, z], shade, 24);
  addSphere(
    parent,
    0.065,
    [x, 2.43, z],
    createMaterial(0xffdfac, { emissive: 0xffa64d, emissiveIntensity: 0.55 })
  );
}

function addDemoApartment(scene: THREE.Scene) {
  const apartment = new THREE.Group();
  apartment.name = "Conceptual apartment";
  scene.add(apartment);

  const floorPalette = [0x9a664a, 0xa87355, 0xb17b5d, 0x8e5c45];
  for (let index = 0, z = -6.72; z <= 6.72; index += 1, z += 0.43) {
    addBox(
      apartment,
      [15.7, 0.1, 0.38],
      [0, -0.07, z],
      createMaterial(floorPalette[index % floorPalette.length], {
        roughness: 0.88,
      })
    );
  }

  const plaster = createMaterial(COLORS.plaster, { roughness: 0.9 });
  const trim = createMaterial(COLORS.trim, { roughness: 0.56 });
  const sageWall = createMaterial(0xd6ded4, { roughness: 0.92 });
  addBox(apartment, [15.9, 3.65, 0.18], [0, 1.78, -7], plaster);
  addBox(apartment, [0.18, 3.65, 14], [-8, 1.78, 0], plaster);
  addBox(apartment, [0.18, 3.65, 14], [8, 1.78, 0], plaster);

  // A low, open partition makes the bedroom legible while keeping the plan connected.
  addBox(apartment, [3.15, 3.12, 0.14], [2.5, 1.55, -1.4], sageWall);
  addBox(apartment, [2.25, 3.12, 0.14], [6.88, 1.55, -1.4], sageWall);
  addBox(apartment, [3.1, 0.09, 0.12], [2.5, 3.1, -1.33], trim);
  addBox(apartment, [2.2, 0.09, 0.12], [6.88, 3.1, -1.33], trim);

  addBox(apartment, [15.7, 0.09, 0.12], [0, 0.1, -6.84], trim);
  addBox(apartment, [0.12, 0.09, 13.7], [-7.84, 0.1, 0], trim);
  addBox(apartment, [0.12, 0.09, 13.7], [7.84, 0.1, 0], trim);
  addWindow(apartment, -3.6, 2.25, 3.45, 1.48);
  addWindow(apartment, 4.75, 2.25, 2.8, 1.48);

  const rug = createMaterial(COLORS.rug, { roughness: 0.98 });
  const rugSage = createMaterial(COLORS.rugSage, { roughness: 0.98 });
  addPlane(apartment, [4.7, 3.45], [-3.65, 0.005, 3.25], rug);
  addPlane(apartment, [4.2, 3.4], [4.7, 0.006, -4.55], rugSage);

  // Living room: low sofa, coffee table, media console and a quiet gallery wall.
  const sofa = createMaterial(COLORS.sageDark, { roughness: 0.96 });
  const sofaLight = createMaterial(0x74897c, { roughness: 0.94 });
  const wood = createMaterial(COLORS.wood, { roughness: 0.82 });
  const woodLight = createMaterial(COLORS.woodLight, { roughness: 0.84 });
  const charcoal = createMaterial(COLORS.charcoal, { roughness: 0.46 });
  addBox(apartment, [3.9, 0.48, 1.18], [-3.7, 0.52, 5.28], sofa);
  addBox(apartment, [3.9, 1.04, 0.22], [-3.7, 1.02, 5.78], sofa);
  addBox(apartment, [0.25, 0.74, 1.18], [-5.53, 0.85, 5.28], sofa);
  addBox(apartment, [0.25, 0.74, 1.18], [-1.87, 0.85, 5.28], sofa);
  addBox(
    apartment,
    [0.85, 0.13, 0.48],
    [-4.55, 1.15, 5.08],
    sofaLight,
    [0, 0.25, 0.08]
  );
  addBox(
    apartment,
    [0.78, 0.13, 0.48],
    [-2.92, 1.15, 5.08],
    createMaterial(COLORS.blush, { roughness: 0.94 }),
    [0, -0.18, -0.05]
  );
  addBox(apartment, [2.05, 0.16, 1.12], [-3.65, 0.73, 3.35], woodLight);
  addBox(
    apartment,
    [1.45, 0.09, 0.72],
    [-3.65, 0.86, 3.35],
    createMaterial(0xe0cbb2, { roughness: 0.64 })
  );
  [
    [-4.48, 0.28, 2.9],
    [-2.82, 0.28, 2.9],
    [-4.48, 0.28, 3.78],
    [-2.82, 0.28, 3.78],
  ].forEach(([x, y, z]) =>
    addCylinder(apartment, 0.06, 0.38, [x, y, z], wood, 12)
  );
  addBox(apartment, [3.95, 0.28, 0.3], [-3.7, 0.42, 1.15], wood);
  addBox(apartment, [2.95, 1.2, 0.25], [-3.7, 0.88, 1.28], wood);
  addBox(apartment, [2.6, 0.85, 0.035], [-3.7, 1.35, 1.12], charcoal);
  addBox(
    apartment,
    [2.2, 0.04, 0.015],
    [-3.7, 1.36, 1.09],
    createMaterial(0xb3c5be, { emissive: 0x273d3b, emissiveIntensity: 0.15 })
  );
  addWallArt(apartment, -5.5, 2.42, -6.84, COLORS.clay);
  addWallArt(apartment, -3.95, 2.42, -6.84, COLORS.sage);
  addWallArt(apartment, -2.4, 2.42, -6.84, COLORS.brass);
  addPlant(apartment, -6.75, 0.1, 1.32);

  // Kitchen: a linear run, an island with stools, warm metal, and a single pendant.
  const cabinet = createMaterial(0x77877a, { roughness: 0.82 });
  const counter = createMaterial(0xd2c8ba, { roughness: 0.5 });
  const metal = createMaterial(COLORS.brass, {
    metalness: 0.58,
    roughness: 0.28,
  });
  addBox(apartment, [5.55, 0.72, 0.62], [4.98, 0.43, 5.75], cabinet);
  addBox(apartment, [5.72, 0.1, 0.75], [4.98, 0.84, 5.7], counter);
  [2.55, 3.58, 4.61, 5.64, 6.67].forEach(x =>
    addBox(apartment, [0.04, 0.56, 0.02], [x, 0.45, 5.42], metal)
  );
  addBox(apartment, [2.8, 0.8, 1.18], [3.05, 0.48, 3.2], cabinet);
  addBox(apartment, [3.0, 0.1, 1.3], [3.05, 0.92, 3.2], counter);
  [2.1, 3.1, 4.1].forEach(x => {
    addCylinder(apartment, 0.25, 0.07, [x, 0.32, 2.42], woodLight, 20);
    addCylinder(apartment, 0.035, 0.58, [x, 0.12, 2.42], metal, 12);
  });
  addBox(
    apartment,
    [0.82, 1.74, 0.76],
    [7.25, 0.93, 4.86],
    createMaterial(0xc9d5d0, { roughness: 0.34, metalness: 0.1 })
  );
  addBox(apartment, [0.55, 0.05, 0.025], [7.25, 1.12, 4.46], metal);
  addPendant(apartment, 3.05, 3.2, 0xf4e6cc);
  addPendant(apartment, 5.5, 5.7, 0xe8dcc9);
  addPlant(apartment, 7.02, 0.2, 0.9);

  // Bedroom: platform bed, nightstands, art and an intentionally graphic plant silhouette.
  const bedFrame = createMaterial(COLORS.wood, { roughness: 0.78 });
  const mattress = createMaterial(0xf0e9dd, { roughness: 0.94 });
  const bedding = createMaterial(0xaebcaf, { roughness: 0.96 });
  const pillow = createMaterial(0xdccabb, { roughness: 0.91 });
  addBox(apartment, [3.65, 0.26, 5.1], [4.72, 0.28, -4.55], bedFrame);
  addBox(apartment, [3.42, 0.34, 4.82], [4.72, 0.64, -4.5], mattress);
  addBox(apartment, [3.34, 0.14, 2.12], [4.72, 0.85, -3.18], bedding);
  addBox(apartment, [3.62, 2.0, 0.16], [4.72, 1.34, -6.72], bedFrame);
  addBox(apartment, [1.02, 0.18, 0.55], [3.46, 1.03, -3.27], pillow);
  addBox(apartment, [1.02, 0.18, 0.55], [5.92, 1.03, -3.27], pillow);
  [3.0, 6.44].forEach(x => {
    addBox(apartment, [0.72, 0.48, 0.68], [x, 0.4, -5.72], woodLight);
    addCylinder(apartment, 0.05, 0.28, [x, 0.78, -5.72], metal, 12);
    addSphere(
      apartment,
      0.11,
      [x, 0.96, -5.72],
      createMaterial(0xffd59a, { emissive: 0xffa34a, emissiveIntensity: 0.34 })
    );
  });
  addWallArt(apartment, 4.75, 2.38, -6.84, COLORS.sageDark);
  addPlant(apartment, 7.05, -5.7, 1.06);

  return apartment;
}

function addModelStage(scene: THREE.Scene) {
  const stage = new THREE.Group();
  stage.name = "Neutral model stage";
  stage.add(
    addPlane(
      stage,
      [40, 40],
      [0, -0.045, 0],
      createMaterial(0xd7d0c4, { roughness: 0.96 })
    )
  );
  scene.add(stage);
  return stage;
}

function disposeObject(object: THREE.Object3D) {
  object.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (!mesh.material) return;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    materials.forEach(material => {
      const materialValues = Object.values(material) as unknown[];
      materialValues.forEach(value => {
        if (value instanceof THREE.Texture) value.dispose();
      });
      material.dispose();
    });
  });
}

function validateEmbedUrl(value?: string | null) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    const isMatterport =
      host === "my.matterport.com" && parsed.pathname.startsWith("/show/");
    const isKuula =
      (host === "kuula.co" || host === "www.kuula.co") &&
      parsed.pathname.startsWith("/post/");
    return isMatterport || isKuula ? parsed.toString() : null;
  } catch {
    return null;
  }
}

interface TourRuntime {
  setViewMode: (mode: ViewMode) => void;
  teleport: (room: RoomId) => void;
  moveBy: (direction: MoveDirection) => void;
  dispose: () => void;
}

function createTourRuntime(
  host: HTMLDivElement,
  kind: "demo" | "model",
  modelUrl: string | null | undefined,
  onState: (state: RuntimeState) => void
): TourRuntime {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  } catch {
    onState("unsupported");
    return {
      setViewMode: () => undefined,
      teleport: () => undefined,
      moveBy: () => undefined,
      dispose: () => undefined,
    };
  }

  renderer.setSize(
    Math.max(host.clientWidth, 1),
    Math.max(host.clientHeight, 1),
    false
  );
  renderer.domElement.className = "tour-canvas";
  renderer.domElement.setAttribute(
    "aria-label",
    kind === "demo"
      ? "Interactive conceptual apartment tour"
      : "Interactive loaded 3D model"
  );
  renderer.domElement.setAttribute("role", "img");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeae2d5);
  scene.fog = new THREE.Fog(0xeae2d5, 22, 42);
  const camera = new THREE.PerspectiveCamera(
    53,
    Math.max(host.clientWidth, 1) / Math.max(host.clientHeight, 1),
    0.05,
    100
  );
  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);
  addModelStage(scene);
  scene.add(new THREE.HemisphereLight(0xfff3df, 0x72857e, 2.2));
  const keyLight = new THREE.PointLight(0xffd6aa, 18, 28, 2);
  keyLight.position.set(-2, 5.6, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);
  const fillLight = new THREE.PointLight(0xb9d6d2, 10, 24, 2);
  fillLight.position.set(6, 4.2, -5);
  scene.add(fillLight);

  if (kind === "demo") {
    sceneRoot.add(addDemoApartment(scene));
  }

  let disposed = false;
  let animationFrame = 0;
  let lastFrame = performance.now();
  let viewMode: ViewMode = "explore";
  let currentRoom: RoomId = "living";
  let yaw = ROOM_STARTS.living.yaw;
  let pitch = -0.03;
  let position = new THREE.Vector3(...ROOM_STARTS.living.position);
  let modelBounds: THREE.Box3 | null = null;
  let modelRoot: THREE.Object3D | null = null;
  const pressed = new Set<MoveDirection>();
  let pointerId: number | null = null;
  let lastPointerX = 0;
  let lastPointerY = 0;

  const direction = new THREE.Vector3();
  const moveVector = new THREE.Vector3();
  const center = new THREE.Vector3();

  const updateCamera = () => {
    direction.set(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    );
    camera.position.copy(position);
    camera.lookAt(center.copy(position).add(direction));
  };

  const setLookAt = (target: THREE.Vector3) => {
    const offset = target.clone().sub(position);
    const distance = Math.max(offset.length(), 0.001);
    yaw = Math.atan2(offset.x, -offset.z);
    pitch = Math.asin(THREE.MathUtils.clamp(offset.y / distance, -0.98, 0.98));
    updateCamera();
  };

  const getBounds = () => {
    if (kind === "demo" || !modelBounds) return DEMO_BOUNDS;
    return {
      minX: modelBounds.min.x + 0.18,
      maxX: modelBounds.max.x - 0.18,
      minZ: modelBounds.min.z + 0.18,
      maxZ: modelBounds.max.z - 0.18,
    };
  };

  const clampPosition = (next: THREE.Vector3) => {
    const bounds = getBounds();
    next.x = THREE.MathUtils.clamp(
      next.x,
      Math.min(bounds.minX, bounds.maxX),
      Math.max(bounds.minX, bounds.maxX)
    );
    next.z = THREE.MathUtils.clamp(
      next.z,
      Math.min(bounds.minZ, bounds.maxZ),
      Math.max(bounds.minZ, bounds.maxZ)
    );
    if (kind === "model" && modelBounds) {
      next.y = THREE.MathUtils.clamp(
        next.y,
        modelBounds.min.y + 1.2,
        Math.max(modelBounds.min.y + 1.2, modelBounds.max.y - 0.12)
      );
    } else {
      next.y = 1.58;
    }
  };

  const move = (directionName: MoveDirection, distance: number) => {
    if (viewMode === "dollhouse") return;
    const next = position.clone();
    const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    if (directionName === "forward") next.addScaledVector(forward, distance);
    if (directionName === "back") next.addScaledVector(forward, -distance);
    if (directionName === "right") next.addScaledVector(right, distance);
    if (directionName === "left") next.addScaledVector(right, -distance);
    clampPosition(next);
    position.copy(next);
  };

  const teleport = (room: RoomId) => {
    currentRoom = room;
    const start = ROOM_STARTS[room];
    position.set(...start.position);
    yaw = start.yaw;
    pitch = -0.03;
    clampPosition(position);
    updateCamera();
  };

  const setViewMode = (nextMode: ViewMode) => {
    viewMode = nextMode;
    if (viewMode === "dollhouse") {
      const bounds =
        modelBounds ??
        new THREE.Box3(
          new THREE.Vector3(-8, 0, -7),
          new THREE.Vector3(8, 3.6, 7)
        );
      const size = bounds.getSize(new THREE.Vector3());
      const span = Math.max(size.x, size.z, 8);
      position.set(
        bounds.max.x + span * 0.62,
        bounds.max.y + span * 0.72,
        bounds.max.z + span * 0.62
      );
      setLookAt(bounds.getCenter(new THREE.Vector3()));
    } else {
      if (kind === "demo") teleport(currentRoom);
      else if (modelBounds) {
        const boundsCenter = modelBounds.getCenter(new THREE.Vector3());
        position.set(
          boundsCenter.x,
          modelBounds.min.y +
            Math.max(1.55, modelBounds.getSize(new THREE.Vector3()).y * 0.35),
          modelBounds.max.z +
            Math.max(2.2, modelBounds.getSize(new THREE.Vector3()).z * 0.42)
        );
        clampPosition(position);
        setLookAt(boundsCenter);
      }
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerId = event.pointerId;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    host.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return;
    const deltaX = event.clientX - lastPointerX;
    const deltaY = event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    yaw -= deltaX * 0.006;
    pitch = THREE.MathUtils.clamp(pitch - deltaY * 0.005, -1.18, 1.18);
    updateCamera();
  };
  const onPointerUp = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return;
    pointerId = null;
    host.releasePointerCapture?.(event.pointerId);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLElement &&
      ["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT"].includes(
        event.target.tagName
      )
    )
      return;
    const keyMap: Record<string, MoveDirection | undefined> = {
      w: "forward",
      W: "forward",
      ArrowUp: "forward",
      s: "back",
      S: "back",
      ArrowDown: "back",
      a: "left",
      A: "left",
      ArrowLeft: "left",
      d: "right",
      D: "right",
      ArrowRight: "right",
    };
    const directionName = keyMap[event.key];
    if (!directionName) return;
    event.preventDefault();
    pressed.add(directionName);
  };
  const onKeyUp = (event: KeyboardEvent) => {
    const keyMap: Record<string, MoveDirection | undefined> = {
      w: "forward",
      W: "forward",
      ArrowUp: "forward",
      s: "back",
      S: "back",
      ArrowDown: "back",
      a: "left",
      A: "left",
      ArrowLeft: "left",
      d: "right",
      D: "right",
      ArrowRight: "right",
    };
    const directionName = keyMap[event.key];
    if (directionName) pressed.delete(directionName);
  };

  host.addEventListener("pointerdown", onPointerDown);
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerup", onPointerUp);
  host.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  const resize = () => {
    if (disposed) return;
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  const resizeObserver =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(host);
  window.addEventListener("resize", resize);

  const animate = (now: number) => {
    if (disposed) return;
    const delta = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    if (viewMode === "explore" && pressed.size > 0) {
      const speed = 3.2 * delta;
      pressed.forEach(directionName => move(directionName, speed));
      updateCamera();
    }
    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(animate);
  };

  const runtime: TourRuntime = {
    setViewMode,
    teleport,
    moveBy: directionName => move(directionName, 0.9),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointercancel", onPointerUp);
      disposeObject(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };

  updateCamera();
  if (kind === "model") {
    onState("loading");
    if (!modelUrl) {
      onState("error");
    } else {
      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        gltf => {
          if (disposed) return;
          modelRoot = gltf.scene;
          const initialBounds = new THREE.Box3().setFromObject(modelRoot);
          const initialSize = initialBounds.getSize(new THREE.Vector3());
          const maxDimension = Math.max(
            initialSize.x,
            initialSize.y,
            initialSize.z
          );
          if (!Number.isFinite(maxDimension) || maxDimension < 0.0001) {
            onState("error");
            return;
          }
          modelRoot.scale.setScalar(10 / maxDimension);
          let normalizedBounds = new THREE.Box3().setFromObject(modelRoot);
          const normalizedCenter = normalizedBounds.getCenter(
            new THREE.Vector3()
          );
          modelRoot.position.x -= normalizedCenter.x;
          modelRoot.position.z -= normalizedCenter.z;
          modelRoot.position.y -= normalizedBounds.min.y;
          normalizedBounds = new THREE.Box3().setFromObject(modelRoot);
          modelBounds = normalizedBounds;
          modelRoot.traverse(child => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh) {
              mesh.castShadow = true;
              mesh.receiveShadow = true;
            }
          });
          sceneRoot.add(modelRoot);
          const modelCenter = modelBounds.getCenter(new THREE.Vector3());
          const modelSize = modelBounds.getSize(new THREE.Vector3());
          position.set(
            modelCenter.x,
            modelBounds.min.y + Math.max(1.55, modelSize.y * 0.35),
            modelBounds.max.z + Math.max(2.2, modelSize.z * 0.42)
          );
          clampPosition(position);
          setLookAt(modelCenter);
          onState("ready");
        },
        undefined,
        () => {
          if (!disposed) onState("error");
        }
      );
    }
  } else {
    onState("ready");
  }
  animationFrame = window.requestAnimationFrame(animate);

  return runtime;
}

export default function VirtualTour({
  kind,
  url,
  title,
  onClose,
}: VirtualTourProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const runtimeRef = useRef<TourRuntime | null>(null);
  const titleId = useId();
  const [room, setRoom] = useState<RoomId>("living");
  const [viewMode, setViewMode] = useState<ViewMode>("explore");
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(
    kind === "model" ? "loading" : "ready"
  );
  const [modelAttempt, setModelAttempt] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(true);
  const embedUrl = kind === "embed" ? validateEmbedUrl(url) : null;

  useEffect(() => {
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (document.fullscreenElement === overlayRef.current) {
        void document.exitFullscreen().catch(() => undefined);
      }
    };
  }, [onClose]);

  useEffect(() => {
    if (kind !== "demo" && kind !== "model") return undefined;
    if (!canvasHostRef.current) return undefined;
    runtimeRef.current?.dispose();
    setRuntimeState(kind === "model" ? "loading" : "ready");
    const runtime = createTourRuntime(
      canvasHostRef.current,
      kind,
      url,
      setRuntimeState
    );
    runtimeRef.current = runtime;
    return () => {
      runtime.dispose();
      if (runtimeRef.current === runtime) runtimeRef.current = null;
    };
  }, [kind, url, modelAttempt]);

  useEffect(() => {
    runtimeRef.current?.setViewMode(viewMode);
  }, [viewMode]);

  const closeTour = () => {
    if (document.fullscreenElement === overlayRef.current) {
      void document.exitFullscreen().catch(() => undefined);
    }
    onClose();
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await overlayRef.current?.requestFullscreen?.();
    } catch {
      // Fullscreen is an enhancement; the tour remains fully usable when denied.
    }
  };

  const chooseRoom = (nextRoom: RoomId) => {
    setRoom(nextRoom);
    setViewMode("explore");
    runtimeRef.current?.teleport(nextRoom);
  };

  const isScene = kind === "demo" || kind === "model";
  const dialogLabel =
    kind === "embed" ? `${title} embedded tour` : `${title} virtual tour`;

  return (
    <div
      ref={overlayRef}
      className="tour-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={event => event.stopPropagation()}
    >
      <div className="tour-shell">
        <header className="tour-header">
          <div className="tour-heading">
            <span className="tour-eyebrow">
              {kind === "demo"
                ? "Conceptual 3D tour • not a measured scan"
                : kind === "model"
                  ? "Interactive model viewer"
                  : "Virtual viewing"}
            </span>
            <h1 id={titleId}>{title}</h1>
          </div>
          <div className="tour-header-actions">
            {isScene && (
              <button
                className="tour-icon-button"
                type="button"
                onClick={() => void toggleFullscreen()}
                aria-label="Enter fullscreen"
                title="Fullscreen"
              >
                <span aria-hidden="true">⛶</span>
              </button>
            )}
            <button
              ref={closeButtonRef}
              className="tour-icon-button tour-close-button"
              type="button"
              onClick={closeTour}
              aria-label={`Close ${dialogLabel}`}
              title="Close"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </header>

        {kind === "none" && (
          <main className="tour-message-panel" aria-live="polite">
            <span className="tour-message-mark" aria-hidden="true">
              ⌂
            </span>
            <span className="tour-eyebrow">Virtual viewing</span>
            <h2>No tour available yet</h2>
            <p>
              This home does not have a virtual tour attached. Close this panel
              to continue exploring the listing.
            </p>
            <button
              className="tour-primary-button"
              type="button"
              onClick={closeTour}
            >
              Close tour
            </button>
          </main>
        )}

        {kind === "embed" && (
          <main className="tour-embed-shell">
            {embedUrl ? (
              <>
                <div className="tour-embed-frame-wrap">
                  <iframe
                    className="tour-embed-frame"
                    title={`${title} interactive tour`}
                    src={embedUrl}
                    allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer"
                    allowFullScreen
                    onLoad={() => setIframeLoading(false)}
                  />
                  {iframeLoading && (
                    <div className="tour-embed-loading" role="status">
                      Loading your hosted tour…
                    </div>
                  )}
                </div>
                <div className="tour-embed-footer">
                  <span>Hosted interactive tour</span>
                  <a href={embedUrl} target="_blank" rel="noopener noreferrer">
                    Open in new tab <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </>
            ) : (
              <div className="tour-message-panel tour-embed-error" role="alert">
                <span className="tour-message-mark" aria-hidden="true">
                  !
                </span>
                <span className="tour-eyebrow">Unsupported tour link</span>
                <h2>This tour link can’t be embedded</h2>
                <p>
                  Only secure Matterport show links and Kuula post links are
                  supported here. No external page was loaded.
                </p>
                <button
                  className="tour-primary-button"
                  type="button"
                  onClick={closeTour}
                >
                  Close tour
                </button>
              </div>
            )}
          </main>
        )}

        {isScene && (
          <main className="tour-scene" aria-label={`${title} 3D viewer`}>
            <div
              ref={canvasHostRef}
              className="tour-canvas-host"
              aria-hidden={runtimeState === "unsupported" ? "true" : undefined}
            />
            <div className="tour-scene-vignette" aria-hidden="true" />
            <div className="tour-scene-hint">Drag to look around</div>

            <aside className="tour-help-card" aria-label="Tour instructions">
              <span className="tour-eyebrow">Navigate the plan</span>
              <p>
                <strong>Drag</strong> to look around
              </p>
              <p>
                <strong>W A S D</strong> or arrow keys to move
              </p>
              <p className="tour-help-note">
                Use the room tabs for a quick jump.
              </p>
            </aside>

            {runtimeState === "loading" && (
              <div
                className="tour-status-card"
                role="status"
                aria-live="polite"
              >
                <span className="tour-spinner" aria-hidden="true" />
                <div>
                  <strong>Preparing the model</strong>
                  <span>Loading the supplied GLB…</span>
                </div>
              </div>
            )}
            {runtimeState === "unsupported" && (
              <div className="tour-status-card tour-status-error" role="alert">
                <span className="tour-status-symbol" aria-hidden="true">
                  !
                </span>
                <div>
                  <strong>3D viewing isn’t available</strong>
                  <span>
                    Your browser could not start WebGL. Try a current browser
                    with hardware acceleration enabled.
                  </span>
                </div>
                <button
                  className="tour-primary-button"
                  type="button"
                  onClick={closeTour}
                >
                  Close
                </button>
              </div>
            )}
            {kind === "model" && runtimeState === "error" && (
              <div className="tour-status-card tour-status-error" role="alert">
                <span className="tour-status-symbol" aria-hidden="true">
                  !
                </span>
                <div>
                  <strong>Model couldn’t be loaded</strong>
                  <span>
                    The supplied GLB did not respond or was not a valid 3D
                    model. No demo scene was substituted.
                  </span>
                </div>
                <div className="tour-status-actions">
                  <button
                    className="tour-primary-button"
                    type="button"
                    onClick={() => setModelAttempt(attempt => attempt + 1)}
                  >
                    Retry
                  </button>
                  <button
                    className="tour-quiet-button"
                    type="button"
                    onClick={closeTour}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            <div className="tour-bottom-controls">
              <div className="tour-room-row">
                <div
                  className="tour-room-tabs"
                  role="tablist"
                  aria-label="Room teleport tabs"
                >
                  {(Object.keys(ROOM_LABELS) as RoomId[]).map(roomId => (
                    <button
                      key={roomId}
                      type="button"
                      role="tab"
                      aria-selected={room === roomId}
                      className={
                        room === roomId
                          ? "tour-room-tab is-active"
                          : "tour-room-tab"
                      }
                      onClick={() => chooseRoom(roomId)}
                      disabled={kind === "model"}
                      title={
                        kind === "model"
                          ? "Room teleport is available in the conceptual tour"
                          : `Jump to ${ROOM_LABELS[roomId]}`
                      }
                    >
                      {ROOM_LABELS[roomId]}
                    </button>
                  ))}
                </div>
                <button
                  className="tour-view-toggle"
                  type="button"
                  onClick={() =>
                    setViewMode(
                      viewMode === "explore" ? "dollhouse" : "explore"
                    )
                  }
                  aria-pressed={viewMode === "dollhouse"}
                >
                  <span aria-hidden="true">
                    {viewMode === "dollhouse" ? "◉" : "⌘"}
                  </span>
                  {viewMode === "dollhouse"
                    ? "Return to explore"
                    : "Dollhouse overview"}
                </button>
              </div>
              <div
                className="tour-mobile-controls"
                aria-label="Mobile movement controls"
              >
                <button
                  type="button"
                  className="tour-move-button tour-move-forward"
                  onClick={() => runtimeRef.current?.moveBy("forward")}
                  aria-label="Move forward"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="tour-move-button tour-move-left"
                  onClick={() => runtimeRef.current?.moveBy("left")}
                  aria-label="Move left"
                >
                  ←
                </button>
                <button
                  type="button"
                  className="tour-move-button tour-move-back"
                  onClick={() => runtimeRef.current?.moveBy("back")}
                  aria-label="Move backward"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="tour-move-button tour-move-right"
                  onClick={() => runtimeRef.current?.moveBy("right")}
                  aria-label="Move right"
                >
                  →
                </button>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
