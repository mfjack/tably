const STEP_NUMBER_PREFIX = /^\s*\d+[.)-]\s*/;

export function parsePreparationSteps(instructions: string | null): string[] {
  if (!instructions) return [];
  return instructions
    .split("\n")
    .map((line) => line.replace(STEP_NUMBER_PREFIX, "").trim())
    .filter((line) => line !== "");
}

export function joinPreparationSteps(steps: readonly string[]): string {
  return steps
    .map((step) => step.trim())
    .filter((step) => step !== "")
    .join("\n");
}
