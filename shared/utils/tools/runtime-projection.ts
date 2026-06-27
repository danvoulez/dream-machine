import type { DynamicToolUIPart } from "ai";
import type { ProjectionResponse } from "~~/shared/tools/runtime-projection";

// Output shape returned by the agent/tools/runtime_projection.ts tool.
export interface RuntimeProjectionOutput {
  ok: boolean;
  projection?: ProjectionResponse;
  reason?: string;
  errors?: { field: string; message: string }[];
  notes?: string[];
}

// Mirrors shared/utils/tools/weather.ts: the chat UI tool-part for runtime_projection.
export type RuntimeProjectionUIToolInvocation = DynamicToolUIPart & {
  output: RuntimeProjectionOutput;
};
