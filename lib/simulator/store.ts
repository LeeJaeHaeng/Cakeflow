import { create } from "zustand";
import { nanoid } from "nanoid";

export type SimObjectType = "image" | "sticker" | "text";

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
  // text
  text?: string;
  fontSize?: number;
  fill?: string;
  fontFamily?: string;
  fontStyle?: string;
  align?: string;
}

export interface SimulatorSnapshot {
  objects: SimObject[];
  bgColor: string;
}

interface SimulatorStore {
  objects: SimObject[];
  selectedId: string | null;
  bgColor: string;
  designId: string | null;
  history: SimulatorSnapshot[];
  historyIdx: number;

  // actions
  addObject: (obj: Omit<SimObject, "id">) => void;
  updateObject: (id: string, updates: Partial<SimObject>) => void;
  removeObject: (id: string) => void;
  setSelected: (id: string | null) => void;
  setBgColor: (color: string) => void;
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

function snapshot(objects: SimObject[], bgColor: string): SimulatorSnapshot {
  return { objects: JSON.parse(JSON.stringify(objects)), bgColor };
}

export const useSimulatorStore = create<SimulatorStore>((set, get) => ({
  objects: [],
  selectedId: null,
  bgColor: "#FFF5F5",
  designId: null,
  history: [],
  historyIdx: -1,

  addObject: (obj) => {
    const newObj: SimObject = { ...obj, id: nanoid() };
    set((s) => {
      const objects = [...s.objects, newObj];
      const snap = snapshot(objects, s.bgColor);
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
      const snap = snapshot(objects, s.bgColor);
      const history = [...s.history.slice(0, s.historyIdx + 1), snap];
      return { objects, selectedId: null, history, historyIdx: history.length - 1 };
    });
  },

  setSelected: (id) => set({ selectedId: id }),

  setBgColor: (color) => {
    set((s) => {
      const snap = snapshot(s.objects, color);
      const history = [...s.history.slice(0, s.historyIdx + 1), snap];
      return { bgColor: color, history, historyIdx: history.length - 1 };
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
      const snap = snapshot(objects, s.bgColor);
      const history = [...s.history, snap];
      return { objects, selectedId: null, history, historyIdx: history.length - 1 };
    });
  },

  getSnapshot: () => {
    const s = get();
    return snapshot(s.objects, s.bgColor);
  },
}));
