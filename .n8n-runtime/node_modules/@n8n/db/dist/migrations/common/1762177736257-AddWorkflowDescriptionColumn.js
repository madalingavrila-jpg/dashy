"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddWorkflowDescriptionColumn1762177736257 = void 0;
class AddWorkflowDescriptionColumn1762177736257 {
    async up({ schemaBuilder: { addColumns, column } }) {
        await addColumns('workflow_entity', [column('description').text]);
    }
    async down({ schemaBuilder: { dropColumns } }) {
        await dropColumns('workflow_entity', ['description']);
    }
}
exports.AddWorkflowDescriptionColumn1762177736257 = AddWorkflowDescriptionColumn1762177736257;
//# sourceMappingURL=1762177736257-AddWorkflowDescriptionColumn.js.map