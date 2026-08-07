"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const di_1 = require("@n8n/di");
const typeorm_1 = require("@n8n/typeorm");
const index_1 = require("../index");
const migration_helpers_1 = require("./migration-helpers");
describe('Migration Helpers', () => {
    let dataSource;
    beforeEach(async () => {
        const dbConnection = di_1.Container.get(index_1.DbConnection);
        await dbConnection.init();
        dataSource = di_1.Container.get(typeorm_1.DataSource);
    });
    afterEach(async () => {
        const dbConnection = di_1.Container.get(index_1.DbConnection);
        await dbConnection.close();
    });
    describe('copyTable', () => {
        it('should put OFFSET after LIMIT in INSERT statement for sqlite support', async () => {
            const testTableName = 'test_copy_source';
            const destTableName = 'test_copy_dest';
            const rowCount = 25;
            await dataSource.query(`DROP TABLE IF EXISTS ${testTableName}`);
            await dataSource.query(`DROP TABLE IF EXISTS ${destTableName}`);
            await dataSource.query(`
				CREATE TABLE ${testTableName} (
					id INTEGER PRIMARY KEY,
					value TEXT
				)
			`);
            for (let i = 1; i <= rowCount; i++) {
                await dataSource.query(`INSERT INTO ${testTableName} (id, value) VALUES (?, ?)`, [
                    i,
                    `value_${i}`,
                ]);
            }
            await dataSource.query(`
				CREATE TABLE ${destTableName} (
					id INTEGER PRIMARY KEY,
					value TEXT
				)
			`);
            const queryRunner = dataSource.createQueryRunner();
            const querySpy = jest.spyOn(queryRunner, 'query');
            await (0, migration_helpers_1.copyTable)(queryRunner, '', testTableName, destTableName);
            const insertCalls = querySpy.mock.calls.filter(([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO'));
            expect(insertCalls.length).toBe(3);
            const { driver } = queryRunner.connection;
            const escapedSource = driver.escape('test_copy_source');
            const escapedDest = driver.escape('test_copy_dest');
            const firstBatchQuery = insertCalls[0][0];
            expect(firstBatchQuery).toBe(`INSERT INTO ${escapedDest}  SELECT * FROM ${escapedSource} LIMIT 10`);
            const secondBatchQuery = insertCalls[1][0];
            expect(secondBatchQuery).toBe(`INSERT INTO ${escapedDest}  SELECT * FROM ${escapedSource} LIMIT 10 OFFSET 10`);
            const thirdBatchQuery = insertCalls[2][0];
            expect(thirdBatchQuery).toBe(`INSERT INTO ${escapedDest}  SELECT * FROM ${escapedSource} LIMIT 10 OFFSET 20`);
            querySpy.mockRestore();
            await queryRunner.release();
            await dataSource.query(`DROP TABLE ${testTableName}`);
            await dataSource.query(`DROP TABLE ${destTableName}`);
        });
    });
});
//# sourceMappingURL=migration-helpers.test.js.map