import { Logger } from '@n8n/backend-common';
import { CredentialResolverConfiguration, CredentialResolverHandle, ICredentialResolver } from '@n8n/decorators';
import { Cipher } from 'n8n-core';
import { ICredentialContext, ICredentialDataDecryptedObject } from 'n8n-workflow';
import { OAuth2TokenIntrospectionIdentifier } from './identifiers/oauth2-introspection-identifier';
import { OAuth2UserInfoIdentifier } from './identifiers/oauth2-userinfo-identifier';
import { DynamicCredentialEntryStorage } from './storage/dynamic-credential-entry-storage';
export declare class OAuthCredentialResolver implements ICredentialResolver {
    private readonly logger;
    private readonly oAuth2TokenIntrospectionIdentifier;
    private readonly oAuth2UserInfoIdentifier;
    private readonly storage;
    private readonly cipher;
    constructor(logger: Logger, oAuth2TokenIntrospectionIdentifier: OAuth2TokenIntrospectionIdentifier, oAuth2UserInfoIdentifier: OAuth2UserInfoIdentifier, storage: DynamicCredentialEntryStorage, cipher: Cipher);
    metadata: {
        name: string;
        description: string;
        displayName: string;
        options: ({
            displayName: string;
            name: string;
            type: "string";
            required: boolean;
            default: string;
            placeholder: string;
            description: string;
            options?: undefined;
            displayOptions?: undefined;
            typeOptions?: undefined;
        } | {
            displayName: string;
            name: string;
            type: "options";
            options: {
                name: string;
                value: string;
                description: string;
            }[];
            default: string;
            description: string;
            required?: undefined;
            placeholder?: undefined;
            displayOptions?: undefined;
            typeOptions?: undefined;
        } | {
            displayName: string;
            name: string;
            type: "string";
            default: string;
            description: string;
            displayOptions: {
                hide: {
                    validation: string[];
                };
                show: {
                    validation: string[];
                };
            };
            required?: undefined;
            placeholder?: undefined;
            options?: undefined;
            typeOptions?: undefined;
        } | {
            displayName: string;
            name: string;
            type: "string";
            default: string;
            typeOptions: {
                password: boolean;
            };
            description: string;
            displayOptions: {
                hide: {
                    validation: string[];
                };
                show: {
                    validation: string[];
                };
            };
            required?: undefined;
            placeholder?: undefined;
            options?: undefined;
        } | {
            displayName: string;
            name: string;
            type: "string";
            default: string;
            description: string;
            required?: undefined;
            placeholder?: undefined;
            options?: undefined;
            displayOptions?: undefined;
            typeOptions?: undefined;
        })[];
    };
    getSecret(credentialId: string, context: ICredentialContext, handle: CredentialResolverHandle): Promise<ICredentialDataDecryptedObject>;
    setSecret(credentialId: string, context: ICredentialContext, data: ICredentialDataDecryptedObject, handle: CredentialResolverHandle): Promise<void>;
    deleteSecret(credentialId: string, context: ICredentialContext, handle: CredentialResolverHandle): Promise<void>;
    deleteAllSecrets(handle: CredentialResolverHandle): Promise<void>;
    private parseOptions;
    validateOptions(options: CredentialResolverConfiguration): Promise<void>;
    private getIdentifier;
    private resolveIdentifier;
    validateIdentity(context: ICredentialContext, handle: CredentialResolverHandle): Promise<void>;
}
