const UNIQUE_VIOLATION_CODE = "23505";
const FOREIGN_KEY_VIOLATION_CODE = "23503";

type DatabaseError = { code?: string } | null;

export function isUniqueViolation(error: DatabaseError): boolean {
  return error?.code === UNIQUE_VIOLATION_CODE;
}

export function isForeignKeyViolation(error: DatabaseError): boolean {
  return error?.code === FOREIGN_KEY_VIOLATION_CODE;
}

export type DatabaseErrorDetails = { code?: string; message?: string };

export function describeDatabaseError(
  message: string,
  error: DatabaseErrorDetails,
): string {
  console.error(message, error);
  return error.code ? `${message} (código ${error.code})` : message;
}

export function getDatabaseErrorMessage(
  messages: Readonly<Record<string, string>>,
  error: DatabaseErrorDetails,
  fallbackMessage: string,
): string {
  const mappedMessage = error.code ? messages[error.code] : undefined;
  return mappedMessage ?? describeDatabaseError(fallbackMessage, error);
}
