export interface ErrorLike {
    message?: string;
    description?: string;
}
export interface ErrorContext {
    modelName?: string;
}
export declare function makeErrorFromStatus(statusCode: number, context?: ErrorContext): ErrorLike;
