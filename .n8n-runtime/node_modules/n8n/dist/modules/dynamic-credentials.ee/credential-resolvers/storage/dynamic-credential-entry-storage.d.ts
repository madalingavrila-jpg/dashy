import { ICredentialEntriesStorage } from './storage-interface';
import { DynamicCredentialEntryRepository } from '../../database/repositories/dynamic-credential-entry.repository';
import { CredentialResolverHandle } from '@n8n/decorators';
export declare class DynamicCredentialEntryStorage implements ICredentialEntriesStorage {
    private readonly dynamicCredentialEntryRepository;
    constructor(dynamicCredentialEntryRepository: DynamicCredentialEntryRepository);
    getCredentialData(credentialId: string, subjectId: string, resolverId: string, _: Record<string, unknown>): Promise<string | null>;
    setCredentialData(credentialId: string, subjectId: string, resolverId: string, data: string, _: Record<string, unknown>): Promise<void>;
    deleteCredentialData(credentialId: string, subjectId: string, resolverId: string, _: Record<string, unknown>): Promise<void>;
    deleteAllCredentialData(handle: CredentialResolverHandle): Promise<void>;
}
