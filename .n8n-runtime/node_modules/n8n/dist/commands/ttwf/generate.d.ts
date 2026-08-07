import { z } from 'zod';
import { BaseCommand } from '../base-command';
declare const flagsSchema: z.ZodObject<{
    prompt: z.ZodOptional<z.ZodString>;
    input: z.ZodOptional<z.ZodString>;
    output: z.ZodDefault<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    concurrency: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    output: string;
    limit: number;
    concurrency: number;
    input?: string | undefined;
    prompt?: string | undefined;
}, {
    output?: string | undefined;
    input?: string | undefined;
    limit?: number | undefined;
    concurrency?: number | undefined;
    prompt?: string | undefined;
}>;
export declare class TTWFGenerateCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
    run(): Promise<void>;
    catch(error: Error): Promise<void>;
}
export {};
