"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const di_1 = require("@n8n/di");
const permissions_1 = require("@n8n/permissions");
const typeorm_1 = require("@n8n/typeorm");
const entities_1 = require("../entities");
let UserRepository = class UserRepository extends typeorm_1.Repository {
    constructor(dataSource) {
        super(entities_1.User, dataSource.manager);
    }
    async findManyByIds(userIds, options) {
        return await this.find({
            where: { id: (0, typeorm_1.In)(userIds) },
            relations: options?.includeRole ? ['role'] : undefined,
        });
    }
    async findByApiKey(apiKey) {
        const keyOwner = await this.createQueryBuilder('user')
            .innerJoin(entities_1.ApiKey, 'apiKey', 'apiKey.userId = user.id')
            .leftJoinAndSelect('user.role', 'role')
            .leftJoinAndSelect('role.scopes', 'scopes')
            .where('apiKey.apiKey = :apiKey', { apiKey })
            .select(['user', 'role', 'scopes'])
            .getOne();
        return keyOwner;
    }
    async update(...args) {
        return await super.update(...args);
    }
    async deleteAllExcept(user) {
        await this.delete({ id: (0, typeorm_1.Not)(user.id) });
    }
    async getByIds(transaction, ids) {
        return await transaction.find(entities_1.User, { where: { id: (0, typeorm_1.In)(ids) } });
    }
    async findManyByEmail(emails) {
        return await this.find({
            where: { email: (0, typeorm_1.In)(emails) },
            select: ['email', 'password', 'id'],
        });
    }
    async deleteMany(userIds) {
        return await this.delete({ id: (0, typeorm_1.In)(userIds) });
    }
    async findNonShellUser(email) {
        return await this.findOne({
            where: {
                email,
                password: (0, typeorm_1.Not)((0, typeorm_1.IsNull)()),
            },
            relations: ['authIdentities', 'role'],
        });
    }
    async countUsersByRole() {
        const escapedRoleSlug = this.manager.connection.driver.escape('roleSlug');
        const rows = (await this.createQueryBuilder()
            .select([escapedRoleSlug, `COUNT(${escapedRoleSlug}) as count`])
            .groupBy(escapedRoleSlug)
            .execute());
        return rows.reduce((acc, row) => {
            acc[row.roleSlug] = parseInt(row.count, 10);
            return acc;
        }, {});
    }
    async getEmailsByIds(userIds) {
        return await this.find({
            select: ['id', 'email'],
            where: { id: (0, typeorm_1.In)(userIds), password: (0, typeorm_1.Not)((0, typeorm_1.IsNull)()) },
        });
    }
    async createUserWithProject(user, transactionManager) {
        const createInner = async (entityManager) => {
            const newUser = entityManager.create(entities_1.User, user);
            const savedUser = await entityManager.save(newUser);
            const userWithRole = await entityManager.findOne(entities_1.User, {
                where: { id: savedUser.id },
                relations: ['role'],
            });
            if (!userWithRole)
                throw new Error('Failed to create user!');
            const savedProject = await entityManager.save(entityManager.create(entities_1.Project, {
                type: 'personal',
                name: userWithRole.createPersonalProjectName(),
                creatorId: savedUser.id,
            }));
            await entityManager.save(entityManager.create(entities_1.ProjectRelation, {
                projectId: savedProject.id,
                userId: savedUser.id,
                role: {
                    slug: userWithRole.role.slug !== 'global:chatUser'
                        ? permissions_1.PROJECT_OWNER_ROLE_SLUG
                        : permissions_1.PROJECT_VIEWER_ROLE_SLUG,
                },
            }));
            return { user: userWithRole, project: savedProject };
        };
        if (transactionManager) {
            return await createInner(transactionManager);
        }
        return await createInner(this.manager);
    }
    async findPersonalOwnerForWorkflow(workflowId) {
        return await this.findOne({
            where: {
                projectRelations: {
                    role: { slug: (0, typeorm_1.In)([permissions_1.PROJECT_OWNER_ROLE_SLUG, permissions_1.PROJECT_VIEWER_ROLE_SLUG]) },
                    project: {
                        type: 'personal',
                        creatorId: (0, typeorm_1.Not)((0, typeorm_1.IsNull)()),
                        sharedWorkflows: { workflowId, role: 'workflow:owner' },
                    },
                },
            },
            relations: ['role'],
        });
    }
    async findPersonalOwnerForProject(projectId) {
        return await this.findOne({
            where: {
                projectRelations: {
                    role: { slug: (0, typeorm_1.In)([permissions_1.PROJECT_OWNER_ROLE_SLUG, permissions_1.PROJECT_VIEWER_ROLE_SLUG]) },
                    projectId,
                    project: { type: 'personal', creatorId: (0, typeorm_1.Not)((0, typeorm_1.IsNull)()) },
                },
            },
            relations: ['role'],
        });
    }
    applyUserListSelect(queryBuilder, select) {
        if (select !== undefined) {
            if (!select.includes('id')) {
                select.unshift('id');
            }
            queryBuilder.select(select.map((field) => `user.${field}`));
        }
        return queryBuilder;
    }
    applyUserListFilter(queryBuilder, filter) {
        if (filter?.email !== undefined) {
            queryBuilder.andWhere('user.email = :email', {
                email: filter.email,
            });
        }
        if (filter?.firstName !== undefined) {
            queryBuilder.andWhere('user.firstName = :firstName', {
                firstName: filter.firstName,
            });
        }
        if (filter?.lastName !== undefined) {
            queryBuilder.andWhere('user.lastName = :lastName', {
                lastName: filter.lastName,
            });
        }
        if (filter?.mfaEnabled !== undefined) {
            queryBuilder.andWhere('user.mfaEnabled = :mfaEnabled', {
                mfaEnabled: filter.mfaEnabled,
            });
        }
        if (filter?.isOwner !== undefined) {
            if (filter.isOwner) {
                queryBuilder.andWhere('user.role = :role', {
                    role: 'global:owner',
                });
            }
            else {
                queryBuilder.andWhere('user.role <> :role', {
                    role: 'global:owner',
                });
            }
        }
        if (filter?.ids !== undefined && filter.ids.length > 0) {
            queryBuilder.andWhere('user.id IN (:...ids)', {
                ids: filter.ids,
            });
        }
        if (filter?.isPending !== undefined) {
            if (filter.isPending) {
                queryBuilder.andWhere('user.password IS NULL AND user.role <> :ownerRole', {
                    ownerRole: 'global:owner',
                });
            }
            else {
                queryBuilder.andWhere('user.password IS NOT NULL');
            }
        }
        if (filter?.fullText !== undefined) {
            const fullTextFilter = `%${filter.fullText}%`;
            queryBuilder.andWhere(new typeorm_1.Brackets((qb) => {
                qb.where('LOWER(user.firstName) like LOWER(:firstNameFullText)', {
                    firstNameFullText: fullTextFilter,
                })
                    .orWhere('LOWER(user.lastName) like LOWER(:lastNameFullText)', {
                    lastNameFullText: fullTextFilter,
                })
                    .orWhere('LOWER(user.email) like LOWER(:email)', {
                    email: fullTextFilter,
                });
            }));
        }
        return queryBuilder;
    }
    applyUserListExpand(queryBuilder, expand) {
        if (expand?.includes('projectRelations')) {
            queryBuilder
                .leftJoinAndSelect('user.projectRelations', 'projectRelations', 'projectRelations.role <> :projectRole', { projectRole: permissions_1.PROJECT_OWNER_ROLE_SLUG })
                .leftJoinAndSelect('projectRelations.project', 'project')
                .leftJoinAndSelect('projectRelations.role', 'projectRole');
        }
        return queryBuilder;
    }
    applyUserListSort(queryBuilder, sortBy) {
        if (sortBy) {
            for (const sort of sortBy) {
                const [field, order] = sort.split(':');
                if (field === 'role') {
                    queryBuilder.addSelect("CASE WHEN user.role='global:owner' THEN 0 WHEN user.role='global:admin' THEN 1 ELSE 2 END", 'userroleorder');
                    queryBuilder.addOrderBy('userroleorder', order.toUpperCase());
                }
                else {
                    queryBuilder.addOrderBy(`user.${field}`, order.toUpperCase());
                }
            }
        }
        return queryBuilder;
    }
    applyUserListPagination(queryBuilder, take, skip) {
        if (take >= 0)
            queryBuilder.take(take);
        if (skip)
            queryBuilder.skip(skip);
        return queryBuilder;
    }
    buildUserQuery(listQueryOptions) {
        const queryBuilder = this.createQueryBuilder('user');
        queryBuilder.leftJoinAndSelect('user.authIdentities', 'authIdentities');
        if (listQueryOptions === undefined) {
            return queryBuilder;
        }
        const { filter, select, take, skip, expand, sortBy } = listQueryOptions;
        this.applyUserListSelect(queryBuilder, select);
        this.applyUserListFilter(queryBuilder, filter);
        this.applyUserListExpand(queryBuilder, expand);
        this.applyUserListPagination(queryBuilder, take, skip);
        this.applyUserListSort(queryBuilder, sortBy);
        queryBuilder.leftJoinAndSelect('user.role', 'role');
        return queryBuilder;
    }
};
exports.UserRepository = UserRepository;
exports.UserRepository = UserRepository = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], UserRepository);
//# sourceMappingURL=user.repository.js.map