import type Sentry from '@sentry/node';
import type { Span, StartSpanOpts, Tracer } from './tracing';
export declare class SentryTracing implements Tracer {
    private readonly sentry;
    constructor(sentry: Pick<typeof Sentry, 'startSpan'>);
    startSpan<T>(options: StartSpanOpts, spanCb: (span: Span) => Promise<T>): Promise<T>;
}
