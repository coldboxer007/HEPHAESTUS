
export enum AppStep {
  UPLOAD,
  TOP_DOWN,
  ROOM_RENDER,
  TOUR,
}

export interface Blueprint {
  base64: string;
  mimeType: string;
  name: string;
}

export interface Room {
  id: string;
  name: string;
  renders: string[];
}
