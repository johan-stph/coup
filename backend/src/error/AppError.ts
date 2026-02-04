export default class AppError extends Error {
  status: number;
  requestedUrl: string;

  constructor(message: string, status: number, requestedUrl: string) {
    super(message);
    this.status = status;
    this.requestedUrl = requestedUrl;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}