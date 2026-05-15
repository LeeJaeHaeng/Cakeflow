import { create } from "zustand";
import { nanoid } from "nanoid";
import type { ProductKey } from "@/lib/orders/pricing";

export type SimObjectType = "image" | "sticker" | "text";
export type SimulatorCakeType = "design" | "rice";
export type SimulatorCanvasShape = "square" | "round";
export type LetteringMode = "straight" | "arc";
export type LetteringPlacement = "center" | "bottom" | "edge" | "free";
export type RiceLayoutPreset = "crescent" | "wreath" | "half" | "dome" | "free";

export interface SimObject {
  id: string;
  type: SimObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  // image / sticker
  src?: string;
  opacity?: number;
  role?: "reference" | "flower" | "decor" | "lettering";
  // text
  text?: string;
  fontSize?: number;
  fill?: string;
  fontFamily?: string;
  fontStyle?: string;
  align?: string;
  textMode?: LetteringMode;
  placement?: LetteringPlacement;
}

export interface SimulatorSnapshot {
  objects: SimObject[];
  bgColor: string;
  cakeType: SimulatorCakeType;
  canvasShape: SimulatorCanvasShape;
  cakeSize: string;
  productKey: ProductKey | null;
  referenceImageMode: "design-reference" | "print-image";
  layoutPreset: RiceLayoutPreset | null;
  lettering: Array<{
    text: string;
    mode: LetteringMode;
    placement: LetteringPlacement;
    fill?: string;
    fontFamily?: string;
    fontSize?: number;
  }>;
}

interface SimulatorStore {
  objects: SimObject[];
  selectedId: string | null;
  bgColor: string;
  cakeType: SimulatorCakeType;
  canvasShape: SimulatorCanvasShape;
  cakeSize: string;
  productKey: ProductKey | null;
  referenceImageMode: "design-reference" | "print-image";
  layoutPreset: RiceLayoutPreset | null;
  designId: string | null;
  history: SimulatorSnapshot[];
  historyIdx: number;

  // actions
  addObject: (obj: Omit<SimObject, "id">) => void;
  updateObject: (id: string, updates: Partial<SimObject>) => void;
  removeObject: (id: string) => void;
  setSelected: (id: string | null) => void;
  setBgColor: (color: string) => void;
  setCakeType: (cakeType: SimulatorCakeType) => void;
  setProductKey: (productKey: ProductKey | null) => void;
  setCakeSize: (cakeSize: string) => void;
  setLayoutPreset: (preset: RiceLayoutPreset | null) => void;
  setDesignId: (id: string | null) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearAll: () => void;
  getSnapshot: () => SimulatorSnapshot;
}

function buildSnapshot(state: {
  objects: SimObject[];
  bgColor: string;
  cakeType: SimulatorCakeType;
  canvasShape: SimulatorCanvasShape;
  cakeSize: string;
  productKey: ProductKey | null;
  referenceImageMode: "design-reference" | "print-image";
  layoutPreset: RiceLayoutPreset | null;
}): SimulatorSnapshot {
  const objects = JSON.parse(JSON.stringify(state.objects)) as SimObject[];
  return {
    objects,
    bgColor: state.bgColor,
    cakeType: state.cakeType,
    canvasShape: state.canvasShape,
    cakeSize: state.cakeSize,
    productKey: state.productKey,
    referenceImageMode: state.referenceImageMode,
    layoutPreset: state.layoutPreset,
    lettering: objects
      .filter((object) => object.type === "text" && object.text?.trim())
      .map((object) => ({
        text: object.text ?? "",
        mode: object.textMode ?? "straight",
        placement: object.placement ?? "free",
        fill: object.fill,
        fontFamily: object.fontFamily,
        fontSize: object.fontSize,
      })),
  };
}

export const useSimulatorStore = create<SimulatorStore>((set, get) => ({
  objects: [],
  selectedId: null,
  bgColor: "#FFF5F5",
  cakeType: "design",
  canvasShape: "round",
  cakeSize: "1호",
  productKey: null,
  referenceImageMode: "print-image",
  layoutPreset: null,
  designId: null,
  history: [],
  historyIdx: -1,

  addObject: (obj) => {
    const newObj: SimObject = { ...obj, id: nanoid() };
    set((s) => {
      const objects = [...s.objects, newObj];
      const snap = buildSnapshot({ ...s, objects });
      const history = [...s.history.slice(0, s.historyIdx + 1), snap];
      return { objects, selectedId: newObj.id, history, historyIdx: history.length - 1 };
    });
  },

  updateObject: (id, updates) => {
    set((s) => {
      const objects = s.objects.map((o) => (o.id === id ? { ...o, ...updates } : o));
      return { objects };
    });
  },

  removeObject: (id) => {
    set((s) => {
      const objects = s.objects.filter((o) => o.id !== id);
      const snap = buildSnapshot({ ...s, objects });
      const history = [...s.history.slice(0, s.historyIdx + 1), snap];
      return { objects, selectedId: null, history, historyIdx: history.length - 1 };
    });
  },

  setSelected: (id) => set({ selectedId: id }),

  setBgColor: (color) => {
    set((s) => {
      const snap = buildSnapshot({ ...s, bgColor: color });
      const history = [...s.history.slice(0, s.historyIdx + 1), snap];
      return { bgColor: color, history, historyIdx: history.length - 1 };
    });
  },

  setCakeType: (cakeType) => {
    set((s) => {
      const canvasShape: SimulatorCanvasShape = "round";
      const referenceImageMode = cakeType === "rice" ? "design-reference" : "print-image";
      const snap = buildSnapshot({ ...s, cakeType, canvasShape, referenceImageMode });
      const history = [...s.history.slice(0, s.historyIdx + 1), snap];
      return {
        cakeType,
        canvasShape,
        referenceImageMode,
        layoutPreset: cakeType === "rice" ? s.layoutPreset : null,
        selectedId: null,
        history,
        historyIdx: history.length - 1,
      };
    });
  },

  setProductKey: (productKey) => set({ productKey }),

  setCakeSize: (cakeSize) => set({ cakeSize }),

  setLayoutPreset: (preset) => {
    set((s) => {
      const snap = buildSnapshot({ ...s, layoutPreset: preset });
      const history = [...s.history.slice(0, s.historyIdx + 1), snap];
      return { layoutPreset: preset, history, historyIdx: history.length - 1 };
    });
  },

  setDesignId: (id) => set({ designId: id }),

  bringForward: (id) => {
    set((s) => {
      const idx = s.objects.findIndex((o) => o.id === id);
      if (idx < 0 || idx >= s.objects.length - 1) return s;
      const objects = [...s.objects];
      [objects[idx], objects[idx + 1]] = [objects[idx + 1], objects[idx]];
      return { objects };
    });
  },

  sendBackward: (id) => {
    set((s) => {
      const idx = s.objects.findIndex((o) => o.id === id);
      if (idx <= 0) return s;
      const objects = [...s.objects];
      [objects[idx], objects[idx - 1]] = [objects[idx - 1], objects[idx]];
      return { objects };
    });
  },

  undo: () => {
    set((s) => {
      const newIdx = s.historyIdx - 1;
      if (newIdx < 0) return s;
      const snap = s.history[newIdx];
      return { objects: snap.objects, bgColor: snap.bgColor, historyIdx: newIdx, selectedId: null };
    });
  },

  redo: () => {
    set((s) => {
      const newIdx = s.historyIdx + 1;
      if (newIdx >= s.history.length) return s;
      const snap = s.history[newIdx];
      return { objects: snap.objects, bgColor: snap.bgColor, historyIdx: newIdx, selectedId: null };
    });
  },

  canUndo: () => get().historyIdx > 0,
  canRedo: () => get().historyIdx < get().history.length - 1,

  clearAll: () => {
    set((s) => {
      const objects: SimObject[] = [];
      const snap = buildSnapshot({ ...s, objects });
      const history = [...s.history, snap];
      return { objects, selectedId: null, history, historyIdx: history.length - 1 };
    });
  },

  getSnapshot: () => {
    const s = get();
    return buildSnapshot(s);
  },
}));
