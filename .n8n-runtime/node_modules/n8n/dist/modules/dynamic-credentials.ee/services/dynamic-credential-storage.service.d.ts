import { Logger } from '@n8n/backend-common';
import { Cipher } from 'n8n-core';
import { type ICredentialContext, type ICredentialDataDecryptedObject, type IWorkflowSettings } from 'n8n-workflow';
import { DynamicCredentialResolverRegistry } from './credential-resolver-registry.service';
import { DynamicCredentialResolverRepository } from '../database/repositories/credential-resolver.repository';
import type { CredentialStoreMetadata, IDynamicCredentialStorageProvider } from '../../../credentials/dynamic-credential-storage.interface';
import { LoadNodesAndCredentials } from '../../../load-nodes-and-credentials';
export declare class DynamicCredentialStorageService implements IDynamicCredentialStorageProvider {
    private readonly resolverRegistry;
    private readonly resolverRepository;
    private readonly loadNodesAndCredentials;
    private readonly cipher;
    private readonly logger;
    constructor(resolverRegistry: DynamicCredentialResolverRegistry, resolverRepository: DynamicCredentialResolverRepository, loadNodesAndCredentials: LoadNodesAndCredentials, cipher: Cipher, logger: Logger);
    storeIfNeeded(credentialStoreMetadata: CredentialStoreMetadata, dynamicData: ICredentialDataDecryptedObject, credentialContext: ICredentialContext, staticData?: ICredentialDataDecryptedObject, workflowSettings?: IWorkflowSettings): Promise<void>;
    private handleNoResolver;
    private handleMissingResolver;
}
