"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDateRangesCommonTableExpressionQuery = void 0;
exports.getDateRangesSelectQuery = getDateRangesSelectQuery;
const db_1 = require("@n8n/db");
const luxon_1 = require("luxon");
const getDateRangesCommonTableExpressionQuery = ({ startDate, endDate, dbType, }) => {
    let startDateTime = luxon_1.DateTime.fromJSDate(startDate).toUTC();
    let endDateTime = luxon_1.DateTime.fromJSDate(endDate).toUTC();
    const today = luxon_1.DateTime.now().toUTC();
    const isEndDateToday = endDateTime.hasSame(today, 'day');
    if (!isEndDateToday) {
        startDateTime = startDateTime.startOf('day');
        endDateTime = endDateTime.plus({ days: 1 }).startOf('day');
    }
    if (isEndDateToday && startDateTime.hasSame(endDateTime, 'day')) {
        startDateTime = startDateTime.startOf('day');
    }
    const prevStartDateTime = startDateTime.minus(endDateTime.diff(startDateTime));
    return getDateRangesSelectQuery({ dbType, prevStartDateTime, startDateTime, endDateTime });
};
exports.getDateRangesCommonTableExpressionQuery = getDateRangesCommonTableExpressionQuery;
function getDateRangesSelectQuery({ dbType, prevStartDateTime, startDateTime, endDateTime, }) {
    const prevStartStr = prevStartDateTime.toSQL({ includeZone: false, includeOffset: false });
    const startStr = startDateTime.toSQL({ includeZone: false, includeOffset: false });
    const endStr = endDateTime.toSQL({ includeZone: false, includeOffset: false });
    if (dbType === 'postgresdb') {
        return (0, db_1.sql) `SELECT
			CAST('${prevStartStr}' AS TIMESTAMP) AS prev_start_date,
			CAST('${startStr}' AS TIMESTAMP) AS start_date,
			CAST('${endStr}' AS TIMESTAMP) AS end_date
		`;
    }
    return (0, db_1.sql) `SELECT
			'${prevStartStr}' AS prev_start_date,
			'${startStr}' AS start_date,
			'${endStr}' AS end_date
	`;
}
//# sourceMappingURL=insights-by-period-query.helper.js.map