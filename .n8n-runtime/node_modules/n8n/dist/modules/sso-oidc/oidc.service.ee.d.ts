import { OidcConfigDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { AuthIdentityRepository, SettingsRepository, type User, UserRepository } from '@n8n/db';
import { Cipher, InstanceSettings } from 'n8n-core';
import { ProvisioningService } from '../../modules/provisioning.ee/provisioning.service.ee';
import { JwtService } from '../../services/jwt.service';
import { UrlService } from '../../services/url.service';
type OidcRuntimeConfig = Pick<OidcConfigDto, 'clientId' | 'clientSecret' | 'loginEnabled' | 'prompt' | 'authenticationContextClassReference'> & {
    discoveryEndpoint: URL;
};
export declare class OidcService {
    private readonly settingsRepository;
    private readonly authIdentityRepository;
    private readonly urlService;
    private readonly globalConfig;
    private readonly userRepository;
    private readonly cipher;
    private readonly logger;
    private readonly jwtService;
    private readonly instanceSettings;
    private readonly provisioningService;
    private oidcConfig;
    private openidClient;
    constructor(settingsRepository: SettingsRepository, authIdentityRepository: AuthIdentityRepository, urlService: UrlService, globalConfig: GlobalConfig, userRepository: UserRepository, cipher: Cipher, logger: Logger, jwtService: JwtService, instanceSettings: InstanceSettings, provisioningService: ProvisioningService);
    init(): Promise<void>;
    private loadOpenIdClient;
    getCallbackUrl(): string;
    getRedactedConfig(): OidcConfigDto;
    generateState(): {
        signed: string;
        plaintext: string;
    };
    verifyState(signedState: string): string;
    generateNonce(): {
        signed: string;
        plaintext: string;
    };
    verifyNonce(signedNonce: string): string;
    generateLoginUrl(): Promise<{
        url: URL;
        state: string;
        nonce: string;
    }>;
    loginUser(callbackUrl: URL, storedState: string, storedNonce: string): Promise<User>;
    private applySsoProvisioning;
    private broadcastReloadOIDCConfigurationCommand;
    private isReloading;
    reload(): Promise<void>;
    loadConfigurationFromDatabase(decryptSecret?: boolean): Promise<OidcRuntimeConfig | undefined>;
    loadConfig(decryptSecret?: boolean): Promise<OidcRuntimeConfig>;
    updateConfig(newConfig: OidcConfigDto): Promise<void>;
    private setOidcLoginEnabled;
    private cachedOidcConfiguration;
    private createProxyAwareConfiguration;
    private getOidcConfiguration;
}
export {};
