import { registerModel } from "../sim/registry";
import { Unicycle } from "./unicycle";
import { Lin2DOF } from "./lin2dof";

export const bootModels = () => {
  registerModel(Unicycle);
  try {
    registerModel(Lin2DOF);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to register Lin2DOF model", error);
    }
  }
};
