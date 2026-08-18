// Erros de aplicação com status HTTP — tratados centralmente no app.ts.
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const BadRequest = (msg: string, code?: string) => new AppError(400, msg, code);
export const Unauthorized = (msg = "Não autenticado") => new AppError(401, msg, "UNAUTHORIZED");
export const Forbidden = (msg = "Acesso negado") => new AppError(403, msg, "FORBIDDEN");
export const NotFound = (msg = "Não encontrado") => new AppError(404, msg, "NOT_FOUND");
export const Conflict = (msg: string, code?: string) => new AppError(409, msg, code);
