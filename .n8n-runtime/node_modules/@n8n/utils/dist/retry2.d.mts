//#region src/retry.d.ts
type RetryFn = () => boolean | Promise<boolean>;
declare function retry(fn: RetryFn, interval?: number, maxRetries?: number, backoff?: 'exponential' | 'linear' | null): Promise<boolean>;
//#endregion
export { retry as t };
//# sourceMappingURL=retry2.d.mts.map