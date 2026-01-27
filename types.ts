
export interface SVGAFileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  url: string;
}

export enum PlayerStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR'
}
