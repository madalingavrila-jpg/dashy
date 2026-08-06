"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddAudienceColumnToApiKeys1758731786132 = void 0;
class AddAudienceColumnToApiKeys1758731786132 {
    async up({ schemaBuilder: { addColumns, column } }) {
        await addColumns('user_api_keys', [
            column('audience').varchar().notNull.default("'public-api'"),
        ]);
    }
    async down({ schemaBuilder: { dropColumns } }) {
        await dropColumns('user_api_keys', ['audience']);
    }
}
exports.AddAudienceColumnToApiKeys1758731786132 = AddAudienceColumnToApiKeys1758731786132;
//# sourceMappingURL=1758731786132-AddAudienceColumnToApiKey.js.map