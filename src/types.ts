export enum GameState {
  MainMenu = 'MainMenu',
  Playing = 'Playing',
  GameOver = 'GameOver',
  RewardedRevive = 'RewardedRevive',
}

export interface GameSettings {
  baseLeakSpeed: number; // leak units per sec
  difficultyRamp: number; // how fast leak speed increases over time
  crawlSpeedMin: number;
  crawlSpeedMax: number;
  speedIncreasePerHit: number;
  boundingBoxWidth: number;
  boundingBoxLength: number;
  throwSpeed: number;
  maxBabies: number;
  enableSound: boolean;
}

export interface CSharpFile {
  id: string;
  filename: string;
  description: string;
  code: (settings: GameSettings) => string;
  tags: string[];
}
