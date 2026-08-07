import { Logger } from '@n8n/backend-common';
import type { INodeProperties } from 'n8n-workflow';
import { SecretsProvider } from '../types';
import type { SecretsProviderSettings } from '../types';
export type AwsSecretsManagerContext = SecretsProviderSettings<{
    region: string;
} & ({
    authMethod: 'iamUser';
    accessKeyId: string;
    secretAccessKey: string;
} | {
    authMethod: 'autoDetect';
})>;
export declare class AwsSecretsManager extends SecretsProvider {
    private readonly logger;
    name: string;
    displayName: string;
    properties: INodeProperties[];
    private cachedSecrets;
    private client;
    constructor(logger?: Logger);
    init(context: AwsSecretsManagerContext): Promise<void>;
    test(): Promise<[boolean] | [boolean, string]>;
    protected doConnect(): Promise<void>;
    disconnect(): Promise<void>;
    update(): Promise<void>;
    getSecret(name: string): string;
    hasSecret(name: string): boolean;
    getSecretNames(): string[];
    private assertAuthType;
    private fetchAllSecretsNames;
    private fetchAllSecrets;
    private batch;
}
