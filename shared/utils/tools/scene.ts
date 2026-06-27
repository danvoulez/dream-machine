import type { DynamicToolUIPart } from "ai";
import type { SceneResponse } from "~~/shared/tools/scene";

export interface SceneOutput {
  ok: boolean;
  scene?: SceneResponse;
  reason?: string;
  errors?: { field: string; message: string }[];
  cannot_do?: string[];
}

export type SceneUIToolInvocation = DynamicToolUIPart & {
  output: SceneOutput;
};