import {
  ZodFirstPartyTypeKind,
  type ZodObject,
  type ZodRawShape,
  type ZodTypeAny,
} from "zod";

export type FieldDescriptor = {
  name: string;
  label: string;
  group: "basic" | "advanced";
  type: "number" | "boolean" | "enum" | "string";
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
  description?: string;
};

type FieldGroups = {
  basic: FieldDescriptor[];
  advanced: FieldDescriptor[];
};

const unwrap = (type: ZodTypeAny): ZodTypeAny => {
  if (type._def.typeName === ZodFirstPartyTypeKind.ZodDefault) {
    return unwrap(type._def.innerType);
  }
  if (type._def.typeName === ZodFirstPartyTypeKind.ZodEffects) {
    return unwrap(type._def.schema);
  }
  return type;
};

const parseDescription = (name: string, description?: string) => {
  if (!description) {
    return { label: name, group: "basic" as const };
  }
  const [labelRaw, groupRaw] = description.split("|");
  const group = groupRaw?.trim() === "advanced" ? "advanced" : "basic";
  return {
    label: (labelRaw ?? name).trim(),
    group,
  };
};

const extractNumberChecks = (type: ZodTypeAny) => {
  const checks = type._def.checks ?? [];
  const result: { min?: number; max?: number; step?: number } = {};
  for (const check of checks) {
    if (check.kind === "min") {
      result.min = check.value;
    }
    if (check.kind === "max") {
      result.max = check.value;
    }
    if (check.kind === "multipleOf") {
      result.step = check.value;
    }
  }
  return result;
};

export const describeSchema = (schema: ZodObject<ZodRawShape>): FieldGroups => {
  const shape = schema.shape;
  const basic: FieldDescriptor[] = [];
  const advanced: FieldDescriptor[] = [];

  for (const key of Object.keys(shape)) {
    const original = shape[key] as ZodTypeAny;
    const type = unwrap(original);
    const { label, group } = parseDescription(key, original.description ?? type.description);

    let descriptor: FieldDescriptor = {
      name: key,
      label,
      group,
      type: "string",
      description: original.description,
    };

    switch (type._def.typeName) {
      case ZodFirstPartyTypeKind.ZodNumber: {
        const range = extractNumberChecks(type);
        descriptor = {
          ...descriptor,
          type: "number",
          ...range,
        };
        break;
      }
      case ZodFirstPartyTypeKind.ZodBoolean: {
        descriptor = {
          ...descriptor,
          type: "boolean",
        };
        break;
      }
      case ZodFirstPartyTypeKind.ZodEnum: {
        descriptor = {
          ...descriptor,
          type: "enum",
          options: (type._def.values as string[]).map((value) => ({
            value,
            label: value,
          })),
        };
        break;
      }
      case ZodFirstPartyTypeKind.ZodLiteral: {
        descriptor = {
          ...descriptor,
          type: typeof type._def.value === "boolean" ? "boolean" : "string",
        };
        break;
      }
      default: {
        descriptor = {
          ...descriptor,
          type: "string",
        };
      }
    }

    if (group === "advanced") {
      advanced.push(descriptor);
    } else {
      basic.push(descriptor);
    }
  }

  return {
    basic,
    advanced,
  };
};
