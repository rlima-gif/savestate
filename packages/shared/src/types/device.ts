export type DeviceKind =
  | 'pc'
  | 'steam_deck'
  | 'legion_go'
  | 'android'
  | 'console'
  | 'retro_handheld'
  | 'other';

export interface DeviceRecord {
  id: string;
  name: string;
  kind: DeviceKind;
  graphicsPreset?: string;
  resolution?: string;
  fpsTarget?: number;
  controllerMapping?: string;
  emulatorVersion?: string;
  modsOrPatches?: string;
  saveLocationNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
