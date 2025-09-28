import type { ModelDef, ModelParams, ModelState } from "./core";

const registry: Record<string, ModelDef<any, any>> = {};

export const registerModel = <P extends ModelParams, S extends ModelState>(model: ModelDef<P, S>) => {
  registry[model.id] = model as ModelDef<any, any>;
  return model;
};

export const getModel = (id: string) => registry[id];

export const listModels = () => Object.values(registry);
