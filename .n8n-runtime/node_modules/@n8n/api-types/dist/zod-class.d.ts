import { z } from 'zod';
export interface ZodClass<T = unknown, Shape extends z.ZodRawShape = z.ZodRawShape> {
    new (data: T): T;
    schema: z.ZodObject<Shape>;
    safeParse(data: unknown): z.SafeParseReturnType<unknown, T>;
    parse(data: unknown): T;
    extend<U extends z.ZodRawShape>(shape: U): ZodClass<T & z.infer<z.ZodObject<U>>, Shape & U>;
}
export declare const Z: {
    class: <T extends z.ZodRawShape>(shape: T) => ZodClass<z.objectOutputType<T, z.ZodTypeAny>, T>;
};
