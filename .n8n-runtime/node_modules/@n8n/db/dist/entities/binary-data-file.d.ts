import { z } from 'zod';
import { WithTimestamps } from './abstract-entity';
export declare const SourceTypeSchema: z.ZodEnum<["execution", "chat_message_attachment"]>;
export type SourceType = z.infer<typeof SourceTypeSchema>;
export declare class BinaryDataFile extends WithTimestamps {
    fileId: string;
    sourceType: SourceType;
    sourceId: string;
    data: Buffer;
    mimeType: string | null;
    fileName: string | null;
    fileSize: number;
}
