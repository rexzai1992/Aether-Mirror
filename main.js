import * as THREE from "https://unpkg.com/three@0.163.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.163.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://unpkg.com/three@0.163.0/examples/jsm/loaders/GLTFLoader.js";
import {
  FilesetResolver,
  PoseLandmarker,
  HandLandmarker,
  FaceLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

// Cache loader responses in-memory to speed repeated GLB fetches during this session.
THREE.Cache.enabled = true;

const R2_ASSET_BASE_URL = String(globalThis.AETHER_R2_BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");

const DEFAULT_R2_AVATAR_MANIFEST = Object.freeze([
  { name: "Vanguard", file: "avatar.glb" },
  { name: "Iron Man Rig", file: "avatar_iron.glb" },
  { name: "Avaturn", file: "avaturn.glb" },
]);

const R2_AVATAR_MANIFEST = Array.isArray(globalThis.AETHER_R2_AVATARS)
  ? globalThis.AETHER_R2_AVATARS
  : DEFAULT_R2_AVATAR_MANIFEST;

function resolveR2AssetPath(fileName) {
  const cleanFile = String(fileName || "").trim().replace(/^\.?\//, "");
  if (!R2_ASSET_BASE_URL || !cleanFile) return "";
  return `${R2_ASSET_BASE_URL}/${cleanFile}`;
}

function toAvatarConfigEntry(entry, index) {
  if (!entry) return null;

  if (typeof entry === "string") {
    const file = entry.trim();
    if (!file) return null;
    return {
      name: `Avatar ${index + 1}`,
      path: resolveR2AssetPath(file),
    };
  }

  const rawFile = String(entry.file || "").trim();
  const rawPath = String(entry.path || "").trim();

  const isDirectPath =
    /^https?:\/\//i.test(rawPath) ||
    rawPath.startsWith("./") ||
    rawPath.startsWith("../") ||
    rawPath.startsWith("/");

  const resolvedPath = isDirectPath
    ? rawPath
    : resolveR2AssetPath(rawPath || rawFile);
  if (!resolvedPath) return null;

  const fallbackName = `Avatar ${index + 1}`;
  const name = String(entry.name || fallbackName).trim() || fallbackName;
  return {
    name,
    path: resolvedPath,
  };
}

const R2_AVATARS = R2_AVATAR_MANIFEST
  .map((entry, index) => toAvatarConfigEntry(entry, index))
  .filter((entry) => entry && entry.path);

const DEFAULT_R2_AVATAR = R2_AVATARS[0] || { name: "R2 Avatar", path: "" };

const CONFIG = {
  avatarPath: DEFAULT_R2_AVATAR.path,
  avatars: R2_AVATARS,
  defaultAvatarIndex: 0,
  rememberAvatarSelection: false,
  defaultLightingMode: "unlit",
  avatarStorageKey: "aether-selected-avatar-v2",
  lightingStorageKey: "aether-avatar-lighting-v2",
  smoothing: 0.28,
  rotationSmoothing: 0.24,
  landmarkConfidence: 0.45,
  gestureCooldownMs: 1400,
  swipeCooldownMs: 900,
  mirrorModeDefault: true,
  mirrorSwapSides: true,
  modelAssetBase: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
  poseModel:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
  handModel:
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  faceModel:
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
  coordinateScale: 2.35,
  depthScale: 2.1,
  overlayDepthScale: 1.1,
  bodyScaleMin: 0.8,
  bodyScaleMax: 1.6,
  shoulderReference: 0.27,
  gestureMoveGain: 2.2,
  gestureRotateGain: 3.4,
  gestureZoomGain: 1.9,
  calibrationOffsetLerp: 0.18,
  calibrationTargetFeetY: -0.86,
  calibrationTargetHipsY: -0.1,
  calibrationScaleLerp: 0.2,
  calibrationStorageKey: "aether-calibration-console-v2",
  orientationStorageKey: "aether-avatar-orientation-preset-v2",
  manualScaleMin: 0.5,
  manualScaleMax: 2.5,
  avatarPlacementLerp: 0.2,
  avatarScaleLerp: 0.22,
  avatarWrapScaleBoost: 1.0,
  avatarWrapScaleMin: 0.25,
  avatarWrapScaleMax: 4.0,
  avatarEmissiveIntensity: 0.08,
  avatarUnlitEmissiveIntensity: 1.15,
  avatarRoughness: 0.58,
  avatarMetalness: 0.18,
  shoulderScaleWeight: 0.68,
  faceScaleWeight: 0.32,
  handStandbyLength: 0.34,
  handTargetLerp: 0.42,
  handPalmLengthMin: 0.06,
  handPalmLengthMax: 0.18,
  armStandbyLerp: 0.28,
  armStandbyUpperScale: 0.82,
  armStandbyLowerScale: 0.76,
  poseLogIntervalMs: 1500,
  handLogIntervalMs: 1500,
  faceLogIntervalMs: 1500,
  mouthSmoothing: 0.32,
  mouthLerp: 0.28,
  mouthOpenGain: 1.35,
  mouthLandmarkOpenMin: 0.035,
  mouthLandmarkOpenMax: 0.28,
  jawOpenRadians: 0.34,
  debugOrbitControls: false,
  autoFlipAvatarVertical: true,
  avatarTargetHeight: 1.75,
  debugEnabledDefault: false,
  debugForceCameraDefault: false,
  debugLandmarksDefault: true,
  debugBonesDefault: false,
  debugLogMaxLines: 16,
};

const POSE = {
  NOSE: 0,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

const HAND = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

const FACE = {
  FOREHEAD: 10,
  NOSE_TIP: 1,
  UPPER_INNER_LIP: 13,
  LOWER_INNER_LIP: 14,
  CHIN: 152,
  LEFT_MOUTH: 61,
  RIGHT_MOUTH: 291,
  LEFT_CHEEK: 234,
  RIGHT_CHEEK: 454,
};

const POSE_DEBUG_CONNECTIONS = [
  [POSE.NOSE, POSE.LEFT_SHOULDER],
  [POSE.NOSE, POSE.RIGHT_SHOULDER],
  [POSE.LEFT_SHOULDER, POSE.RIGHT_SHOULDER],
  [POSE.LEFT_SHOULDER, POSE.LEFT_ELBOW],
  [POSE.LEFT_ELBOW, POSE.LEFT_WRIST],
  [POSE.RIGHT_SHOULDER, POSE.RIGHT_ELBOW],
  [POSE.RIGHT_ELBOW, POSE.RIGHT_WRIST],
  [POSE.LEFT_SHOULDER, POSE.LEFT_HIP],
  [POSE.RIGHT_SHOULDER, POSE.RIGHT_HIP],
  [POSE.LEFT_HIP, POSE.RIGHT_HIP],
  [POSE.LEFT_HIP, POSE.LEFT_KNEE],
  [POSE.LEFT_KNEE, POSE.LEFT_ANKLE],
  [POSE.RIGHT_HIP, POSE.RIGHT_KNEE],
  [POSE.RIGHT_KNEE, POSE.RIGHT_ANKLE],
  [POSE.LEFT_ANKLE, POSE.LEFT_FOOT_INDEX],
  [POSE.RIGHT_ANKLE, POSE.RIGHT_FOOT_INDEX],
];

const HAND_DEBUG_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

const FACE_LIPS_CONNECTIONS = [
  [61, 146], [146, 91], [91, 181], [181, 84], [84, 17],
  [17, 314], [314, 405], [405, 321], [321, 375], [375, 291],
  [61, 185], [185, 40], [40, 39], [39, 37], [37, 0],
  [0, 267], [267, 269], [269, 270], [270, 409], [409, 291],
  [78, 95], [95, 88], [88, 178], [178, 87], [87, 14],
  [14, 317], [317, 402], [402, 318], [318, 324], [324, 308],
  [78, 191], [191, 80], [80, 81], [81, 82], [82, 13],
  [13, 312], [312, 311], [311, 310], [310, 415], [415, 308],
];

const JOINT_NAMES = [
  "head",
  "neck",
  "chest",
  "spine",
  "hips",
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
  "leftHand",
  "rightHand",
  "leftHip",
  "rightHip",
  "leftKnee",
  "rightKnee",
  "leftAnkle",
  "rightAnkle",
  "leftFoot",
  "rightFoot",
];

const CALIBRATION_DEFAULTS = Object.freeze({
  anchor: "hips",
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  yawDeg: 0,
  scale: 1,
  handGain: 1,
  headGain: 1,
});

const HAND_GAIN_JOINTS = new Set([
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
  "leftHand",
  "rightHand",
]);
const HEAD_GAIN_JOINTS = new Set(["face", "head", "neck"]);

const FINGER_DEFS = [
  { name: "Thumb", joints: [HAND.THUMB_CMC, HAND.THUMB_MCP, HAND.THUMB_IP, HAND.THUMB_TIP] },
  { name: "Index", joints: [HAND.INDEX_MCP, HAND.INDEX_PIP, HAND.INDEX_DIP, HAND.INDEX_TIP] },
  { name: "Middle", joints: [HAND.MIDDLE_MCP, HAND.MIDDLE_PIP, HAND.MIDDLE_DIP, HAND.MIDDLE_TIP] },
  { name: "Ring", joints: [HAND.RING_MCP, HAND.RING_PIP, HAND.RING_DIP, HAND.RING_TIP] },
  { name: "Pinky", joints: [HAND.PINKY_MCP, HAND.PINKY_PIP, HAND.PINKY_DIP, HAND.PINKY_TIP] },
];

const FINGER_SUFFIXES = ["1", "2", "3"];

const MOUTH_BLENDSHAPE_ALIASES = [
  "jawopen",
  "mouthopen",
  "mouthopenwide",
  "mouthaa",
  "visemeaa",
  "visemea",
  "vrcvaa",
  "aa",
  "a",
];

const MIRROR_SIDE_PAIRS = [
  ["leftShoulder", "rightShoulder"],
  ["leftElbow", "rightElbow"],
  ["leftWrist", "rightWrist"],
  ["leftHand", "rightHand"],
  ["leftHip", "rightHip"],
  ["leftKnee", "rightKnee"],
  ["leftAnkle", "rightAnkle"],
  ["leftFoot", "rightFoot"],
];

const FALLBACK_SEGMENTS = [
  ["head", "neck"],
  ["neck", "chest"],
  ["chest", "spine"],
  ["spine", "hips"],
  ["chest", "leftShoulder"],
  ["chest", "rightShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["leftWrist", "leftHand"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  ["rightWrist", "rightHand"],
  ["hips", "leftHip"],
  ["hips", "rightHip"],
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  ["leftAnkle", "leftFoot"],
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
  ["rightAnkle", "rightFoot"],
];

const REQUIRED_BONES = [
  "hips",
  "spine",
  "chest",
  "neck",
  "head",
  "leftUpperArm",
  "leftLowerArm",
  "rightUpperArm",
  "rightLowerArm",
  "leftUpperLeg",
  "leftLowerLeg",
  "rightUpperLeg",
  "rightLowerLeg",
];

const BONE_ALIASES = {
  hips: [
    "hips",
    "pelvis",
    "root",
    "j_bip_c_hips",
    "mixamorighips",
    "bip001pelvis",
    "hips0234",
  ],
  spine: [
    "spine",
    "spine1",
    "spine01",
    "mixamorigspine",
    "j_bip_c_spine",
    "defspine001",
    "defspine014",
  ],
  chest: [
    "chest",
    "spine2",
    "spine02",
    "spine3",
    "upperchest",
    "mixamorigspine2",
    "j_bip_c_chest",
    "defspine003",
    "defspine004",
    "defspine002",
  ],
  neck: ["neck", "mixamorigneck", "j_bip_c_neck", "neck029"],
  head: ["head", "mixamorighead", "j_bip_c_head", "head032"],
  face: ["headfront", "face", "nose"],
  jaw: [
    "jaw",
    "lowerjaw",
    "mouth",
    "mouthlower",
    "j_bip_c_jaw",
    "cc_base_jawroot",
  ],
  leftShoulder: ["leftshoulder", "lshoulder", "mixamorigleftshoulder", "defshoulderl"],
  rightShoulder: ["rightshoulder", "rshoulder", "mixamorigrightshoulder", "defshoulderr"],
  leftUpperArm: [
    "leftarm",
    "leftupperarm",
    "lupperarm",
    "mixamorigleftarm",
    "leftuparm",
    "defupperarml",
    "upperarml",
  ],
  leftLowerArm: [
    "leftforearm",
    "leftlowerarm",
    "lforearm",
    "mixamorigleftforearm",
    "leftarmtwist",
    "defforearml",
    "forearml",
  ],
  leftHand: ["lefthand", "mixamoriglefthand", "lhand", "defhandl"],
  leftThumb1: ["lefthandthumb1", "leftthumb1", "leftthumbproximal", "thumb01l", "thumb1l", "defthumb01l"],
  leftThumb2: ["lefthandthumb2", "leftthumb2", "leftthumbintermediate", "thumb02l", "thumb2l", "defthumb02l"],
  leftThumb3: ["lefthandthumb3", "leftthumb3", "leftthumbdistal", "thumb03l", "thumb3l", "defthumb03l"],
  leftIndex1: ["lefthandindex1", "leftindex1", "leftindexproximal", "index01l", "index1l", "deffindex01l"],
  leftIndex2: ["lefthandindex2", "leftindex2", "leftindexintermediate", "index02l", "index2l", "deffindex02l"],
  leftIndex3: ["lefthandindex3", "leftindex3", "leftindexdistal", "index03l", "index3l", "deffindex03l"],
  leftMiddle1: ["lefthandmiddle1", "leftmiddle1", "leftmiddleproximal", "middle01l", "middle1l", "deffmiddle01l"],
  leftMiddle2: ["lefthandmiddle2", "leftmiddle2", "leftmiddleintermediate", "middle02l", "middle2l", "deffmiddle02l"],
  leftMiddle3: ["lefthandmiddle3", "leftmiddle3", "leftmiddledistal", "middle03l", "middle3l", "deffmiddle03l"],
  leftRing1: ["lefthandring1", "leftring1", "leftringproximal", "ring01l", "ring1l", "deffring01l"],
  leftRing2: ["lefthandring2", "leftring2", "leftringintermediate", "ring02l", "ring2l", "deffring02l"],
  leftRing3: ["lefthandring3", "leftring3", "leftringdistal", "ring03l", "ring3l", "deffring03l"],
  leftPinky1: ["lefthandpinky1", "leftpinky1", "leftlittleproximal", "pinky01l", "little01l", "deffpinky01l"],
  leftPinky2: ["lefthandpinky2", "leftpinky2", "leftlittleintermediate", "pinky02l", "little02l", "deffpinky02l"],
  leftPinky3: ["lefthandpinky3", "leftpinky3", "leftlittledistal", "pinky03l", "little03l", "deffpinky03l"],
  rightUpperArm: [
    "rightarm",
    "rightupperarm",
    "rupperarm",
    "mixamorigrightarm",
    "rightuparm",
    "defupperarmr",
    "upperarmr",
  ],
  rightLowerArm: [
    "rightforearm",
    "rightlowerarm",
    "rforearm",
    "mixamorigrightforearm",
    "rightarmtwist",
    "defforearmr",
    "forearmr",
  ],
  rightHand: ["righthand", "mixamorigrighthand", "rhand", "defhandr"],
  rightThumb1: ["righthandthumb1", "rightthumb1", "rightthumbproximal", "thumb01r", "thumb1r", "defthumb01r"],
  rightThumb2: ["righthandthumb2", "rightthumb2", "rightthumbintermediate", "thumb02r", "thumb2r", "defthumb02r"],
  rightThumb3: ["righthandthumb3", "rightthumb3", "rightthumbdistal", "thumb03r", "thumb3r", "defthumb03r"],
  rightIndex1: ["righthandindex1", "rightindex1", "rightindexproximal", "index01r", "index1r", "deffindex01r"],
  rightIndex2: ["righthandindex2", "rightindex2", "rightindexintermediate", "index02r", "index2r", "deffindex02r"],
  rightIndex3: ["righthandindex3", "rightindex3", "rightindexdistal", "index03r", "index3r", "deffindex03r"],
  rightMiddle1: ["righthandmiddle1", "rightmiddle1", "rightmiddleproximal", "middle01r", "middle1r", "deffmiddle01r"],
  rightMiddle2: ["righthandmiddle2", "rightmiddle2", "rightmiddleintermediate", "middle02r", "middle2r", "deffmiddle02r"],
  rightMiddle3: ["righthandmiddle3", "rightmiddle3", "rightmiddledistal", "middle03r", "middle3r", "deffmiddle03r"],
  rightRing1: ["righthandring1", "rightring1", "rightringproximal", "ring01r", "ring1r", "deffring01r"],
  rightRing2: ["righthandring2", "rightring2", "rightringintermediate", "ring02r", "ring2r", "deffring02r"],
  rightRing3: ["righthandring3", "rightring3", "rightringdistal", "ring03r", "ring3r", "deffring03r"],
  rightPinky1: ["righthandpinky1", "rightpinky1", "rightlittleproximal", "pinky01r", "little01r", "deffpinky01r"],
  rightPinky2: ["righthandpinky2", "rightpinky2", "rightlittleintermediate", "pinky02r", "little02r", "deffpinky02r"],
  rightPinky3: ["righthandpinky3", "rightpinky3", "rightlittledistal", "pinky03r", "little03r", "deffpinky03r"],
  leftUpperLeg: [
    "leftupleg",
    "leftupperleg",
    "thigh_l",
    "lthigh",
    "mixamorigleftupleg",
    "defthighl",
    "thighl",
  ],
  leftLowerLeg: ["leftleg", "leftlowerleg", "lshin", "mixamorigleftleg", "defshinl", "shinl"],
  leftFoot: ["leftfoot", "lfoot", "mixamorigleftfoot", "deffootl", "footl"],
  rightUpperLeg: [
    "rightupleg",
    "rightupperleg",
    "thigh_r",
    "rthigh",
    "mixamorigrightupleg",
    "defthighr",
    "thighr",
  ],
  rightLowerLeg: ["rightleg", "rightlowerleg", "rshin", "mixamorigrightleg", "defshinr", "shinr"],
  rightFoot: ["rightfoot", "rfoot", "mixamorigrightfoot", "deffootr", "footr"],
};

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function normalizeName(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function scoreAliasMatch(nameNorm, aliasNorm) {
  if (!nameNorm || !aliasNorm) return -1;
  if (nameNorm === aliasNorm) return 1000;
  if (nameNorm.endsWith(aliasNorm)) return 760 - (nameNorm.length - aliasNorm.length);
  if (nameNorm.startsWith(aliasNorm)) return 740 - (nameNorm.length - aliasNorm.length);
  if (nameNorm.includes(aliasNorm)) return 500 - (nameNorm.length - aliasNorm.length);
  return -1;
}

function midpoint(a, b) {
  return a.clone().add(b).multiplyScalar(0.5);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function averagePoints(points) {
  if (!points.length) return null;
  const out = new THREE.Vector3();
  for (const p of points) out.add(p);
  return out.multiplyScalar(1 / points.length);
}

class StatusUI {
  constructor() {
    this.startOverlay = document.getElementById("start-overlay");
    this.startBtn = document.getElementById("start-btn");
    this.startAvatarBtn = document.getElementById("start-avatar-btn");
    this.calibrateBtn = document.getElementById("calibrate-btn");
    this.flipBtn = document.getElementById("flip-btn");
    this.avatarBtn = document.getElementById("avatar-btn");
    this.lightBtn = document.getElementById("light-btn");
    this.debugBtn = document.getElementById("debug-btn");
    this.cameraDebugBtn = document.getElementById("camera-debug-btn");
    this.landmarkDebugBtn = document.getElementById("landmark-debug-btn");
    this.bonesDebugBtn = document.getElementById("bones-debug-btn");
    this.debugLogEl = document.getElementById("debug-log");
    this.startNote = document.getElementById("start-note");
    this.modeChip = document.getElementById("mode-chip");
    this.gestureChip = document.getElementById("gesture-chip");
    this.calibrationConsole = {
      panel: document.getElementById("calibration-console"),
      anchor: document.getElementById("cal-anchor"),
      offsetX: document.getElementById("cal-offset-x"),
      offsetY: document.getElementById("cal-offset-y"),
      offsetZ: document.getElementById("cal-offset-z"),
      yaw: document.getElementById("cal-yaw"),
      scale: document.getElementById("cal-scale"),
      handGain: document.getElementById("cal-hand-gain"),
      headGain: document.getElementById("cal-head-gain"),
      offsetXVal: document.getElementById("cal-offset-x-val"),
      offsetYVal: document.getElementById("cal-offset-y-val"),
      offsetZVal: document.getElementById("cal-offset-z-val"),
      yawVal: document.getElementById("cal-yaw-val"),
      scaleVal: document.getElementById("cal-scale-val"),
      handGainVal: document.getElementById("cal-hand-gain-val"),
      headGainVal: document.getElementById("cal-head-gain-val"),
      resetBtn: document.getElementById("cal-reset-btn"),
      saveBtn: document.getElementById("cal-save-btn"),
    };

    this.statusRefs = {
      camera: document.getElementById("status-camera"),
      pose: document.getElementById("status-pose"),
      hands: document.getElementById("status-hands"),
      face: document.getElementById("status-face"),
      mouth: document.getElementById("status-mouth"),
      body: document.getElementById("status-body"),
      avatar: document.getElementById("status-avatar"),
      skeleton: document.getElementById("status-skeleton"),
      fingerRig: document.getElementById("status-finger-rig"),
      mouthRig: document.getElementById("status-mouth-rig"),
      fallback: document.getElementById("status-fallback"),
      estimate: document.getElementById("status-estimate"),
      calibration: document.getElementById("status-calibration"),
      orientation: document.getElementById("status-orientation"),
      gesture: document.getElementById("status-gesture"),
      videoRes: document.getElementById("status-video-res"),
      poseCount: document.getElementById("status-pose-count"),
      handCount: document.getElementById("status-hand-count"),
      fps: document.getElementById("status-fps"),
    };
  }

  setStatus(key, value) {
    const el = this.statusRefs[key];
    if (el) el.textContent = value;
  }

  setGesture(label) {
    this.gestureChip.textContent = `Gesture: ${label}`;
    this.setStatus("gesture", label);
  }

  setMode(isMirror) {
    this.modeChip.textContent = `Mode: ${isMirror ? "Mirror AR" : "Full Avatar"}`;
    document.body.classList.toggle("full-avatar", !isMirror);
  }

  hideOverlay() {
    this.startOverlay.classList.add("hidden");
  }

  showStartNote(message, error = false) {
    this.startNote.textContent = message;
    this.startNote.style.color = error ? "#ff8d8d" : "#ffd58a";
  }
}

class FpsMeter {
  constructor() {
    this.last = performance.now();
    this.samples = [];
  }

  tick() {
    const now = performance.now();
    const dt = now - this.last;
    this.last = now;
    const fps = 1000 / Math.max(dt, 1);
    this.samples.push(fps);
    if (this.samples.length > 30) this.samples.shift();
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    return Math.round(avg);
  }
}

class DebugLogger {
  constructor(ui, maxLines) {
    this.ui = ui;
    this.maxLines = maxLines;
    this.lines = [];
  }

  push(message, level = "INFO") {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    const line = `[${ts}] [${level}] ${message}`;
    this.lines.push(line);
    if (this.lines.length > this.maxLines) this.lines.shift();
    if (this.ui.debugLogEl) {
      this.ui.debugLogEl.textContent = this.lines.join("\n");
    }
  }
}

class LandmarkSmoother {
  constructor(alpha) {
    this.alpha = alpha;
    this.store = new Map();
  }

  update(joints) {
    const out = {};
    for (const [name, value] of Object.entries(joints)) {
      if (!value) continue;
      if (!this.store.has(name)) {
        this.store.set(name, value.clone());
      } else {
        this.store.get(name).lerp(value, this.alpha);
      }
      out[name] = this.store.get(name).clone();
    }

    for (const [name, value] of this.store.entries()) {
      if (!out[name]) out[name] = value.clone();
    }
    return out;
  }
}

class ProceduralSkeletonRig {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = "ProceduralSkeletonRig";

    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x7ce8ff,
      emissive: 0x0a2e40,
      roughness: 0.42,
      metalness: 0.2,
    });

    const boneMat = new THREE.MeshStandardMaterial({
      color: 0x94ffc6,
      emissive: 0x0f3b2c,
      roughness: 0.35,
      metalness: 0.15,
    });

    this.joints = {};
    const jointGeometry = new THREE.SphereGeometry(0.04, 18, 18);
    for (const name of JOINT_NAMES) {
      const mesh = new THREE.Mesh(jointGeometry, jointMat.clone());
      mesh.name = `joint-${name}`;
      this.joints[name] = mesh;
      this.group.add(mesh);
    }

    this.bones = [];
    const boneGeometry = new THREE.CylinderGeometry(0.015, 0.015, 1, 12);
    for (const [a, b] of FALLBACK_SEGMENTS) {
      const boneMesh = new THREE.Mesh(boneGeometry, boneMat.clone());
      boneMesh.name = `bone-${a}-${b}`;
      this.group.add(boneMesh);
      this.bones.push({ from: a, to: b, mesh: boneMesh });
    }

  }

  setStyle(index) {
    for (const joint of Object.values(this.joints)) {
      if (index % 2 === 0) {
        joint.material.color.setHex(0x7ce8ff);
        joint.material.emissive.setHex(0x0a2e40);
      } else {
        joint.material.color.setHex(0xffd4a2);
        joint.material.emissive.setHex(0x4c2e11);
      }
    }

    for (const bone of this.bones) {
      if (index % 2 === 0) {
        bone.mesh.material.color.setHex(0x94ffc6);
        bone.mesh.material.emissive.setHex(0x0f3b2c);
      } else {
        bone.mesh.material.color.setHex(0xff9f8d);
        bone.mesh.material.emissive.setHex(0x421a14);
      }
    }
  }

  update(joints) {
    for (const [name, mesh] of Object.entries(this.joints)) {
      const joint = joints[name];
      if (joint) mesh.position.copy(joint);
    }

    for (const link of this.bones) {
      const a = joints[link.from];
      const b = joints[link.to];
      if (!a || !b) continue;

      const dir = b.clone().sub(a);
      const length = Math.max(dir.length(), 0.0001);
      const mid = midpoint(a, b);
      link.mesh.position.copy(mid);
      link.mesh.scale.set(1, length, 1);
      link.mesh.quaternion.setFromUnitVectors(Y_AXIS, dir.normalize());
    }
  }
}

class AvatarMotionSystem {
  constructor(scene, ui) {
    this.scene = scene;
    this.ui = ui;
    this.root = new THREE.Group();
    this.root.name = "AvatarRoot";
    this.scene.add(this.root);

    this.displayNode = new THREE.Group();
    this.displayNode.name = "AvatarDisplayNode";
    this.root.add(this.displayNode);

    this.fallbackRig = new ProceduralSkeletonRig();
    this.displayNode.add(this.fallbackRig.group);

    this.avatarScene = null;
    this.avatarSkinnedMesh = null;
    this.boneMap = null;
    this.boneSolvers = [];
    this.fingerSolverCount = 0;
    this.mouthTargets = [];
    this.mouthRigFound = false;
    this.mouthOpen = 0;
    this.jawBone = null;
    this.jawInitialQuat = null;

    this.useFallback = true;
    this.avatarLoaded = false;
    this.skeletonFound = false;
    this.frozen = false;
    this.styleIndex = 0;
    this.trackingScale = 1;
    this.gestureScaleMultiplier = 1;
    this.calibrationScaleMultiplier = 1;
    this.manualScaleMultiplier = 1;
    this.targetScale = 1;
    this.avatarBaseScale = 1;
    this.skeletonHelper = null;
    this.debugBonesVisible = CONFIG.debugBonesDefault;
    this.avatarPlacementInitialized = false;
    this.rigMetrics = null;
    this.lightingMode = "lit";

    this.rootAxes = new THREE.AxesHelper(0.35);
    this.rootAxes.visible = false;
    this.root.add(this.rootAxes);

    this.orientationOffsets = [
      { x: 0, z: 0, label: "normal" },
      { x: Math.PI, z: 0, label: "flip x" },
      { x: 0, z: Math.PI, label: "flip z" },
      { x: Math.PI, z: Math.PI, label: "flip x+z" },
    ];
    this.autoFlipX = 0;
    this.orientationPreset = 0;

    try {
      const saved = Number(window.localStorage.getItem(CONFIG.orientationStorageKey));
      if (Number.isInteger(saved) && saved >= 0 && saved < this.orientationOffsets.length) {
        this.orientationPreset = saved;
      }
    } catch {
      // ignore storage read errors
    }

    this.applyOrientationPreset(false);
  }

  disposeMaterial(material) {
    if (!material) return;
    if (Array.isArray(material)) {
      for (const item of material) this.disposeMaterial(item);
      return;
    }

    for (const value of Object.values(material)) {
      if (value?.isTexture) value.dispose();
    }
    if (typeof material.dispose === "function") material.dispose();
  }

  rememberMaterialDefaults(material) {
    if (!material || material.userData?.aetherLightingDefaults) return;

    material.userData.aetherLightingDefaults = {
      emissive: material.emissive?.clone?.() || null,
      emissiveIntensity: material.emissiveIntensity ?? 1,
      emissiveMap: material.emissiveMap || null,
      roughness: material.roughness,
      metalness: material.metalness,
      toneMapped: material.toneMapped,
    };
  }

  applyLightingModeToMaterial(material) {
    if (!material) return;

    this.rememberMaterialDefaults(material);
    const defaults = material.userData.aetherLightingDefaults || {};

    if (material.map) {
      material.map.colorSpace = THREE.SRGBColorSpace;
      material.map.needsUpdate = true;
    }

    if (this.lightingMode === "unlit") {
      material.toneMapped = false;
      if (material.emissive) {
        material.emissive.setRGB(1, 1, 1);
        material.emissiveIntensity = CONFIG.avatarUnlitEmissiveIntensity;
      }
      if ("emissiveMap" in material && material.map) {
        material.emissiveMap = material.map;
      }
      if ("roughness" in material) material.roughness = 1;
      if ("metalness" in material) material.metalness = 0;
    } else {
      material.toneMapped = true;
      if (material.emissive) {
        material.emissive.setRGB(0.02, 0.02, 0.02);
        material.emissiveIntensity = CONFIG.avatarEmissiveIntensity;
      }
      if ("emissiveMap" in material) {
        material.emissiveMap = defaults.emissiveMap || null;
      }
      if ("roughness" in material) material.roughness = CONFIG.avatarRoughness;
      if ("metalness" in material) {
        material.metalness = Math.max(defaults.metalness || 0, CONFIG.avatarMetalness);
      }
    }

    material.needsUpdate = true;
  }

  enhanceAvatarMaterials() {
    if (!this.avatarScene) return;

    this.avatarScene.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;

      obj.castShadow = true;
      obj.receiveShadow = true;

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const material of materials) {
        this.applyLightingModeToMaterial(material);
      }
    });
  }

  setLightingMode(mode) {
    this.lightingMode = mode === "unlit" ? "unlit" : "lit";
    this.enhanceAvatarMaterials();
  }

  clearLoadedAvatar() {
    if (this.skeletonHelper) {
      this.scene.remove(this.skeletonHelper);
      this.skeletonHelper.geometry?.dispose?.();
      this.disposeMaterial(this.skeletonHelper.material);
      this.skeletonHelper = null;
    }

    if (this.avatarScene) {
      this.displayNode.remove(this.avatarScene);
      this.avatarScene.traverse((obj) => {
        obj.geometry?.dispose?.();
        this.disposeMaterial(obj.material);
      });
    }

    this.avatarScene = null;
    this.avatarSkinnedMesh = null;
    this.boneMap = null;
    this.boneSolvers = [];
    this.fingerSolverCount = 0;
    this.mouthTargets = [];
    this.mouthRigFound = false;
    this.mouthOpen = 0;
    this.jawBone = null;
    this.jawInitialQuat = null;
    this.avatarLoaded = false;
    this.skeletonFound = false;
    this.rigMetrics = null;
    this.avatarPlacementInitialized = false;
    this.avatarBaseScale = 1;
    this.autoFlipX = 0;
    this.displayNode.position.set(0, 0, 0);
    this.applyOrientationPreset(false);
    this.ui.setStatus("fingerRig", "checking");
    this.ui.setStatus("mouthRig", "checking");
  }

  async loadAvatar(path) {
    this.clearLoadedAvatar();

    if (!path) {
      console.warn("No avatar found. Using fallback skeleton rig.");
      this.ui.setStatus("avatar", "not loaded");
      this.activateFallback(true);
      return;
    }

    const loader = new GLTFLoader();

    try {
      const gltf = await loader.loadAsync(path);
      this.avatarScene = gltf.scene;
      this.displayNode.add(this.avatarScene);
      this.avatarLoaded = true;
      this.enhanceAvatarMaterials();

      this.avatarSkinnedMesh = null;
      this.avatarScene.traverse((obj) => {
        if (!this.avatarSkinnedMesh && obj.isSkinnedMesh && obj.skeleton) {
          this.avatarSkinnedMesh = obj;
        }
      });

      if (!this.avatarSkinnedMesh || !this.avatarSkinnedMesh.skeleton) {
        console.warn("Avatar is not rigged. Using fallback skeleton rig.");
        this.ui.setStatus("avatar", "loaded (unrigged)");
        this.ui.setStatus("skeleton", "no");
        this.activateFallback(true);
        return;
      }

      const bones = this.avatarSkinnedMesh.skeleton.bones;
      console.log("Detected avatar bones:", bones.map((b) => b.name));

      this.boneMap = this.mapBones(bones);
      const missing = REQUIRED_BONES.filter((k) => !this.boneMap[k]);
      console.log("Missing required bones:", missing);
      console.log(
        "Resolved bone map:",
        Object.fromEntries(
          Object.entries(this.boneMap).map(([k, v]) => [k, v?.name || null])
        )
      );

      if (missing.length > 4) {
        console.warn("Avatar is not rigged. Using fallback skeleton rig.");
        this.ui.setStatus("avatar", "loaded (invalid rig)");
        this.ui.setStatus("skeleton", "partial");
        this.activateFallback(true);
        return;
      }

      this.skeletonFound = true;
      this.ui.setStatus("avatar", "loaded");
      this.ui.setStatus("skeleton", "yes");
      this.normalizeAvatarScaleAndOrientation();
      this.activateFallback(false);
      this.captureRigMetrics();
      this.buildBoneSolvers();
      this.reportFingerRig();
      this.detectMouthRig();
      this.reportMouthRig();
      this.ensureSkeletonHelper();
      this.setDebugBonesVisible(this.debugBonesVisible);
    } catch (error) {
      console.warn("No avatar found. Using fallback skeleton rig.", error);
      this.ui.setStatus("avatar", "not loaded");
      this.ui.setStatus("skeleton", "no");
      this.activateFallback(true);
    }
  }

  activateFallback(flag) {
    this.useFallback = flag;
    this.fallbackRig.group.visible = flag;
    if (this.avatarScene) this.avatarScene.visible = !flag;
    if (flag) {
      this.displayNode.position.set(0, 0, 0);
      this.avatarPlacementInitialized = false;
      this.fingerSolverCount = 0;
      this.ui.setStatus("fingerRig", "unavailable");
      this.ui.setStatus("mouthRig", "unavailable");
    }
    if (this.skeletonHelper) this.skeletonHelper.visible = !flag && this.debugBonesVisible;
    this.ui.setStatus("fallback", flag ? "active" : "inactive");
  }

  ensureSkeletonHelper() {
    if (!this.avatarSkinnedMesh || this.skeletonHelper) return;
    this.skeletonHelper = new THREE.SkeletonHelper(this.avatarSkinnedMesh);
    const helperMaterial = this.skeletonHelper.material;
    const tuneMaterial = (mat) => {
      if (!mat) return;
      mat.depthTest = false;
      mat.depthWrite = false;
      mat.transparent = true;
      mat.opacity = 0.95;
      mat.toneMapped = false;
    };
    if (Array.isArray(helperMaterial)) {
      for (const item of helperMaterial) tuneMaterial(item);
    } else {
      tuneMaterial(helperMaterial);
    }
    this.skeletonHelper.renderOrder = 999;
    this.skeletonHelper.visible = !this.useFallback && this.debugBonesVisible;
    this.scene.add(this.skeletonHelper);
  }

  setDebugBonesVisible(flag) {
    this.debugBonesVisible = Boolean(flag);
    this.ensureSkeletonHelper();
    if (this.skeletonHelper) {
      this.skeletonHelper.visible = !this.useFallback && this.debugBonesVisible;
    }
  }

  setDebugRootAxes(flag) {
    this.rootAxes.visible = Boolean(flag);
  }

  mapBones(bones) {
    const mapped = {};
    const used = new Set();
    const candidates = bones.map((bone) => ({
      bone,
      norm: normalizeName(bone.name),
    }));

    for (const [semantic, aliases] of Object.entries(BONE_ALIASES)) {
      let best = null;
      for (const candidate of candidates) {
        if (used.has(candidate.bone)) continue;
        for (const alias of aliases) {
          const score = scoreAliasMatch(candidate.norm, normalizeName(alias));
          if (score < 0) continue;
          if (!best || score > best.score) {
            best = { bone: candidate.bone, score };
          }
        }
      }

      if (best) {
        mapped[semantic] = best.bone;
        used.add(best.bone);
      }
    }

    const neckParent = mapped.neck?.parent;
    if (neckParent?.isBone && normalizeName(neckParent.name).startsWith("spine")) {
      mapped.chest = neckParent;
    }

    const chestParent = mapped.chest?.parent;
    if (chestParent?.isBone && normalizeName(chestParent.name).startsWith("spine")) {
      mapped.spine = chestParent;
    }

    return mapped;
  }

  buildBoneSolvers() {
    const segments = [
      // Drive upper-body chain from torso -> neck -> face to avoid over-rotating head/neck.
      ["head", "head", "face", "face"],
      ["neck", "chest", "head", "head"],
      ["chest", "chest", "neck", "neck"],
      ["spine", "hips", "chest", "chest"],
      ["leftUpperArm", "leftShoulder", "leftElbow", "leftLowerArm"],
      ["leftLowerArm", "leftElbow", "leftWrist", "leftHand"],
      ["rightUpperArm", "rightShoulder", "rightElbow", "rightLowerArm"],
      ["rightLowerArm", "rightElbow", "rightWrist", "rightHand"],
      ["leftUpperLeg", "leftHip", "leftKnee", "leftLowerLeg"],
      ["leftLowerLeg", "leftKnee", "leftAnkle", "leftFoot"],
      ["rightUpperLeg", "rightHip", "rightKnee", "rightLowerLeg"],
      ["rightLowerLeg", "rightKnee", "rightAnkle", "rightFoot"],
    ];

    const fingerSegments = [];
    for (const side of ["left", "right"]) {
      for (const finger of FINGER_DEFS) {
        const prefix = `${side}${finger.name}`;
        fingerSegments.push([`${prefix}1`, `${prefix}1`, `${prefix}2`, `${prefix}2`]);
        fingerSegments.push([`${prefix}2`, `${prefix}2`, `${prefix}3`, `${prefix}3`]);
        fingerSegments.push([`${prefix}3`, `${prefix}3`, `${prefix}Tip`, null]);
      }
    }

    this.boneSolvers = [];
    this.fingerSolverCount = 0;

    const addSolver = (boneKey, startJoint, endJoint, childBoneKey, isFinger = false) => {
      const bone = this.boneMap?.[boneKey];
      if (!bone) return;

      const preferredChild = this.boneMap?.[childBoneKey];
      const child = preferredChild?.parent === bone
        ? preferredChild
        : null;
      const children = bone.children.filter((c) => c.isBone && c.position.length() > 0.0001);

      let restDirLocal = null;
      if (child) {
        restDirLocal = child.position.clone().normalize();
      } else if (children.length) {
        // Some rigs (for example head with two eye children) need an averaged direction.
        const averaged = children.reduce((sum, c) => sum.add(c.position), new THREE.Vector3());
        if (averaged.lengthSq() > 0.000001) {
          restDirLocal = averaged.normalize();
        } else {
          restDirLocal = children[0].position.clone().normalize();
        }
      } else if (bone.position.lengthSq() > 0.000001) {
        // Terminal bones (finger tips) can fall back to parent->bone direction.
        restDirLocal = bone.position.clone().normalize();
      } else {
        restDirLocal = new THREE.Vector3(0, 1, 0);
      }

      this.boneSolvers.push({
        bone,
        startJoint,
        endJoint,
        childBoneKey,
        initialQuat: bone.quaternion.clone(),
        restDirLocal,
        initialRestDirLocal: restDirLocal.clone().applyQuaternion(bone.quaternion).normalize(),
        isFinger,
      });
      if (isFinger) this.fingerSolverCount += 1;
    };

    for (const segment of segments) {
      addSolver(...segment, false);
    }

    for (const segment of fingerSegments) {
      addSolver(...segment, true);
    }
  }

  reportFingerRig() {
    if (this.fingerSolverCount > 0) {
      this.ui.setStatus("fingerRig", `${this.fingerSolverCount} bones`);
      console.log(`Finger rig detected: ${this.fingerSolverCount} finger bones mapped.`);
    } else {
      this.ui.setStatus("fingerRig", "not in avatar");
      console.warn("Avatar has no finger bones. Finger skeleton tracking needs a GLB with finger rig bones.");
    }
  }

  detectMouthRig() {
    this.mouthTargets = [];
    this.jawBone = this.boneMap?.jaw || null;
    this.jawInitialQuat = this.jawBone ? this.jawBone.quaternion.clone() : null;

    const allMorphNames = [];
    if (this.avatarScene) {
      this.avatarScene.traverse((obj) => {
        if (!obj.isMesh || !obj.morphTargetDictionary || !obj.morphTargetInfluences) return;

        for (const [name, index] of Object.entries(obj.morphTargetDictionary)) {
          allMorphNames.push(`${obj.name || "mesh"}:${name}`);
          const norm = normalizeName(name);
          const isMouthMorph = MOUTH_BLENDSHAPE_ALIASES.some((alias) => (
            alias.length <= 2 ? norm === alias : norm === alias || norm.includes(alias)
          ));
          if (!isMouthMorph) {
            continue;
          }

          this.mouthTargets.push({
            mesh: obj,
            index,
            name,
            initial: obj.morphTargetInfluences[index] || 0,
          });
        }
      });
    }

    if (allMorphNames.length) {
      console.log("Detected avatar morph targets:", allMorphNames);
    } else {
      console.log("Detected avatar morph targets: none");
    }

    this.mouthRigFound = Boolean(this.mouthTargets.length || this.jawBone);
  }

  reportMouthRig() {
    if (this.mouthTargets.length) {
      this.ui.setStatus("mouthRig", `${this.mouthTargets.length} morphs`);
      console.log("Mouth morph targets mapped:", this.mouthTargets.map((target) => target.name));
      return;
    }

    if (this.jawBone) {
      this.ui.setStatus("mouthRig", `jaw bone: ${this.jawBone.name}`);
      console.log(`Mouth jaw bone mapped: ${this.jawBone.name}`);
      return;
    }

    this.ui.setStatus("mouthRig", "not in avatar");
    console.warn("Avatar has no mouth/jaw rig. Mouth tracking value will show in debug, but this GLB cannot animate lips.");
  }

  applyMouth(openAmount = 0, dt = 1 / 60) {
    const targetOpen = clamp(openAmount || 0, 0, 1);
    const alpha = clamp(dt * 60 * CONFIG.mouthLerp, 0.06, 0.5);
    this.mouthOpen = THREE.MathUtils.lerp(this.mouthOpen, targetOpen, alpha);

    if (this.useFallback) {
      return;
    }

    for (const target of this.mouthTargets) {
      target.mesh.morphTargetInfluences[target.index] = THREE.MathUtils.lerp(
        target.mesh.morphTargetInfluences[target.index] || 0,
        clamp(target.initial + this.mouthOpen, 0, 1),
        alpha
      );
    }

    if (this.jawBone && this.jawInitialQuat) {
      const jawRotation = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        -this.mouthOpen * CONFIG.jawOpenRadians
      );
      const targetQuat = this.jawInitialQuat.clone().multiply(jawRotation);
      this.jawBone.quaternion.slerp(targetQuat, alpha);
    }
  }

  normalizeAvatarScaleAndOrientation() {
    if (!this.avatarScene) return;

    this.avatarScene.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(this.avatarScene);
    const size = bbox.getSize(new THREE.Vector3());
    const rawHeight = Math.max(size.y, 0.0001);

    const heightScale = CONFIG.avatarTargetHeight / rawHeight;
    this.avatarBaseScale = clamp(heightScale, 0.1, 180);
    this.avatarScene.scale.multiplyScalar(this.avatarBaseScale);
    this.avatarScene.updateMatrixWorld(true);

    const hipsBone = this.boneMap?.hips;
    const headBone = this.boneMap?.head;
    if (CONFIG.autoFlipAvatarVertical && hipsBone && headBone) {
      const hipsPos = new THREE.Vector3();
      const headPos = new THREE.Vector3();
      hipsBone.getWorldPosition(hipsPos);
      headBone.getWorldPosition(headPos);
      if (headPos.y < hipsPos.y) {
        this.autoFlipX = Math.PI;
        console.warn("Avatar vertical orientation corrected (auto-flip applied).");
      } else {
        this.autoFlipX = 0;
      }
    }
    this.applyOrientationPreset(false);

    console.log("Avatar normalized:", {
      rawHeight,
      baseScale: this.avatarBaseScale,
    });
  }

  getOrientationLabel() {
    return this.orientationOffsets[this.orientationPreset]?.label || "normal";
  }

  applyOrientationPreset(save = true) {
    const preset = this.orientationOffsets[this.orientationPreset] || this.orientationOffsets[0];
    this.displayNode.rotation.set(this.autoFlipX + preset.x, 0, preset.z);
    this.ui.setStatus("orientation", this.getOrientationLabel());
    if (save) {
      try {
        window.localStorage.setItem(CONFIG.orientationStorageKey, String(this.orientationPreset));
      } catch {
        // ignore storage write errors
      }
    }
  }

  cycleOrientationPreset() {
    this.orientationPreset = (this.orientationPreset + 1) % this.orientationOffsets.length;
    this.applyOrientationPreset(true);
    this.avatarPlacementInitialized = false;
    return this.getOrientationLabel();
  }

  applyPose(joints, bodyScale, dt, options = {}) {
    if (this.frozen) return;
    this.applyMouth(options.mouthOpen || 0, dt);

    if (this.useFallback) {
      this.trackingScale = THREE.MathUtils.lerp(this.trackingScale, 1, 0.2);
      this.refreshScale();
      this.fallbackRig.update(joints);
      return;
    }

    this.updateRigScale(joints, bodyScale, dt, options);
    this.applyBones(joints, dt);
    this.alignAvatarPlacement(joints, dt, options);
  }

  captureRigMetrics() {
    if (!this.avatarScene || !this.boneMap) return;
    this.avatarScene.updateMatrixWorld(true);
    this.displayNode.updateMatrixWorld(true);

    const localPosition = (boneKey) => {
      const bone = this.boneMap?.[boneKey];
      if (!bone) return null;
      const world = new THREE.Vector3();
      bone.getWorldPosition(world);
      return this.displayNode.worldToLocal(world.clone());
    };

    const leftShoulder = localPosition("leftShoulder") || localPosition("leftUpperArm");
    const rightShoulder = localPosition("rightShoulder") || localPosition("rightUpperArm");
    const hips = localPosition("hips");
    const head = localPosition("head");
    const face = localPosition("face") || head;
    const chest = localPosition("chest") || localPosition("spine");
    const shoulderWidth = leftShoulder && rightShoulder ? leftShoulder.distanceTo(rightShoulder) : 0;
    const headToHips = head && hips ? head.distanceTo(hips) : 0;
    const faceToChest = face && chest ? face.distanceTo(chest) : 0;

    this.rigMetrics = {
      shoulderWidth: Math.max(shoulderWidth, 0.001),
      headToHips: Math.max(headToHips, 0.001),
      faceToChest: Math.max(faceToChest, 0.001),
    };

    console.log("Avatar wrap metrics:", this.rigMetrics);
  }

  updateRigScale(joints, bodyScale, dt, options = {}) {
    const scaleSamples = [];

    if (this.rigMetrics?.shoulderWidth && joints?.leftShoulder && joints?.rightShoulder) {
      const trackedShoulderWidth = joints.leftShoulder.distanceTo(joints.rightShoulder);
      scaleSamples.push({
        value: trackedShoulderWidth / this.rigMetrics.shoulderWidth,
        weight: CONFIG.shoulderScaleWeight,
      });
    }

    if (this.rigMetrics?.faceToChest && joints?.face && joints?.chest) {
      const trackedFaceToChest = joints.face.distanceTo(joints.chest);
      scaleSamples.push({
        value: trackedFaceToChest / this.rigMetrics.faceToChest,
        weight: CONFIG.faceScaleWeight,
      });
    }

    if (!options.lowerEstimated && this.rigMetrics?.headToHips && joints?.head && joints?.hips) {
      const trackedHeadToHips = joints.head.distanceTo(joints.hips);
      scaleSamples.push({
        value: trackedHeadToHips / this.rigMetrics.headToHips,
        weight: 0.28,
      });
    }

    let targetScale = clamp(bodyScale || 1, CONFIG.bodyScaleMin, CONFIG.bodyScaleMax);
    const totalWeight = scaleSamples.reduce((sum, sample) => sum + sample.weight, 0);
    if (totalWeight > 0) {
      targetScale = scaleSamples.reduce(
        (sum, sample) => sum + sample.value * sample.weight,
        0
      ) / totalWeight;
    }

    targetScale = clamp(
      targetScale * CONFIG.avatarWrapScaleBoost,
      CONFIG.avatarWrapScaleMin,
      CONFIG.avatarWrapScaleMax
    );

    const alpha = this.avatarPlacementInitialized
      ? clamp(dt * 60 * CONFIG.avatarScaleLerp, 0.08, 0.38)
      : 1;
    this.trackingScale = THREE.MathUtils.lerp(this.trackingScale, targetScale, alpha);
    this.refreshScale();
  }

  getPlacementAnchor(joints, options = {}) {
    const candidates = options.lowerEstimated
      ? [
          ["face", "face"],
          ["head", "head"],
          ["neck", "neck"],
          ["chest", "chest"],
          ["hips", "hips"],
        ]
      : [
          ["face", "face"],
          ["head", "head"],
          ["hips", "hips"],
          ["chest", "chest"],
          ["neck", "neck"],
        ];

    for (const [boneKey, jointKey] of candidates) {
      const bone = this.boneMap?.[boneKey];
      const target = joints?.[jointKey];
      if (bone && target) return { bone, target, label: jointKey };
    }

    return null;
  }

  alignAvatarPlacement(joints, dt, options = {}) {
    const anchor = this.getPlacementAnchor(joints, options);
    if (!this.avatarScene || !anchor) return;

    const currentWorld = new THREE.Vector3();
    const targetWorld = anchor.target.clone();
    anchor.bone.getWorldPosition(currentWorld);

    const parent = this.displayNode.parent || this.scene;
    const currentLocal = parent.worldToLocal(currentWorld.clone());
    const targetLocal = parent.worldToLocal(targetWorld.clone());
    const deltaLocal = targetLocal.sub(currentLocal);

    const alpha = this.avatarPlacementInitialized
      ? clamp(dt * 60 * CONFIG.avatarPlacementLerp, 0.08, 0.36)
      : 1;
    this.displayNode.position.add(deltaLocal.multiplyScalar(alpha));
    this.avatarPlacementInitialized = true;
  }

  applyBones(joints, dt) {
    const factor = clamp(dt * 60 * CONFIG.rotationSmoothing, 0.04, 0.45);

    for (const solver of this.boneSolvers) {
      const start = joints[solver.startJoint];
      const end = joints[solver.endJoint];
      if (!start || !end) {
        if (solver.isFinger) {
          solver.bone.quaternion.slerp(solver.initialQuat, factor);
        }
        continue;
      }

      const worldDir = end.clone().sub(start);
      if (worldDir.lengthSq() < 0.000001) continue;
      worldDir.normalize();

      const parentQuat = new THREE.Quaternion();
      if (solver.bone.parent) {
        solver.bone.parent.getWorldQuaternion(parentQuat);
      }

      const invParentQuat = parentQuat.clone().invert();
      const localTargetDir = worldDir.applyQuaternion(invParentQuat).normalize();

      const deltaQuat = new THREE.Quaternion().setFromUnitVectors(
        solver.initialRestDirLocal,
        localTargetDir
      );

      const targetQuat = deltaQuat.multiply(solver.initialQuat);
      solver.bone.quaternion.slerp(targetQuat, factor);
    }
  }

  applyGestureControls(controls) {
    if (controls.rotateDelta) {
      this.root.rotation.y += controls.rotateDelta * CONFIG.gestureRotateGain;
    }

    if (controls.moveDeltaY) {
      this.root.position.y += controls.moveDeltaY * CONFIG.gestureMoveGain;
      this.root.position.y = clamp(this.root.position.y, -1.2, 1.2);
    }

    if (controls.zoomDelta) {
      const nextScale = this.gestureScaleMultiplier + controls.zoomDelta * CONFIG.gestureZoomGain;
      this.gestureScaleMultiplier = clamp(nextScale, 0.45, 2.2);
      this.refreshScale();
    }
  }

  setCalibrationScaleMultiplier(multiplier) {
    this.calibrationScaleMultiplier = clamp(multiplier, 0.6, 1.8);
    this.refreshScale();
  }

  setManualScaleMultiplier(multiplier) {
    this.manualScaleMultiplier = clamp(multiplier || 1, CONFIG.manualScaleMin, CONFIG.manualScaleMax);
    this.refreshScale();
  }

  refreshScale() {
    const combined = this.trackingScale
      * this.gestureScaleMultiplier
      * this.calibrationScaleMultiplier
      * this.manualScaleMultiplier;
    const clamped = clamp(combined, 0.5, 2.6);
    this.root.scale.setScalar(clamped);
    this.targetScale = clamped;
  }

  resetTransform() {
    this.root.position.set(0, 0, 0);
    this.root.rotation.set(0, 0, 0);
    this.gestureScaleMultiplier = 1;
    this.refreshScale();
  }

  toggleStyle() {
    this.styleIndex += 1;
    this.fallbackRig.setStyle(this.styleIndex);
  }
}

class PoseTracker {
  constructor() {
    this.lastGood = new Map();
    this.lastUpdateMs = new Map();
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.videoWidth = 1280;
    this.videoHeight = 720;
    this.overlayMode = true;
    this.mirrorSides = CONFIG.mirrorSwapSides;
  }

  setViewportSize(width, height) {
    this.viewportWidth = Math.max(width || 1, 1);
    this.viewportHeight = Math.max(height || 1, 1);
  }

  setVideoSize(width, height) {
    this.videoWidth = Math.max(width || 1, 1);
    this.videoHeight = Math.max(height || 1, 1);
  }

  setOverlayMode(flag) {
    this.overlayMode = Boolean(flag);
  }

  setMirrorSides(flag) {
    this.mirrorSides = Boolean(flag);
  }

  normalizeCoverPoint(xNorm, yNorm) {
    const vw = this.viewportWidth;
    const vh = this.viewportHeight;
    const viewAspect = vw / vh;

    const scale = Math.max(vw / this.videoWidth, vh / this.videoHeight);
    const drawnW = this.videoWidth * scale;
    const drawnH = this.videoHeight * scale;
    const cropX = (drawnW - vw) * 0.5;
    const cropY = (drawnH - vh) * 0.5;

    const px = xNorm * drawnW - cropX;
    const py = yNorm * drawnH - cropY;

    const screenX = clamp(px / vw, 0, 1);
    const screenY = clamp(py / vh, 0, 1);

    return { screenX, screenY, viewAspect };
  }

  toScene(lm) {
    if (this.overlayMode) {
      const { screenX, screenY, viewAspect } = this.normalizeCoverPoint(lm.x, lm.y);
      const mirroredX = 1 - screenX;
      const x = (mirroredX - 0.5) * 2 * viewAspect;
      const y = (0.5 - screenY) * 2;
      const z = -lm.z * CONFIG.overlayDepthScale;
      return new THREE.Vector3(x, y, z);
    }

    const x = (0.5 - lm.x) * CONFIG.coordinateScale;
    const y = (0.5 - lm.y) * CONFIG.coordinateScale * 1.8;
    const z = -lm.z * CONFIG.depthScale;
    return new THREE.Vector3(x, y, z);
  }

  resolve(name, value, now) {
    if (value) {
      this.lastGood.set(name, value.clone());
      this.lastUpdateMs.set(name, now);
      return value;
    }

    const prev = this.lastGood.get(name);
    if (!prev) return null;

    return prev.clone();
  }

  getPosePoint(landmarks, index) {
    const lm = landmarks[index];
    if (!lm) return { point: null, confidence: 0 };

    const visibility = lm.visibility ?? 1;
    const presence = lm.presence ?? 1;
    const confidence = Math.min(visibility, presence);
    if (confidence < CONFIG.landmarkConfidence) {
      return { point: null, confidence };
    }

    return { point: this.toScene(lm), confidence };
  }

  applyMirrorSideSwap(joints) {
    if (!this.mirrorSides) return;
    for (const [leftKey, rightKey] of MIRROR_SIDE_PAIRS) {
      const temp = joints[leftKey];
      joints[leftKey] = joints[rightKey];
      joints[rightKey] = temp;
    }
  }

  applyFaceOverrides(joints, faceResult, now) {
    const faceLm = faceResult?.faceLandmarks?.[0];
    if (!faceLm?.length) return;

    const toPoint = (idx) => {
      const lm = faceLm[idx];
      return lm ? this.toScene(lm) : null;
    };

    const nose = toPoint(FACE.NOSE_TIP);
    const leftCheek = toPoint(FACE.LEFT_CHEEK);
    const rightCheek = toPoint(FACE.RIGHT_CHEEK);
    const forehead = toPoint(FACE.FOREHEAD);
    const chin = toPoint(FACE.CHIN);

    if (nose) {
      joints.face = this.resolve("face", nose, now);
    }

    const headCandidates = [];
    if (leftCheek && rightCheek) headCandidates.push(midpoint(leftCheek, rightCheek));
    if (forehead && chin) headCandidates.push(midpoint(forehead, chin));
    if (nose) headCandidates.push(nose);

    const head = averagePoints(headCandidates);
    if (head) {
      joints.head = this.resolve("head", head, now);
    }
  }

  chooseHandSide(wrist, joints, usedSides, handedLabel) {
    const candidates = [];
    if (wrist && joints.leftWrist) {
      candidates.push({ side: "left", distance: wrist.distanceTo(joints.leftWrist) });
    }
    if (wrist && joints.rightWrist) {
      candidates.push({ side: "right", distance: wrist.distanceTo(joints.rightWrist) });
    }

    candidates.sort((a, b) => a.distance - b.distance);
    for (const candidate of candidates) {
      if (!usedSides.has(candidate.side)) return candidate.side;
    }

    const label = (handedLabel || "").toLowerCase();
    const fallbackSide = label.includes("left") ? "left" : label.includes("right") ? "right" : null;
    if (fallbackSide && !usedSides.has(fallbackSide)) return fallbackSide;

    return !usedSides.has("left") ? "left" : !usedSides.has("right") ? "right" : null;
  }

  applyFingerOverrides(joints, handLm, side, rawWrist, poseWrist) {
    if (!rawWrist || !poseWrist) return;

    for (const finger of FINGER_DEFS) {
      const prefix = `${side}${finger.name}`;
      const tracked = finger.joints.map((jointIndex) => {
        const lm = handLm[jointIndex];
        if (!lm) return null;
        const rawPoint = this.toScene(lm);
        return poseWrist.clone().add(rawPoint.sub(rawWrist));
      });

      for (let i = 0; i < FINGER_SUFFIXES.length; i += 1) {
        if (tracked[i]) {
          joints[`${prefix}${FINGER_SUFFIXES[i]}`] = tracked[i];
        }
      }

      // Keep a dedicated fingertip target so the distal phalanx has a stable direction.
      if (tracked[3]) {
        joints[`${prefix}Tip`] = tracked[3];
      } else if (tracked[2] && tracked[1]) {
        joints[`${prefix}Tip`] = tracked[2].clone().add(tracked[2].clone().sub(tracked[1]));
      }
    }
  }

  applyHandOverrides(joints, handResult) {
    const detectedSides = new Set();
    if (!handResult?.landmarks?.length) return detectedSides;

    const handedness = handResult.handedness || handResult.handednesses || [];

    for (let i = 0; i < handResult.landmarks.length; i += 1) {
      const handLm = handResult.landmarks[i];
      if (!handLm) continue;

      const handed = handedness[i]?.[0]?.categoryName || "";
      const knucklePoints = [handLm[5], handLm[9], handLm[13], handLm[17]].filter(Boolean);
      if (!knucklePoints.length) continue;

      const wrist = handLm[0] ? this.toScene(handLm[0]) : null;
      const knuckleCenter = averagePoints(knucklePoints.map((p) => this.toScene(p)));
      const side = this.chooseHandSide(wrist, joints, detectedSides, handed);
      if (!side) continue;

      const poseWrist = side === "left" ? joints.leftWrist : joints.rightWrist;
      let anchoredHand = null;
      if (poseWrist && wrist && knuckleCenter) {
        const palmVector = knuckleCenter.clone().sub(wrist);
        const length = clamp(
          palmVector.length(),
          CONFIG.handPalmLengthMin,
          CONFIG.handPalmLengthMax
        );
        anchoredHand = palmVector.lengthSq() > 0.0001
          ? poseWrist.clone().add(palmVector.normalize().multiplyScalar(length))
          : poseWrist.clone();
      }
      if (!anchoredHand) continue;

      detectedSides.add(side);

      if (side === "left") {
        if (anchoredHand) joints.leftHand = anchoredHand;
      } else {
        if (anchoredHand) joints.rightHand = anchoredHand;
      }

      this.applyFingerOverrides(joints, handLm, side, wrist, poseWrist);
    }

    return detectedSides;
  }

  applyStandbyHands(joints, detectedSides) {
    const shoulderWidth = joints.leftShoulder && joints.rightShoulder
      ? joints.leftShoulder.distanceTo(joints.rightShoulder)
      : 0.35;

    const shoulderMid = joints.leftShoulder && joints.rightShoulder
      ? midpoint(joints.leftShoulder, joints.rightShoulder)
      : joints.chest || new THREE.Vector3();

    const down = joints.chest && joints.hips
      ? joints.hips.clone().sub(joints.chest).normalize()
      : new THREE.Vector3(0, -1, 0);

    const upperLen = clamp(shoulderWidth * CONFIG.armStandbyUpperScale, 0.16, 0.42);
    const lowerLen = clamp(shoulderWidth * CONFIG.armStandbyLowerScale, 0.14, 0.38);
    const handLen = clamp(shoulderWidth * CONFIG.handStandbyLength, 0.07, 0.22);
    const sideGap = clamp(shoulderWidth * 0.12, 0.025, 0.08);

    const setStandby = (side) => {
      if (detectedSides.has(side)) return;

      const shoulderKey = `${side}Shoulder`;
      const elbowKey = `${side}Elbow`;
      const wristKey = `${side}Wrist`;
      const handKey = `${side}Hand`;
      const shoulder = joints[shoulderKey];
      if (!shoulder) return;

      let outward = shoulder.clone().sub(shoulderMid);
      if (outward.lengthSq() < 0.0001) {
        outward = new THREE.Vector3(side === "left" ? -1 : 1, 0, 0);
      }
      outward.normalize();

      const elbowTarget = shoulder.clone()
        .add(down.clone().multiplyScalar(upperLen))
        .add(outward.clone().multiplyScalar(sideGap));
      const wristTarget = elbowTarget.clone()
        .add(down.clone().multiplyScalar(lowerLen))
        .add(outward.clone().multiplyScalar(sideGap * 0.45));
      const handTarget = wristTarget.clone()
        .add(down.clone().multiplyScalar(handLen))
        .add(outward.clone().multiplyScalar(sideGap * 0.25));

      const blend = (key, target) => {
        joints[key] = joints[key]
          ? joints[key].clone().lerp(target, CONFIG.armStandbyLerp)
          : target;
      };

      blend(elbowKey, elbowTarget);
      blend(wristKey, wristTarget);
      blend(handKey, handTarget);
    };

    setStandby("left");
    setStandby("right");
  }

  estimateLowerBody(joints) {
    const shoulderMid = joints.leftShoulder && joints.rightShoulder
      ? midpoint(joints.leftShoulder, joints.rightShoulder)
      : null;

    const shoulderDir = joints.leftShoulder && joints.rightShoulder
      ? joints.rightShoulder.clone().sub(joints.leftShoulder).normalize()
      : new THREE.Vector3(1, 0, 0);

    const shoulderWidth = joints.leftShoulder && joints.rightShoulder
      ? joints.leftShoulder.distanceTo(joints.rightShoulder)
      : 0.35;

    const torsoDown = new THREE.Vector3(0, -1, 0);

    let lowerEstimated = false;

    if ((!joints.leftHip || !joints.rightHip) && shoulderMid) {
      lowerEstimated = true;
      const hipMid = shoulderMid.clone().add(torsoDown.clone().multiplyScalar(shoulderWidth * 1.3));
      const hipOffset = shoulderDir.clone().multiplyScalar(shoulderWidth * 0.36);
      if (!joints.leftHip) joints.leftHip = hipMid.clone().add(hipOffset.clone().multiplyScalar(-1));
      if (!joints.rightHip) joints.rightHip = hipMid.clone().add(hipOffset);
    }

    joints.hips = joints.leftHip && joints.rightHip ? midpoint(joints.leftHip, joints.rightHip) : joints.hips;

    const legUpper = shoulderWidth * 1.55;
    const legLower = shoulderWidth * 1.45;
    const footLen = shoulderWidth * 0.35;

    if (joints.leftHip && !joints.leftKnee) {
      lowerEstimated = true;
      joints.leftKnee = joints.leftHip.clone().add(torsoDown.clone().multiplyScalar(legUpper));
    }

    if (joints.rightHip && !joints.rightKnee) {
      lowerEstimated = true;
      joints.rightKnee = joints.rightHip.clone().add(torsoDown.clone().multiplyScalar(legUpper));
    }

    if (joints.leftKnee && !joints.leftAnkle) {
      lowerEstimated = true;
      joints.leftAnkle = joints.leftKnee.clone().add(torsoDown.clone().multiplyScalar(legLower));
    }

    if (joints.rightKnee && !joints.rightAnkle) {
      lowerEstimated = true;
      joints.rightAnkle = joints.rightKnee.clone().add(torsoDown.clone().multiplyScalar(legLower));
    }

    if (joints.leftAnkle && !joints.leftFoot) {
      lowerEstimated = true;
      joints.leftFoot = joints.leftAnkle.clone().add(new THREE.Vector3(0, -0.03, footLen));
    }

    if (joints.rightAnkle && !joints.rightFoot) {
      lowerEstimated = true;
      joints.rightFoot = joints.rightAnkle.clone().add(new THREE.Vector3(0, -0.03, footLen));
    }

    return {
      lowerEstimated,
      shoulderWidth,
    };
  }

  build(poseResult, handResult, faceResult) {
    const landmarks = poseResult?.landmarks?.[0];
    if (!landmarks) return null;

    const now = performance.now();
    const joints = {};

    const p = (name, idx) => {
      const { point } = this.getPosePoint(landmarks, idx);
      joints[name] = this.resolve(name, point, now);
    };

    p("leftShoulder", POSE.LEFT_SHOULDER);
    p("rightShoulder", POSE.RIGHT_SHOULDER);
    p("leftElbow", POSE.LEFT_ELBOW);
    p("rightElbow", POSE.RIGHT_ELBOW);
    p("leftWrist", POSE.LEFT_WRIST);
    p("rightWrist", POSE.RIGHT_WRIST);
    p("leftHip", POSE.LEFT_HIP);
    p("rightHip", POSE.RIGHT_HIP);
    p("leftKnee", POSE.LEFT_KNEE);
    p("rightKnee", POSE.RIGHT_KNEE);
    p("leftAnkle", POSE.LEFT_ANKLE);
    p("rightAnkle", POSE.RIGHT_ANKLE);

    const leftFootPoint = this.getPosePoint(landmarks, POSE.LEFT_FOOT_INDEX).point;
    const rightFootPoint = this.getPosePoint(landmarks, POSE.RIGHT_FOOT_INDEX).point;
    joints.leftFoot = this.resolve("leftFoot", leftFootPoint, now);
    joints.rightFoot = this.resolve("rightFoot", rightFootPoint, now);
    this.applyMirrorSideSwap(joints);

    const nose = this.getPosePoint(landmarks, POSE.NOSE).point;
    const leftEar = this.getPosePoint(landmarks, POSE.LEFT_EAR).point;
    const rightEar = this.getPosePoint(landmarks, POSE.RIGHT_EAR).point;

    const shouldersReady = joints.leftShoulder && joints.rightShoulder;

    if (nose) {
      joints.face = this.resolve("face", nose, now);
    }

    if (nose) {
      const headCenter = leftEar && rightEar ? midpoint(leftEar, rightEar) : nose;
      joints.head = this.resolve("head", headCenter, now);
    } else if (leftEar && rightEar) {
      joints.head = this.resolve("head", midpoint(leftEar, rightEar), now);
    }

    this.applyFaceOverrides(joints, faceResult, now);

    if (shouldersReady) {
      const shoulderMid = midpoint(joints.leftShoulder, joints.rightShoulder);
      const headHint = joints.head || shoulderMid.clone().add(new THREE.Vector3(0, 0.25, 0));
      const neck = midpoint(shoulderMid, headHint);
      joints.neck = this.resolve("neck", neck, now);

      const hipsMid = joints.leftHip && joints.rightHip
        ? midpoint(joints.leftHip, joints.rightHip)
        : shoulderMid.clone().add(new THREE.Vector3(0, -0.35, 0));

      joints.hips = this.resolve("hips", hipsMid, now);
      const chest = midpoint(neck, hipsMid);
      joints.chest = this.resolve("chest", chest, now);
      const spine = midpoint(chest, hipsMid);
      joints.spine = this.resolve("spine", spine, now);
    }

    const detectedHands = this.applyHandOverrides(joints, handResult);
    this.applyStandbyHands(joints, detectedHands);

    const lower = this.estimateLowerBody(joints);

    const fullBodyDetected = Boolean(
      joints.leftHip &&
        joints.rightHip &&
        joints.leftKnee &&
        joints.rightKnee &&
        joints.leftAnkle &&
        joints.rightAnkle
    );

    const bodyScale = lower.shoulderWidth / CONFIG.shoulderReference;

    return {
      joints,
      fullBodyDetected,
      lowerEstimated: lower.lowerEstimated,
      bodyScale,
    };
  }
}

class MouthTracker {
  constructor() {
    this.open = 0;
    this.source = "none";
  }

  getBlendshapeScore(faceResult) {
    const categories = faceResult?.faceBlendshapes?.[0]?.categories || [];
    let best = 0;

    for (const category of categories) {
      const name = normalizeName(category.categoryName || category.displayName || "");
      const isOpenShape = MOUTH_BLENDSHAPE_ALIASES.some((alias) => (
        alias.length <= 2 ? name === alias : name === alias || name.includes(alias)
      ));
      if (!isOpenShape) continue;
      best = Math.max(best, category.score || 0);
    }

    return best;
  }

  getLandmarkOpen(faceResult) {
    const faceLm = faceResult?.faceLandmarks?.[0];
    if (!faceLm?.length) return 0;

    const upper = faceLm[FACE.UPPER_INNER_LIP];
    const lower = faceLm[FACE.LOWER_INNER_LIP];
    const left = faceLm[FACE.LEFT_MOUTH];
    const right = faceLm[FACE.RIGHT_MOUTH];
    if (!upper || !lower || !left || !right) return 0;

    const gap = distance2D(upper, lower);
    const width = Math.max(distance2D(left, right), 0.0001);
    const ratio = gap / width;
    return clamp(
      (ratio - CONFIG.mouthLandmarkOpenMin) /
        (CONFIG.mouthLandmarkOpenMax - CONFIG.mouthLandmarkOpenMin),
      0,
      1
    );
  }

  update(faceResult) {
    const detected = Boolean(faceResult?.faceLandmarks?.length);
    const blendScore = this.getBlendshapeScore(faceResult);
    const landmarkScore = this.getLandmarkOpen(faceResult);
    const rawOpen = detected
      ? clamp(Math.max(blendScore, landmarkScore) * CONFIG.mouthOpenGain, 0, 1)
      : 0;

    this.open = THREE.MathUtils.lerp(this.open, rawOpen, CONFIG.mouthSmoothing);
    this.source = blendScore >= landmarkScore && blendScore > 0 ? "blendshape" : "landmarks";

    return {
      detected,
      open: this.open,
      rawOpen,
      source: detected ? this.source : "none",
      landmarkCount: faceResult?.faceLandmarks?.[0]?.length || 0,
      blendshapeCount: faceResult?.faceBlendshapes?.[0]?.categories?.length || 0,
    };
  }
}

class PoseCalibrator {
  constructor(ui) {
    this.ui = ui;
    this.pending = false;
    this.active = false;

    this.offsetCurrent = new THREE.Vector3();
    this.offsetTarget = new THREE.Vector3();

    this.referenceBodyScale = 1;
    this.scaleMultiplier = 1;
  }

  getHips(joints) {
    if (joints.hips) return joints.hips.clone();
    if (joints.leftHip && joints.rightHip) return midpoint(joints.leftHip, joints.rightHip);
    return null;
  }

  getFeetAverageY(joints) {
    const candidates = [joints.leftFoot, joints.rightFoot, joints.leftAnkle, joints.rightAnkle].filter(Boolean);
    if (!candidates.length) return null;
    return candidates.reduce((sum, p) => sum + p.y, 0) / candidates.length;
  }

  canCalibrate(joints) {
    return Boolean(
      joints &&
        joints.leftShoulder &&
        joints.rightShoulder &&
        (joints.hips || (joints.leftHip && joints.rightHip))
    );
  }

  requestCalibration() {
    this.pending = true;
    this.ui.setStatus("calibration", "pending");
    this.ui.showStartNote("Calibration requested. Stand straight for 1 second.");
  }

  computeTargetOffset(joints) {
    const hips = this.getHips(joints);
    if (!hips) return null;

    const next = new THREE.Vector3();
    next.x = -hips.x;
    next.z = -hips.z;

    const feetY = this.getFeetAverageY(joints);
    if (feetY != null) {
      next.y = CONFIG.calibrationTargetFeetY - feetY;
    } else {
      next.y = CONFIG.calibrationTargetHipsY - hips.y;
    }

    return next;
  }

  tryCalibrate(joints, bodyScale) {
    if (!this.canCalibrate(joints)) {
      this.ui.showStartNote("Calibration needs shoulders and hips visible.", true);
      return false;
    }

    const offset = this.computeTargetOffset(joints);
    if (!offset) {
      this.ui.showStartNote("Calibration failed. Pose anchor not found.", true);
      return false;
    }

    this.pending = false;
    this.active = true;
    this.offsetCurrent.copy(offset);
    this.offsetTarget.copy(offset);
    this.referenceBodyScale = clamp(bodyScale || 1, 0.6, 2.2);
    this.scaleMultiplier = 1;

    this.ui.setStatus("calibration", "locked");
    this.ui.showStartNote("Calibration locked. Tap Calibrate again anytime.");
    console.log("Calibration saved:", {
      referenceBodyScale: this.referenceBodyScale,
      offset: this.offsetCurrent.toArray(),
    });
    return true;
  }

  apply(joints, bodyScale, dt) {
    if (!joints) {
      return { joints, scaleMultiplier: this.scaleMultiplier };
    }

    if (this.active) {
      const nextOffset = this.computeTargetOffset(joints);
      if (nextOffset) {
        this.offsetTarget.copy(nextOffset);
      }

      const offsetAlpha = clamp(dt * 60 * CONFIG.calibrationOffsetLerp, 0.05, 0.35);
      this.offsetCurrent.lerp(this.offsetTarget, offsetAlpha);

      const rawScaleMultiplier = this.referenceBodyScale / Math.max(bodyScale || 1, 0.0001);
      const clampedScaleTarget = clamp(rawScaleMultiplier, 0.72, 1.35);
      const scaleAlpha = clamp(dt * 60 * CONFIG.calibrationScaleLerp, 0.05, 0.35);
      this.scaleMultiplier = THREE.MathUtils.lerp(
        this.scaleMultiplier,
        clampedScaleTarget,
        scaleAlpha
      );
    } else {
      this.offsetCurrent.lerp(new THREE.Vector3(), 0.18);
      this.scaleMultiplier = THREE.MathUtils.lerp(this.scaleMultiplier, 1, 0.15);
    }

    const adjusted = {};
    for (const [name, value] of Object.entries(joints)) {
      adjusted[name] = value ? value.clone().add(this.offsetCurrent) : value;
    }

    return {
      joints: adjusted,
      scaleMultiplier: this.scaleMultiplier,
    };
  }
}

class CalibrationConsole {
  constructor(ui, onLog) {
    this.ui = ui;
    this.onLog = onLog || (() => {});

    this.anchor = CALIBRATION_DEFAULTS.anchor;
    this.offset = new THREE.Vector3(
      CALIBRATION_DEFAULTS.offsetX,
      CALIBRATION_DEFAULTS.offsetY,
      CALIBRATION_DEFAULTS.offsetZ
    );
    this.yawDeg = CALIBRATION_DEFAULTS.yawDeg;
    this.scale = CALIBRATION_DEFAULTS.scale;
    this.handGain = CALIBRATION_DEFAULTS.handGain;
    this.headGain = CALIBRATION_DEFAULTS.headGain;

    this.tmpAnchor = new THREE.Vector3();
    this.tmpQuat = new THREE.Quaternion();

    this.readFromStorage();
    this.writeControlsFromState();
    this.bindUI();
  }

  bindUI() {
    const refs = this.ui.calibrationConsole;
    if (!refs?.panel) return;

    const onEvent = (handler) => (event) => {
      event.preventDefault();
      event.stopPropagation();
      handler();
    };

    const bindRange = (input, assign) => {
      if (!input) return;
      const run = () => {
        assign(Number(input.value));
        this.updateLabels();
      };
      input.addEventListener("input", run);
      input.addEventListener("change", run);
      input.addEventListener("touchend", onEvent(run), { passive: false });
    };

    if (refs.anchor) {
      const updateAnchor = () => {
        this.anchor = refs.anchor.value || CALIBRATION_DEFAULTS.anchor;
      };
      refs.anchor.addEventListener("change", updateAnchor);
      refs.anchor.addEventListener("input", updateAnchor);
      refs.anchor.addEventListener("touchend", onEvent(updateAnchor), { passive: false });
    }

    bindRange(refs.offsetX, (v) => { this.offset.x = v; });
    bindRange(refs.offsetY, (v) => { this.offset.y = v; });
    bindRange(refs.offsetZ, (v) => { this.offset.z = v; });
    bindRange(refs.yaw, (v) => { this.yawDeg = v; });
    bindRange(refs.scale, (v) => {
      this.scale = clamp(v, CONFIG.manualScaleMin, CONFIG.manualScaleMax);
    });
    bindRange(refs.handGain, (v) => {
      this.handGain = clamp(v, 0, 2);
    });
    bindRange(refs.headGain, (v) => {
      this.headGain = clamp(v, 0, 2);
    });

    if (refs.resetBtn) {
      const onReset = onEvent(() => this.reset(true));
      refs.resetBtn.addEventListener("click", onReset);
      refs.resetBtn.addEventListener("touchend", onReset, { passive: false });
    }

    if (refs.saveBtn) {
      const onSave = onEvent(() => this.save(true));
      refs.saveBtn.addEventListener("click", onSave);
      refs.saveBtn.addEventListener("touchend", onSave, { passive: false });
    }
  }

  getState() {
    return {
      anchor: this.anchor,
      offsetX: this.offset.x,
      offsetY: this.offset.y,
      offsetZ: this.offset.z,
      yawDeg: this.yawDeg,
      scale: this.scale,
      handGain: this.handGain,
      headGain: this.headGain,
    };
  }

  hasManualAdjustment() {
    return Boolean(
      Math.abs(this.offset.x) > 0.0001 ||
      Math.abs(this.offset.y) > 0.0001 ||
      Math.abs(this.offset.z) > 0.0001 ||
      Math.abs(this.yawDeg) > 0.0001 ||
      Math.abs(this.scale - 1) > 0.0001 ||
      Math.abs(this.handGain - 1) > 0.0001 ||
      Math.abs(this.headGain - 1) > 0.0001 ||
      this.anchor !== CALIBRATION_DEFAULTS.anchor
    );
  }

  reset(announce = false) {
    this.anchor = CALIBRATION_DEFAULTS.anchor;
    this.offset.set(0, 0, 0);
    this.yawDeg = CALIBRATION_DEFAULTS.yawDeg;
    this.scale = CALIBRATION_DEFAULTS.scale;
    this.handGain = CALIBRATION_DEFAULTS.handGain;
    this.headGain = CALIBRATION_DEFAULTS.headGain;
    this.writeControlsFromState();
    this.save(false);

    if (announce) {
      this.ui.showStartNote("Calibration console reset.");
      this.onLog("Calibration console reset.");
    }
  }

  writeControlsFromState() {
    const refs = this.ui.calibrationConsole;
    if (!refs?.panel) return;
    if (refs.anchor) refs.anchor.value = this.anchor;
    if (refs.offsetX) refs.offsetX.value = String(this.offset.x);
    if (refs.offsetY) refs.offsetY.value = String(this.offset.y);
    if (refs.offsetZ) refs.offsetZ.value = String(this.offset.z);
    if (refs.yaw) refs.yaw.value = String(this.yawDeg);
    if (refs.scale) refs.scale.value = String(this.scale);
    if (refs.handGain) refs.handGain.value = String(this.handGain);
    if (refs.headGain) refs.headGain.value = String(this.headGain);
    this.updateLabels();
  }

  updateLabels() {
    const refs = this.ui.calibrationConsole;
    if (!refs?.panel) return;
    if (refs.offsetXVal) refs.offsetXVal.textContent = this.offset.x.toFixed(2);
    if (refs.offsetYVal) refs.offsetYVal.textContent = this.offset.y.toFixed(2);
    if (refs.offsetZVal) refs.offsetZVal.textContent = this.offset.z.toFixed(2);
    if (refs.yawVal) refs.yawVal.textContent = `${Math.round(this.yawDeg)}deg`;
    if (refs.scaleVal) refs.scaleVal.textContent = `${this.scale.toFixed(2)}x`;
    if (refs.handGainVal) refs.handGainVal.textContent = this.handGain.toFixed(2);
    if (refs.headGainVal) refs.headGainVal.textContent = this.headGain.toFixed(2);
  }

  readFromStorage() {
    try {
      const raw = window.localStorage.getItem(CONFIG.calibrationStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || !parsed) return;

      this.anchor = typeof parsed.anchor === "string" ? parsed.anchor : CALIBRATION_DEFAULTS.anchor;
      this.offset.set(
        Number.isFinite(parsed.offsetX) ? parsed.offsetX : 0,
        Number.isFinite(parsed.offsetY) ? parsed.offsetY : 0,
        Number.isFinite(parsed.offsetZ) ? parsed.offsetZ : 0
      );
      this.yawDeg = Number.isFinite(parsed.yawDeg) ? parsed.yawDeg : 0;
      this.scale = clamp(
        Number.isFinite(parsed.scale) ? parsed.scale : 1,
        CONFIG.manualScaleMin,
        CONFIG.manualScaleMax
      );
      this.handGain = clamp(Number.isFinite(parsed.handGain) ? parsed.handGain : 1, 0, 2);
      this.headGain = clamp(Number.isFinite(parsed.headGain) ? parsed.headGain : 1, 0, 2);
    } catch {
      // ignore storage read errors
    }
  }

  save(announce = true) {
    try {
      window.localStorage.setItem(CONFIG.calibrationStorageKey, JSON.stringify(this.getState()));
    } catch {
      // ignore storage write errors
    }

    if (announce) {
      this.ui.showStartNote("Calibration console saved.");
      this.onLog("Calibration console saved.");
    }
  }

  resolveAnchor(joints) {
    const anchor = joints[this.anchor]
      || joints.hips
      || joints.chest
      || joints.neck
      || joints.head
      || (joints.leftShoulder && joints.rightShoulder
        ? midpoint(joints.leftShoulder, joints.rightShoulder)
        : null);

    if (!anchor) {
      this.tmpAnchor.set(0, 0, 0);
      return this.tmpAnchor;
    }
    return this.tmpAnchor.copy(anchor);
  }

  getScaleMultiplier() {
    return clamp(this.scale, CONFIG.manualScaleMin, CONFIG.manualScaleMax);
  }

  applyToJoints(joints) {
    if (!joints) return joints;

    const adjusted = {};
    const anchor = this.resolveAnchor(joints);
    this.tmpQuat.setFromAxisAngle(Y_AXIS, THREE.MathUtils.degToRad(this.yawDeg));

    for (const [name, value] of Object.entries(joints)) {
      if (!value) continue;
      const local = value.clone().sub(anchor).applyQuaternion(this.tmpQuat);

      let gain = 1;
      if (HAND_GAIN_JOINTS.has(name)) gain = this.handGain;
      else if (HEAD_GAIN_JOINTS.has(name)) gain = this.headGain;

      local.multiplyScalar(gain);
      adjusted[name] = anchor.clone().add(local).add(this.offset);
    }

    return adjusted;
  }
}

class GestureController {
  constructor(ui) {
    this.ui = ui;
    this.cooldowns = new Map();
    this.lastPalm = null;
    this.pinchBaseline = null;
    this.freeze = false;
    this.controlActive = false;
  }

  canFire(name, now, duration) {
    const until = this.cooldowns.get(name) || 0;
    if (now < until) return false;
    this.cooldowns.set(name, now + duration);
    return true;
  }

  getHandRecords(handResult) {
    const hands = handResult?.landmarks || [];
    const handedness = handResult?.handedness || handResult?.handednesses || [];

    return hands.map((landmarks, i) => ({
      landmarks,
      label: handedness[i]?.[0]?.categoryName || "Unknown",
    }));
  }

  isFingerExtended(hand, tip, pip) {
    return hand[tip] && hand[pip] ? hand[tip].y < hand[pip].y : false;
  }

  analyzeHand(hand) {
    const thumbExtended = hand[HAND.THUMB_TIP] && hand[HAND.INDEX_MCP]
      ? Math.abs(hand[HAND.THUMB_TIP].x - hand[HAND.INDEX_MCP].x) > 0.05
      : false;

    const indexUp = this.isFingerExtended(hand, HAND.INDEX_TIP, HAND.INDEX_PIP);
    const middleUp = this.isFingerExtended(hand, HAND.MIDDLE_TIP, HAND.MIDDLE_PIP);
    const ringUp = this.isFingerExtended(hand, HAND.RING_TIP, HAND.RING_PIP);
    const pinkyUp = this.isFingerExtended(hand, HAND.PINKY_TIP, HAND.PINKY_PIP);

    const upCount = [indexUp, middleUp, ringUp, pinkyUp, thumbExtended].filter(Boolean).length;

    const openPalm = upCount >= 4;

    const wrist = hand[HAND.WRIST];
    const avgTipDist = wrist
      ? ([HAND.THUMB_TIP, HAND.INDEX_TIP, HAND.MIDDLE_TIP, HAND.RING_TIP, HAND.PINKY_TIP]
          .map((idx) => distance2D(hand[idx], wrist))
          .reduce((a, b) => a + b, 0) /
        5)
      : 0;

    const closedFist = upCount <= 1 && avgTipDist < 0.19;

    const pinchDistance = hand[HAND.THUMB_TIP] && hand[HAND.INDEX_TIP]
      ? distance2D(hand[HAND.THUMB_TIP], hand[HAND.INDEX_TIP])
      : 1;

    const pinch = pinchDistance < 0.055;

    const peace = indexUp && middleUp && !ringUp && !pinkyUp;

    const thumbsUp =
      thumbExtended &&
      !indexUp &&
      !middleUp &&
      !ringUp &&
      !pinkyUp &&
      hand[HAND.THUMB_TIP] &&
      wrist &&
      hand[HAND.THUMB_TIP].y < wrist.y - 0.08;

    const palm = averagePoints([
      hand[0],
      hand[5],
      hand[9],
      hand[13],
      hand[17],
    ].filter(Boolean).map((p) => new THREE.Vector3(p.x, p.y, p.z || 0)));

    return {
      openPalm,
      closedFist,
      pinch,
      pinchDistance,
      peace,
      thumbsUp,
      palm,
    };
  }

  update(handResult, now) {
    const hands = this.getHandRecords(handResult);
    const analyses = hands.map((h) => ({ ...h, info: this.analyzeHand(h.landmarks) }));

    const controls = {
      rotateDelta: 0,
      moveDeltaY: 0,
      zoomDelta: 0,
      toggleMode: false,
      reset: false,
      styleChange: false,
      confirm: false,
      freezeChanged: false,
      freeze: this.freeze,
      gestureLabel: "None",
    };

    const openHands = analyses.filter((h) => h.info.openPalm);
    const fistHands = analyses.filter((h) => h.info.closedFist);
    const peaceHands = analyses.filter((h) => h.info.peace);
    const thumbsUpHands = analyses.filter((h) => h.info.thumbsUp);
    const pinchHands = analyses.filter((h) => h.info.pinch);

    if (fistHands.length > 0) {
      if (!this.freeze) {
        this.freeze = true;
        controls.freezeChanged = true;
      }
      controls.freeze = true;
      controls.gestureLabel = "Closed Fist (Freeze)";
    } else if (openHands.length > 0) {
      if (this.freeze) {
        this.freeze = false;
        controls.freezeChanged = true;
      }
      controls.freeze = false;
      this.controlActive = true;
      controls.gestureLabel = "Open Palm (Control Active)";
    }

    if (openHands.length >= 2 && this.canFire("reset", now, CONFIG.gestureCooldownMs)) {
      controls.reset = true;
      controls.gestureLabel = "Two Open Hands (Reset)";
    }

    if (peaceHands.length > 0 && this.canFire("style", now, CONFIG.gestureCooldownMs)) {
      controls.styleChange = true;
      controls.gestureLabel = "Peace Sign (Style Change)";
    }

    if (thumbsUpHands.length > 0 && this.canFire("confirm", now, CONFIG.gestureCooldownMs)) {
      controls.confirm = true;
      controls.gestureLabel = "Thumbs Up (Confirm)";
    }

    const primary = openHands[0] || analyses[0] || null;

    if (primary?.info?.palm) {
      if (this.lastPalm) {
        const dx = primary.info.palm.x - this.lastPalm.x;
        const dy = primary.info.palm.y - this.lastPalm.y;
        const dt = now - this.lastPalm.t;

        if (!this.freeze && this.controlActive && openHands.length > 0) {
          controls.rotateDelta = dx;
          controls.moveDeltaY = -dy;
        }

        if (
          Math.abs(dx) > 0.16 &&
          dt < 260 &&
          this.canFire("swipe", now, CONFIG.swipeCooldownMs)
        ) {
          controls.toggleMode = true;
          controls.gestureLabel = dx < 0 ? "Swipe Left (Mode Switch)" : "Swipe Right (Mode Switch)";
        }
      }

      this.lastPalm = {
        x: primary.info.palm.x,
        y: primary.info.palm.y,
        t: now,
      };
    }

    if (pinchHands.length > 0) {
      const pinchDistance = pinchHands[0].info.pinchDistance;
      if (this.pinchBaseline == null) {
        this.pinchBaseline = pinchDistance;
      } else {
        controls.zoomDelta = this.pinchBaseline - pinchDistance;
        this.pinchBaseline = pinchDistance;
      }
      if (controls.gestureLabel === "None") {
        controls.gestureLabel = "Pinch (Zoom)";
      }
    } else {
      this.pinchBaseline = null;
    }

    return controls;
  }
}

class MirrorApp {
  constructor() {
    this.ui = new StatusUI();
    this.video = document.getElementById("webcam");
    this.canvas = document.getElementById("three-canvas");
    this.debugCanvas = document.getElementById("debug-canvas");
    this.debugCtx = this.debugCanvas?.getContext("2d") || null;

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.overlayCamera = null;
    this.renderCamera = null;
    this.orbit = null;
    this.gridHelper = null;
    this.floorMesh = null;

    this.poseLandmarker = null;
    this.handLandmarker = null;
    this.faceLandmarker = null;
    this.vision = null;

    this.motion = null;
    this.poseTracker = new PoseTracker();
    this.mouthTracker = new MouthTracker();
    this.calibrator = new PoseCalibrator(this.ui);
    this.smoother = new LandmarkSmoother(CONFIG.smoothing);
    this.fps = new FpsMeter();
    this.clock = new THREE.Clock();
    this.debugLog = new DebugLogger(this.ui, CONFIG.debugLogMaxLines);
    this.calibrationConsole = new CalibrationConsole(
      this.ui,
      (message, level = "INFO") => this.log(message, level)
    );

    this.cameraStarted = false;
    this.lastVideoTime = -1;
    this.lastPoseLog = 0;
    this.lastHandLog = 0;
    this.lastFaceLog = 0;

    this.modeMirror = CONFIG.mirrorModeDefault;
    this.prevLowerEstimated = false;
    this.startingCamera = false;
    this.insecureContextBlocked = false;
    this.latestSmoothedJoints = null;
    this.latestBodyScale = 1;
    this.latestMouthOpen = 0;
    this.lastPoseResult = null;
    this.lastHandResult = null;
    this.lastFaceResult = null;
    this.prevPoseDetected = false;
    this.prevHandsDetected = false;
    this.prevFaceDetected = false;
    this.avatarIndex = this.readAvatarIndex();
    this.lightingMode = this.readLightingMode();
    this.switchingAvatar = false;

    this.debugEnabled = CONFIG.debugEnabledDefault;
    this.debugForceCamera = CONFIG.debugForceCameraDefault;
    this.debugLandmarks = CONFIG.debugLandmarksDefault;
    this.debugBones = CONFIG.debugBonesDefault;

    this.handleResize = this.handleResize.bind(this);
    this.loop = this.loop.bind(this);
  }

  log(message, level = "INFO") {
    this.debugLog.push(message, level);
  }

  readAvatarIndex() {
    if (!CONFIG.rememberAvatarSelection) {
      return clamp(CONFIG.defaultAvatarIndex || 0, 0, CONFIG.avatars.length - 1);
    }

    try {
      const saved = Number(window.localStorage.getItem(CONFIG.avatarStorageKey));
      if (Number.isInteger(saved) && saved >= 0 && saved < CONFIG.avatars.length) {
        return saved;
      }
    } catch {
      // ignore storage read errors
    }
    return 0;
  }

  saveAvatarIndex() {
    if (!CONFIG.rememberAvatarSelection) return;

    try {
      window.localStorage.setItem(CONFIG.avatarStorageKey, String(this.avatarIndex));
    } catch {
      // ignore storage write errors
    }
  }

  readLightingMode() {
    try {
      const saved = window.localStorage.getItem(CONFIG.lightingStorageKey);
      if (saved === "lit" || saved === "unlit") return saved;
    } catch {
      // ignore storage read errors
    }
    return CONFIG.defaultLightingMode === "unlit" ? "unlit" : "lit";
  }

  saveLightingMode() {
    try {
      window.localStorage.setItem(CONFIG.lightingStorageKey, this.lightingMode);
    } catch {
      // ignore storage write errors
    }
  }

  getSelectedAvatar() {
    return CONFIG.avatars[this.avatarIndex] || {
      name: "Default",
      path: CONFIG.avatarPath,
    };
  }

  syncAvatarButton() {
    const avatar = this.getSelectedAvatar();
    if (this.ui.avatarBtn) {
      this.ui.avatarBtn.textContent = `Change Character: ${avatar.name}`;
      this.ui.avatarBtn.disabled = this.switchingAvatar;
    }
    if (this.ui.startAvatarBtn) {
      this.ui.startAvatarBtn.textContent = `Change Character: ${avatar.name}`;
      this.ui.startAvatarBtn.disabled = this.switchingAvatar;
    }
  }

  syncLightingButton() {
    if (this.ui.lightBtn) {
      this.ui.lightBtn.textContent = `Lighting: ${this.lightingMode === "unlit" ? "Unlit" : "Lit"}`;
    }
  }

  toggleLightingMode() {
    this.lightingMode = this.lightingMode === "lit" ? "unlit" : "lit";
    this.saveLightingMode();
    this.syncLightingButton();
    if (this.motion) this.motion.setLightingMode(this.lightingMode);
    const label = this.lightingMode === "unlit" ? "Unlit" : "Lit";
    this.ui.showStartNote(`Avatar lighting: ${label}.`);
    this.log(`Avatar lighting mode changed to ${label}.`);
  }

  async loadSelectedAvatar() {
    const avatar = this.getSelectedAvatar();
    const startMs = performance.now();
    this.ui.setStatus("avatar", `loading ${avatar.name}`);
    this.ui.showStartNote(`Loading avatar: ${avatar.name}...`);
    this.log(`Loading avatar: ${avatar.name}.`);

    this.motion.setLightingMode(this.lightingMode);
    await this.motion.loadAvatar(avatar.path);
    this.applyDebugState();

    const label = this.motion.useFallback
      ? `${avatar.name} fallback`
      : avatar.name;
    this.ui.setStatus("avatar", label);
    this.log(
      this.motion.useFallback
        ? `Avatar ${avatar.name} could not use rig. Fallback skeleton active.`
        : `Avatar ${avatar.name} loaded and rigged.`
    );
    const elapsedMs = Math.round(performance.now() - startMs);
    this.log(`Avatar load time: ${elapsedMs}ms.`);
    this.ui.showStartNote(`Avatar ready: ${avatar.name}.`);
  }

  async switchAvatar() {
    if (this.switchingAvatar || CONFIG.avatars.length < 2) return;

    this.avatarIndex = (this.avatarIndex + 1) % CONFIG.avatars.length;
    this.saveAvatarIndex();
    this.syncAvatarButton();

    const avatar = this.getSelectedAvatar();
    if (!this.cameraStarted) {
      this.ui.showStartNote(`Avatar selected: ${avatar.name}. Start camera to load it.`);
      this.log(`Avatar selected before camera start: ${avatar.name}.`);
      return;
    }

    this.switchingAvatar = true;
    this.syncAvatarButton();
    try {
      await this.loadSelectedAvatar();
    } catch (error) {
      console.error(error);
      this.log(`Avatar switch failed: ${error.message}`, "ERROR");
      this.ui.showStartNote(`Avatar switch failed: ${error.message}`, true);
    } finally {
      this.switchingAvatar = false;
      this.syncAvatarButton();
    }
  }

  syncDebugUI() {
    if (this.ui.debugBtn) this.ui.debugBtn.textContent = `Debug: ${this.debugEnabled ? "On" : "Off"}`;
    if (this.ui.cameraDebugBtn) {
      this.ui.cameraDebugBtn.textContent = `Camera: ${this.debugForceCamera ? "Forced" : "Auto"}`;
    }
    if (this.ui.landmarkDebugBtn) {
      this.ui.landmarkDebugBtn.textContent = `Landmarks: ${this.debugLandmarks ? "On" : "Off"}`;
    }
    if (this.ui.bonesDebugBtn) {
      this.ui.bonesDebugBtn.textContent = `Bones: ${this.debugBones ? "On" : "Off"}`;
    }
  }

  applyDebugState() {
    document.body.classList.toggle("debug-off", !this.debugEnabled);
    document.body.classList.toggle("force-camera", this.debugForceCamera);

    if (this.motion) {
      this.motion.setDebugBonesVisible(this.debugBones);
      this.motion.setDebugRootAxes(this.debugEnabled);
    }

    if (!this.debugEnabled || !this.debugLandmarks) {
      this.clearDebugOverlay();
    }

    this.syncDebugUI();
  }

  clearDebugOverlay() {
    if (!this.debugCtx || !this.debugCanvas) return;
    this.debugCtx.clearRect(0, 0, this.debugCanvas.width, this.debugCanvas.height);
  }

  resizeDebugCanvas() {
    if (!this.debugCanvas) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (this.debugCanvas.width !== width || this.debugCanvas.height !== height) {
      this.debugCanvas.width = width;
      this.debugCanvas.height = height;
    }
  }

  projectLandmarkToScreen(lm) {
    if (!lm) return null;
    const mapped = this.poseTracker.normalizeCoverPoint(lm.x, lm.y);
    return {
      x: (1 - mapped.screenX) * window.innerWidth,
      y: mapped.screenY * window.innerHeight,
      visibility: lm.visibility ?? 1,
      presence: lm.presence ?? 1,
    };
  }

  drawConnections(points, pairs, color, width = 1.5) {
    if (!this.debugCtx) return;
    this.debugCtx.strokeStyle = color;
    this.debugCtx.lineWidth = width;
    this.debugCtx.beginPath();
    for (const [a, b] of pairs) {
      const p1 = points[a];
      const p2 = points[b];
      if (!p1 || !p2) continue;
      this.debugCtx.moveTo(p1.x, p1.y);
      this.debugCtx.lineTo(p2.x, p2.y);
    }
    this.debugCtx.stroke();
  }

  drawPoints(points, color, radius = 3) {
    if (!this.debugCtx) return;
    this.debugCtx.fillStyle = color;
    for (const p of points) {
      if (!p) continue;
      this.debugCtx.beginPath();
      this.debugCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      this.debugCtx.fill();
    }
  }

  drawDebugOverlay(poseResult, handResult, faceResult) {
    if (!this.debugCtx || !this.debugEnabled || !this.debugLandmarks) return;
    this.resizeDebugCanvas();
    this.clearDebugOverlay();

    if (poseResult?.landmarks?.[0]) {
      const posePoints = poseResult.landmarks[0].map((lm) => this.projectLandmarkToScreen(lm));
      const filtered = posePoints.map((p) => {
        if (!p) return null;
        const confidence = Math.min(p.visibility ?? 1, p.presence ?? 1);
        return confidence >= CONFIG.landmarkConfidence ? p : null;
      });
      this.drawConnections(filtered, POSE_DEBUG_CONNECTIONS, "rgba(118,225,255,0.75)", 2);
      this.drawPoints(filtered, "rgba(154,248,255,0.95)", 2.8);
    }

    if (handResult?.landmarks?.length) {
      for (const hand of handResult.landmarks) {
        const handPoints = hand.map((lm) => this.projectLandmarkToScreen(lm));
        this.drawConnections(handPoints, HAND_DEBUG_CONNECTIONS, "rgba(255,185,120,0.72)", 1.8);
        this.drawPoints(handPoints, "rgba(255,222,173,0.96)", 2.5);
      }
    }

    if (faceResult?.faceLandmarks?.[0]) {
      const facePoints = faceResult.faceLandmarks[0].map((lm) => this.projectLandmarkToScreen(lm));
      this.drawConnections(facePoints, FACE_LIPS_CONNECTIONS, "rgba(255,126,126,0.9)", 2.1);
      this.drawPoints(
        [
          facePoints[FACE.UPPER_INNER_LIP],
          facePoints[FACE.LOWER_INNER_LIP],
          facePoints[FACE.LEFT_MOUTH],
          facePoints[FACE.RIGHT_MOUTH],
        ],
        "rgba(255,180,170,0.98)",
        3.2
      );
    }
  }

  async init() {
    this.initScene();
    this.motion.setLightingMode(this.lightingMode);
    this.bindUI();
    this.log("App initialized.");
    if (!R2_ASSET_BASE_URL) {
      this.ui.showStartNote(
        "Set window.AETHER_R2_BASE_URL to your Cloudflare R2 public URL to load avatars.",
        true
      );
      this.log("R2 avatar base URL missing. Avatar loading is R2-only.", "WARN");
    } else if (!CONFIG.avatars.length) {
      this.ui.showStartNote(
        "No R2 avatars configured. Set window.AETHER_R2_AVATARS with your avatar files.",
        true
      );
      this.log("R2 avatar manifest is empty or invalid.", "WARN");
    }
    if (this.calibrationConsole.hasManualAdjustment()) {
      this.log("Manual calibration preset loaded from local storage.");
    }

    if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      this.insecureContextBlocked = true;
      this.ui.startBtn.disabled = true;
      this.ui.startBtn.textContent = "Use HTTPS / localhost";
      this.ui.showStartNote(
        `Insecure origin: ${location.origin}. Open with HTTPS or localhost to use camera.`,
        true
      );
      this.log(`Blocked insecure origin: ${location.origin}`, "WARN");
    }

    this.ui.setMode(this.modeMirror);
    if (this.ui.calibrateBtn) this.ui.calibrateBtn.disabled = true;
    if (this.ui.flipBtn) this.ui.flipBtn.disabled = true;
    this.ui.setStatus("calibration", "not set");
    this.ui.setStatus("orientation", this.motion.getOrientationLabel());
    this.ui.setStatus("gesture", "1:1 tracking");
    this.ui.setGesture("1:1 Tracking");
    this.ui.setStatus("face", "not detected");
    this.ui.setStatus("mouth", "closed");
    this.ui.setStatus("mouthRig", "checking");
    this.ui.setStatus("videoRes", "0x0");
    this.ui.setStatus("poseCount", "0");
    this.ui.setStatus("handCount", "0");
    this.syncAvatarButton();
    this.syncLightingButton();
    this.applyModeVisuals();
    this.applyDebugState();
    this.motion.resetTransform();
    this.motion.setManualScaleMultiplier(this.calibrationConsole.getScaleMultiplier());
    this.resizeDebugCanvas();
    this.loop();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = null;

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.01, 200);
    this.camera.position.set(0, 1.1, 3.4);
    this.overlayCamera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, -10, 20);
    this.overlayCamera.position.set(0, 0, 5);
    this.overlayCamera.lookAt(0, 0, 0);
    this.renderCamera = this.camera;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const ambient = new THREE.AmbientLight(0xffd9aa, 0.52);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xffe1b1, 0x26314a, 1.35);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff1ce, 2.35);
    key.position.set(1.8, 3.8, 3.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x78eaff, 1.05);
    fill.position.set(-2.8, 1.8, 2.4);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0x6df3ff, 1.55);
    rim.position.set(-3, 2.2, -2.8);
    this.scene.add(rim);

    const underGlow = new THREE.PointLight(0xf5c86a, 1.2, 4.5, 2);
    underGlow.position.set(0, -0.55, 1.45);
    this.scene.add(underGlow);

    const grid = new THREE.GridHelper(8, 22, 0x2b708f, 0x173043);
    grid.position.y = -1.6;
    this.scene.add(grid);
    this.gridHelper = grid;

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4.7, 64),
      new THREE.MeshStandardMaterial({
        color: 0x0b1c29,
        roughness: 0.86,
        metalness: 0.06,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.61;
    this.scene.add(floor);
    this.floorMesh = floor;

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enabled = CONFIG.debugOrbitControls;
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.target.set(0, 0.6, 0);

    this.motion = new AvatarMotionSystem(this.scene, this.ui);
    this.poseTracker.setViewportSize(window.innerWidth, window.innerHeight);
    this.poseTracker.setOverlayMode(true);

    window.addEventListener("resize", this.handleResize);
  }

  bindUI() {
    const startHandler = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.insecureContextBlocked) return;
      if (this.startingCamera || this.cameraStarted) return;
      this.startingCamera = true;
      this.ui.startBtn.disabled = true;
      this.ui.showStartNote("Requesting camera permission...");
      try {
        await this.startCamera();
      } catch (error) {
        console.error(error);
        this.log(`Camera start failed: ${error.message}`, "ERROR");
        this.ui.showStartNote(`Camera start failed: ${error.message}`, true);
        this.ui.startBtn.disabled = false;
      } finally {
        this.startingCamera = false;
      }
    };

    this.ui.startBtn.addEventListener("click", startHandler);
    this.ui.startBtn.addEventListener("touchend", startHandler, { passive: false });

    const calibrateHandler = (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!this.cameraStarted) {
        this.ui.showStartNote("Start camera first, then calibrate.", true);
        return;
      }

      if (!this.latestSmoothedJoints) {
        this.ui.showStartNote("No pose detected yet. Face camera and try again.", true);
        return;
      }

      this.calibrator.tryCalibrate(this.latestSmoothedJoints, this.latestBodyScale);
      this.log("Manual calibration requested.");
    };

    if (this.ui.calibrateBtn) {
      this.ui.calibrateBtn.addEventListener("click", calibrateHandler);
      this.ui.calibrateBtn.addEventListener("touchend", calibrateHandler, { passive: false });
    }

    const flipHandler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const orientation = this.motion.cycleOrientationPreset();
      this.ui.showStartNote(`Orientation changed: ${orientation}.`);
      this.log(`Orientation changed to: ${orientation}.`);
    };

    if (this.ui.flipBtn) {
      this.ui.flipBtn.addEventListener("click", flipHandler);
      this.ui.flipBtn.addEventListener("touchend", flipHandler, { passive: false });
    }

    const avatarHandler = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await this.switchAvatar();
    };

    if (this.ui.avatarBtn) {
      this.ui.avatarBtn.addEventListener("click", avatarHandler);
      this.ui.avatarBtn.addEventListener("touchend", avatarHandler, { passive: false });
    }

    if (this.ui.startAvatarBtn) {
      this.ui.startAvatarBtn.addEventListener("click", avatarHandler);
      this.ui.startAvatarBtn.addEventListener("touchend", avatarHandler, { passive: false });
    }

    const lightingHandler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.toggleLightingMode();
    };

    if (this.ui.lightBtn) {
      this.ui.lightBtn.addEventListener("click", lightingHandler);
      this.ui.lightBtn.addEventListener("touchend", lightingHandler, { passive: false });
    }

    const debugToggleHandler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.debugEnabled = !this.debugEnabled;
      this.applyDebugState();
      this.log(`Debug ${this.debugEnabled ? "enabled" : "disabled"}.`);
    };

    const cameraDebugHandler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.debugForceCamera = !this.debugForceCamera;
      this.applyDebugState();
      this.log(`Camera overlay ${this.debugForceCamera ? "forced visible" : "auto mode"}.`);
    };

    const landmarksDebugHandler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.debugLandmarks = !this.debugLandmarks;
      this.applyDebugState();
      this.log(`Landmark debug ${this.debugLandmarks ? "enabled" : "disabled"}.`);
    };

    let lastBonesToggleAt = 0;
    const bonesDebugHandler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const now = performance.now();
      if (now - lastBonesToggleAt < 320) return;
      lastBonesToggleAt = now;
      this.debugBones = !this.debugBones;
      this.applyDebugState();
      this.log(`Avatar bone helper ${this.debugBones ? "enabled" : "disabled"}.`);

      if (!this.debugBones) return;

      if (!this.cameraStarted) {
        this.ui.showStartNote("Start camera first so the avatar rig can load.", true);
        return;
      }

      if (this.motion?.useFallback || !this.motion?.skeletonFound) {
        this.ui.showStartNote(
          "Current avatar is using fallback rig. Switch avatar and wait for Skeleton Found: yes.",
          true
        );
      }
    };

    if (this.ui.debugBtn) {
      this.ui.debugBtn.addEventListener("click", debugToggleHandler);
      this.ui.debugBtn.addEventListener("touchend", debugToggleHandler, { passive: false });
    }
    if (this.ui.cameraDebugBtn) {
      this.ui.cameraDebugBtn.addEventListener("click", cameraDebugHandler);
      this.ui.cameraDebugBtn.addEventListener("touchend", cameraDebugHandler, { passive: false });
    }
    if (this.ui.landmarkDebugBtn) {
      this.ui.landmarkDebugBtn.addEventListener("click", landmarksDebugHandler);
      this.ui.landmarkDebugBtn.addEventListener("touchend", landmarksDebugHandler, { passive: false });
    }
    if (this.ui.bonesDebugBtn) {
      this.ui.bonesDebugBtn.addEventListener("click", bonesDebugHandler);
      this.ui.bonesDebugBtn.addEventListener("touchend", bonesDebugHandler, { passive: false });
    }
  }

  async startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera API unavailable. Use Safari/Chrome over HTTPS or localhost.");
    }
    this.log("Requesting camera permission...");

    const streamPromise = navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(
              "Camera permission timed out. Please allow camera access and try again."
            )
          ),
        12000
      );
    });
    const stream = await Promise.race([streamPromise, timeoutPromise]);
    this.log("Camera permission granted.");

    this.video.srcObject = stream;

    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Camera stream did not initialize in time.")),
        8000
      );
      this.video.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve();
      };
    });

    await this.video.play();
    this.poseTracker.setVideoSize(this.video.videoWidth || 1280, this.video.videoHeight || 720);
    this.ui.setStatus("videoRes", `${this.video.videoWidth || 0}x${this.video.videoHeight || 0}`);
    this.log(`Video stream ready: ${this.video.videoWidth || 0}x${this.video.videoHeight || 0}.`);

    this.ui.setStatus("camera", "active");
    this.cameraStarted = true;
    if (this.ui.calibrateBtn) this.ui.calibrateBtn.disabled = false;
    if (this.ui.flipBtn) this.ui.flipBtn.disabled = false;
    this.ui.hideOverlay();
    this.ui.showStartNote("Camera started. Initializing trackers...");
    this.applyDebugState();

    this.ui.showStartNote("Loading avatar and trackers...");
    const trackerTask = this.initMediaPipe().then(() => {
      this.log("MediaPipe pose, hand, and face trackers initialized.");
    });
    const avatarTask = (async () => {
      this.switchingAvatar = true;
      this.syncAvatarButton();
      try {
        await this.loadSelectedAvatar();
      } finally {
        this.switchingAvatar = false;
        this.syncAvatarButton();
      }
    })();
    await Promise.all([trackerTask, avatarTask]);
    this.ui.showStartNote("Tracking ready. Use Calibrate Pose if position or scale is off.");
  }

  async initMediaPipe() {
    this.vision = await FilesetResolver.forVisionTasks(CONFIG.modelAssetBase);

    this.poseLandmarker = await PoseLandmarker.createFromOptions(this.vision, {
      baseOptions: {
        modelAssetPath: CONFIG.poseModel,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    });

    this.handLandmarker = await HandLandmarker.createFromOptions(this.vision, {
      baseOptions: {
        modelAssetPath: CONFIG.handModel,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.faceLandmarker = await FaceLandmarker.createFromOptions(this.vision, {
      baseOptions: {
        modelAssetPath: CONFIG.faceModel,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: false,
    });
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.overlayCamera.left = -aspect;
    this.overlayCamera.right = aspect;
    this.overlayCamera.top = 1;
    this.overlayCamera.bottom = -1;
    this.overlayCamera.updateProjectionMatrix();
    this.poseTracker.setViewportSize(width, height);
    this.renderer.setSize(width, height);
    this.resizeDebugCanvas();
  }

  switchMode() {
    this.modeMirror = !this.modeMirror;
    this.ui.setMode(this.modeMirror);
    this.applyModeVisuals();
    this.applyDebugState();
    this.log(`Mode switched to ${this.modeMirror ? "Mirror AR" : "Full Avatar"}.`);
  }

  applyModeVisuals() {
    if (this.modeMirror) {
      this.renderCamera = this.overlayCamera;
      this.poseTracker.setOverlayMode(true);
      this.poseTracker.setMirrorSides(CONFIG.mirrorSwapSides);
      this.scene.background = null;
      this.renderer.setClearAlpha(0.0);
      if (this.gridHelper) this.gridHelper.visible = false;
      if (this.floorMesh) this.floorMesh.visible = false;
    } else {
      this.renderCamera = this.camera;
      this.poseTracker.setOverlayMode(false);
      this.poseTracker.setMirrorSides(false);
      this.camera.position.set(0, 1.35, 2.25);
      this.scene.background = new THREE.Color(0x04080d);
      this.renderer.setClearAlpha(1.0);
      if (this.gridHelper) this.gridHelper.visible = true;
      if (this.floorMesh) this.floorMesh.visible = true;
    }
  }

  updateTracking(now, dt) {
    if (!this.cameraStarted || !this.poseLandmarker || !this.handLandmarker || !this.faceLandmarker) return;
    if (this.video.readyState < 2) return;

    if (this.video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = this.video.currentTime;

    const poseResult = this.poseLandmarker.detectForVideo(this.video, now);
    const handResult = this.handLandmarker.detectForVideo(this.video, now);
    const faceResult = this.faceLandmarker.detectForVideo(this.video, now);
    this.lastPoseResult = poseResult;
    this.lastHandResult = handResult;
    this.lastFaceResult = faceResult;

    const mouthState = this.mouthTracker.update(faceResult);
    this.latestMouthOpen = mouthState.open;
    this.motion.applyMouth(this.latestMouthOpen, dt);

    if (mouthState.detected) {
      const mouthPercent = Math.round(this.latestMouthOpen * 100);
      this.ui.setStatus("face", `${mouthState.landmarkCount} landmarks`);
      this.ui.setStatus("mouth", `${mouthPercent}% ${mouthState.source}`);
      if (!this.prevFaceDetected) this.log("Face and mouth tracking detected.");
      this.prevFaceDetected = true;
      if (now - this.lastFaceLog > CONFIG.faceLogIntervalMs) {
        console.log("MediaPipe face landmarks:", faceResult.faceLandmarks?.[0]);
        console.log("MediaPipe face blendshapes:", faceResult.faceBlendshapes?.[0]?.categories || []);
        this.lastFaceLog = now;
      }
    } else {
      this.ui.setStatus("face", "not detected");
      this.ui.setStatus("mouth", "closed");
      if (this.prevFaceDetected) this.log("Face tracking lost.", "WARN");
      this.prevFaceDetected = false;
    }

    if (poseResult?.landmarks?.length) {
      this.ui.setStatus("pose", "detected");
      this.ui.setStatus("poseCount", String(poseResult.landmarks[0]?.length || 0));
      if (!this.prevPoseDetected) this.log("Pose detected.");
      this.prevPoseDetected = true;

      if (now - this.lastPoseLog > CONFIG.poseLogIntervalMs) {
        console.log("MediaPipe pose landmarks:", poseResult.landmarks[0]);
        this.lastPoseLog = now;
      }

      const packet = this.poseTracker.build(poseResult, handResult, faceResult);
      if (packet) {
        const smoothed = this.smoother.update(packet.joints);
        this.latestSmoothedJoints = smoothed;
        this.latestBodyScale = packet.bodyScale;

        if (packet.lowerEstimated && !this.prevLowerEstimated) {
          console.warn("Lower body landmarks missing. Using estimated lower body.");
        }
        this.prevLowerEstimated = packet.lowerEstimated;

        this.ui.setStatus("body", packet.fullBodyDetected ? "full body" : "upper body only");
        this.ui.setStatus("estimate", packet.lowerEstimated ? "active" : "inactive");

        const calibrated = this.calibrator.apply(smoothed, packet.bodyScale, dt);
        const manualAdjusted = this.calibrationConsole.applyToJoints(calibrated.joints);
        const calibrationStatus = this.calibrationConsole.hasManualAdjustment()
          ? (this.calibrator.active ? "locked + manual" : "manual")
          : (this.calibrator.active ? "locked" : "not set");
        this.ui.setStatus("calibration", calibrationStatus);
        this.motion.setCalibrationScaleMultiplier(1);
        this.motion.setManualScaleMultiplier(this.calibrationConsole.getScaleMultiplier());
        this.motion.applyPose(manualAdjusted, packet.bodyScale, dt, {
          lowerEstimated: packet.lowerEstimated,
          mouthOpen: this.latestMouthOpen,
        });
      }
    } else {
      this.ui.setStatus("pose", "not detected");
      this.ui.setStatus("poseCount", "0");
      if (this.prevPoseDetected) this.log("Pose lost.", "WARN");
      this.prevPoseDetected = false;
      this.prevLowerEstimated = false;
    }

    if (handResult?.landmarks?.length) {
      this.ui.setStatus("hands", `${handResult.landmarks.length} detected`);
      this.ui.setStatus("handCount", String((handResult.landmarks.length || 0) * 21));
      if (!this.prevHandsDetected) this.log("Hand tracking detected.");
      this.prevHandsDetected = true;
      if (now - this.lastHandLog > CONFIG.handLogIntervalMs) {
        console.log("MediaPipe hand landmarks:", handResult.landmarks);
        this.lastHandLog = now;
      }
    } else {
      this.ui.setStatus("hands", "arms at side");
      this.ui.setStatus("handCount", "0");
      if (this.prevHandsDetected) this.log("Hand tracking standby.", "WARN");
      this.prevHandsDetected = false;
    }

    this.motion.frozen = false;
    this.ui.setGesture("1:1 Tracking");
    this.drawDebugOverlay(poseResult, handResult, faceResult);
  }

  loop() {
    requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = this.clock.getDelta();
    this.updateTracking(now, dt);

    if (this.orbit.enabled) this.orbit.update();

    this.renderer.render(this.scene, this.renderCamera || this.camera);
    this.ui.setStatus("fps", String(this.fps.tick()));
  }
}

const app = new MirrorApp();
app.init();
