import { defineEval } from "eve/evals";
import { ledgersSeeded } from "./_lib/ledgers.ts";
import { isValidSceneOutput } from "./_lib/scene-output.ts";

const PROMPT = "Quais são os processos e seus andamentos? O que está em andamento no lab?";

export default defineEval({
  description: "T-P2 agent receipt: Eve calls scene.open over the real ledgers and reports andamento.",
  tags: ["t-p2", "scene", "requires-ledgers", "requires-model"],
  timeoutMs: 180_000,
  async test(t) {
    if (!ledgersSeeded()) {
      throw new Error("skip: seeded LogLine ledger missing (Dream-Machine-LogLine-Acts/.lab/lab.sqlite)");
    }

    await t.send(PROMPT);
    t.completed();
    t.calledTool("scene", {
      isError: false,
      times: 1,
      input: (input) => {
        if (!input || typeof input !== "object") return false;
        const op = (input as { op?: string }).op;
        return op === "scene.open" || op === "scene.refresh";
      },
      output: (output) => isValidSceneOutput(output),
    });
    t.messageIncludes(/process|andamento|scene|trav|waiting|lab/i);
  },
});