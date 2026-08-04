export enum GameState {
  MainMenu = 'MainMenu',
  Playing = 'Playing',
  GameOver = 'GameOver',
  RewardedRevive = 'RewardedRevive',
}

export interface GameSettings {
  baseLeakSpeed: number;
  difficultyRamp: number;
  crawlSpeedMin: number;
  crawlSpeedMax: number;
  speedIncreasePerHit: number;
  boundingBoxWidth: number;
  boundingBoxLength: number;
  throwSpeed: number;
  maxBabies: number;
  enableSound: boolean;
}
