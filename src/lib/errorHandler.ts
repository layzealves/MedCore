type ErrorMessageMap = {
  pattern: string;
  message: string;
};

const ERROR_PATTERNS: ErrorMessageMap[] = [
  { pattern: "23505", message: "Este registro já existe no sistema." },
  { pattern: "duplicate", message: "Este registro já existe no sistema." },
  { pattern: "23503", message: "Operação não permitida devido a dados relacionados." },
  { pattern: "foreign key", message: "Operação não permitida devido a dados relacionados." },
  { pattern: "23514", message: "Os dados fornecidos não são válidos." },
  { pattern: "check constraint", message: "Os dados fornecidos não são válidos." },
  { pattern: "42501", message: "Você não tem permissão para realizar esta operação." },
  { pattern: "policy", message: "Você não tem permissão para realizar esta operação." },
  { pattern: "permission", message: "Você não tem permissão para realizar esta operação." },
  { pattern: "network", message: "Erro de conexão. Verifique sua internet e tente novamente." },
  { pattern: "fetch", message: "Erro de conexão. Verifique sua internet e tente novamente." },
  { pattern: "timeout", message: "A operação demorou muito. Tente novamente." },
  { pattern: "not found", message: "Recurso não encontrado." },
  { pattern: "404", message: "Recurso não encontrado." },
  { pattern: "unauthorized", message: "Sessão expirada. Faça login novamente." },
  { pattern: "401", message: "Sessão expirada. Faça login novamente." },
];

const DEFAULT_ERROR_MESSAGE = "Ocorreu um erro. Por favor, tente novamente.";
const CPF_DUPLICATE_MESSAGE = "CPF já cadastrado no sistema.";

function findErrorMessage(errorText: string): string {
  const lowerCaseError = errorText.toLowerCase();

  for (const { pattern, message } of ERROR_PATTERNS) {
    if (lowerCaseError.includes(pattern)) {
      return message;
    }
  }

  return DEFAULT_ERROR_MESSAGE;
}

export function handlePatientError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("duplicate") || message.includes("23505")) {
      return CPF_DUPLICATE_MESSAGE;
    }
    return findErrorMessage(error.message);
  }
  return DEFAULT_ERROR_MESSAGE;
}

/**
 * Logs errors only in development environment.
 * In production, this function does nothing to prevent information leakage.
 *
 * @param context - A string describing where the error occurred
 * @param error - The error object to log
 */
export function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${context}]:`, error);
  }
}
