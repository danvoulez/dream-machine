import type { DynamicToolUIPart } from "ai";
import type { SceneResponse } from "~~/shared/tools/scene";
import type { ProjectionResponse } from "~~/shared/tools/runtime-projection";

export type PortalIdentityOutput = {
  app_user_id: string;
  lab_id: string | null;
  supabase_user_id: string | null;
  grants: string[];
  connector_boundary: string;
  read_only: true;
};

export interface SceneOutput {
  ok: boolean;
  scene?: SceneResponse;
  projection?: ProjectionResponse;
  operator?: PortalIdentityOutput;
  notes?: string[];
  reason?: string;
  errors?: { field: string; message: string }[];
  cannot_do?: string[];
}

export type SceneUIToolInvocation = DynamicToolUIPart & {
  output: SceneOutput;
};