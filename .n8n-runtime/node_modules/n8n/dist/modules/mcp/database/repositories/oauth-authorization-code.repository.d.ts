import { DataSource, Repository } from '@n8n/typeorm';
import { AuthorizationCode } from '../entities/oauth-authorization-code.entity';
export declare class AuthorizationCodeRepository extends Repository<AuthorizationCode> {
    constructor(dataSource: DataSource);
}
