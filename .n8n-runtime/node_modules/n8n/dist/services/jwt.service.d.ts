import { GlobalConfig } from '@n8n/config';
import jwt from 'jsonwebtoken';
import { InstanceSettings } from 'n8n-core';
export declare class JwtService {
    jwtSecret: string;
    constructor({ encryptionKey }: InstanceSettings, globalConfig: GlobalConfig);
    sign(payload: object, options?: jwt.SignOptions): string;
    decode<T = JwtPayload>(token: string): T;
    verify<T = JwtPayload>(token: string, options?: jwt.VerifyOptions): T;
}
export type JwtPayload = jwt.JwtPayload;
