import type { OAuth2CredentialData } from '@n8n/client-oauth2';
export interface AzureOpenAIConfig {
    apiVersion: string;
    resourceName: string;
    endpoint?: string;
}
export interface AzureOpenAIApiKeyConfig extends AzureOpenAIConfig {
    apiKey: string;
}
export interface AzureOpenAIOptions {
    frequencyPenalty?: number;
    maxTokens?: number;
    maxRetries?: number;
    timeout?: number;
    presencePenalty?: number;
    temperature?: number;
    topP?: number;
    responseFormat?: 'text' | 'json_object';
}
export interface AzureOpenAIBaseModelConfig {
    azureOpenAIApiInstanceName: string;
    azureOpenAIApiVersion: string;
    azureOpenAIEndpoint?: string;
}
export interface AzureOpenAIApiKeyModelConfig extends AzureOpenAIBaseModelConfig {
    azureOpenAIApiKey: string;
    azureADTokenProvider?: undefined;
}
export interface AzureOpenAIOAuth2ModelConfig extends AzureOpenAIBaseModelConfig {
    azureOpenAIApiKey?: undefined;
    azureADTokenProvider: () => Promise<string>;
}
export declare const enum AuthenticationType {
    ApiKey = "azureOpenAiApi",
    EntraOAuth2 = "azureEntraCognitiveServicesOAuth2Api"
}
export declare const enum AzureOpenAIErrorType {
    AuthenticationError = "AuthenticationError",
    ConfigurationError = "ConfigurationError",
    APIError = "APIError",
    UnknownError = "UnknownError"
}
type TokenData = OAuth2CredentialData['oauthTokenData'] & {
    expires_on: number;
    ext_expires_on: number;
};
export type AzureEntraCognitiveServicesOAuth2ApiCredential = OAuth2CredentialData & {
    customScopes: boolean;
    authentication: string;
    apiVersion: string;
    endpoint: string;
    resourceName: string;
    tenantId: string;
    oauthTokenData: TokenData;
};
export {};
