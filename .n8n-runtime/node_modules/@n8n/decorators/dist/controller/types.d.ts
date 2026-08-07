import type { BooleanLicenseFeature } from '@n8n/constants';
import type { Constructable } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import type { RequestHandler, Router } from 'express';
import type { KeyedRateLimiterConfig, RateLimiterLimits } from './rate-limit';
export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';
export type Arg = {
    type: 'body' | 'query';
} | {
    type: 'param';
    key: string;
};
export interface CorsOptions {
    allowedOrigins: string[];
    allowedMethods: Method[];
    allowedHeaders: string[];
    allowCredentials?: boolean;
    maxAge?: number;
}
export type HandlerName = string;
export interface AccessScope {
    scope: Scope;
    globalOnly: boolean;
}
export interface RouteMetadata {
    method: Method;
    path: string;
    middlewares: RequestHandler[];
    usesTemplates: boolean;
    skipAuth: boolean;
    allowSkipPreviewAuth: boolean;
    allowSkipMFA: boolean;
    allowUnauthenticated: boolean;
    apiKeyAuth: boolean;
    cors?: Partial<CorsOptions> | true;
    ipRateLimit?: boolean | RateLimiterLimits;
    keyedRateLimit?: KeyedRateLimiterConfig;
    licenseFeature?: BooleanLicenseFeature;
    accessScope?: AccessScope;
    args: Arg[];
    router?: Router;
}
export type StaticRouterMetadata = {
    path: string;
    router: Router;
} & Partial<Pick<RouteMetadata, 'skipAuth' | 'allowSkipPreviewAuth' | 'allowSkipMFA' | 'middlewares' | 'ipRateLimit' | 'keyedRateLimit' | 'licenseFeature' | 'accessScope'>>;
export interface ControllerMetadata {
    basePath: `/${string}`;
    registerOnRootPath?: boolean;
    middlewares: HandlerName[];
    routes: Map<HandlerName, RouteMetadata>;
}
export type Controller = Constructable<object> & Record<HandlerName, (...args: unknown[]) => Promise<unknown>>;
