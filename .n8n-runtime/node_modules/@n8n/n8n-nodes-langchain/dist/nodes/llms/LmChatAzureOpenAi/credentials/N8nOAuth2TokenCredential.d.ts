import type { TokenCredential, AccessToken } from '@azure/identity';
import type { INode } from 'n8n-workflow';
import type { AzureEntraCognitiveServicesOAuth2ApiCredential } from '../types';
export declare class N8nOAuth2TokenCredential implements TokenCredential {
    private node;
    private credential;
    constructor(node: INode, credential: AzureEntraCognitiveServicesOAuth2ApiCredential);
    getToken(): Promise<AccessToken | null>;
    getDeploymentDetails(): Promise<{
        apiVersion: string;
        endpoint: string;
        resourceName: string;
    }>;
}
