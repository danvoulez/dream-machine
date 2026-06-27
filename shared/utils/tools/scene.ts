import type { DynamicToolUIPart } from "ai";
import type { SceneResponse } from "~~/shared/tools/scene";
import type { ProjectionResponse } from "~~/shared/tools/runtime-projection";

export interface SceneOutput {
  ok: boolean;
  scene?: SceneResponse;
  projection?: ProjectionResponse;
  notes?: string[];
  reason?: string;
  errors?: { field: string; message: string }[];
  cannot_do?: string[];
}

export type SceneUIToolInvocation = DynamicToolUIPart & {
  output: SceneOutput;
};