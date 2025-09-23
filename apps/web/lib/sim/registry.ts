import type { ModelDef } from "./core";

const registry: Record<string, ModelDef> = {};

export const registerModel = (model: ModelDef) => {
  registry[model.id] = model;
  return model;
};

export const getModel = (id: string) => registry[id];

export const listModels = () => Object.values(registry);
