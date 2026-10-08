import {
  type DatabaseErrorDetails,
  describeDatabaseError,
} from "./database-errors";

export type ActionSuccess<TData> = { status: "success"; data: TData };

export type ActionFailure = { status: "error"; message: string };

export type ActionResult<TData = void> = ActionSuccess<TData> | ActionFailure;

export function actionSuccess(): ActionSuccess<void>;
export function actionSuccess<TData>(data: TData): ActionSuccess<TData>;
export function actionSuccess<TData>(data?: TData) {
  return { status: "success", data } as const;
}

export function actionFailure(message: string): ActionFailure {
  return { status: "error", message };
}

export function databaseFailure(
  message: string,
  error: DatabaseErrorDetails,
): ActionFailure {
  return actionFailure(describeDatabaseError(message, error));
}

export function unwrapActionResult<TData>(result: ActionResult<TData>): TData {
  if (result.status === "error") {
    throw new Error(result.message);
  }
  return result.data;
}
