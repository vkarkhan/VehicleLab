export const TERMINOLOGY = {
  sceneViewer: "Scene Viewer",
  sandbox: "Sandbox",
  telemetry: "Telemetry",
  modelDocs: "Model Docs"
} as const;

export type TerminologyKey = keyof typeof TERMINOLOGY;
