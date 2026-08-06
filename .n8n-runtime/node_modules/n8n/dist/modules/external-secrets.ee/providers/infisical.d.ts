import { type IDataObject, type INodeProperties } from 'n8n-workflow';
import { SecretsProvider } from '../types';
import type { SecretsProviderSettings } from '../types';
export interface InfisicalSettings {
    token: string;
    siteURL: string;
    cacheTTL: number;
    debug: boolean;
}
export declare class InfisicalProvider extends SecretsProvider {
    properties: INodeProperties[];
    displayName: string;
    name: string;
    private cachedSecrets;
    private client;
    private settings;
    private environment;
    init(settings: SecretsProviderSettings): Promise<void>;
    update(): Promise<void>;
    protected doConnect(): Promise<void>;
    getEnvironment(): Promise<string>;
    test(): Promise<[boolean] | [boolean, string]>;
    disconnect(): Promise<void>;
    getSecret(name: string): IDataObject;
    getSecretNames(): string[];
    hasSecret(name: string): boolean;
}
