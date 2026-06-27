import { handleAdmissionIntake } from "../../utils/admission-intake";
import { verifyAdmissionIntakeAuth } from "../../utils/admission-auth";

export default defineEventHandler(async (event) => {
  // C0.4 proposal.seam — intake only; never append/close/commit.
  verifyAdmissionIntakeAuth(event);

  const body = await readBody(event);
  const result = handleAdmissionIntake(body);
  if (!result.ok) {
    const status = result.reason === "invalid_passport" || result.reason === "forbidden_operation"
      ? 400
      : result.reason === "anonymous_not_admitted"
        ? 403
        : 422;
    throw createError({ statusCode: status, statusMessage: result.reason, data: result });
  }
  return result;
});