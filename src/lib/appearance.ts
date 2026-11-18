export const appearanceCookie = "tomorrow-look";

export type LightScene = "cat" | "ocean";
export type Theme = "light" | "dark";
export type Scene = LightScene | "space";
export type Look = { theme: Theme; lightScene: LightScene };

export function readLook(value?: string): Look {
  const [theme, lightScene] = (value ?? "").split(".");
  return { theme: theme === "dark" ? "dark" : "light", lightScene: lightScene === "ocean" ? "ocean" : "cat" };
}
