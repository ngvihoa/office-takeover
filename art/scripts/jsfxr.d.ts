declare module 'jsfxr' {
  export const jsfxr: {
    Params: new () => {
      fromJSON(preset: Record<string, number>): Record<string, number>;
    };
  };
  export const sfxr: {
    toWave(params: Record<string, number>): {
      wav: number[];
      data: number[];
      clipping: number;
    };
  };
}
