"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatRecommendation = formatRecommendation;
const builder_1 = require("../../../../prompts/builder");
function formatRecommendation(rec) {
    const builder = (0, builder_1.prompt)()
        .section('default_node', rec.defaultNode)
        .section('operations', rec.operations.map((op) => `- ${op}`).join('\n'))
        .section('reasoning', rec.reasoning);
    if (rec.connectedNodes && rec.connectedNodes.length > 0) {
        const connectedContent = rec.connectedNodes
            .map((cn) => {
            const desc = cn.description ? ` - ${cn.description}` : '';
            return `- ${cn.nodeType} (connection: ${cn.connectionType})${desc}`;
        })
            .join('\n');
        builder.section('connected_nodes', connectedContent);
    }
    if (rec.note) {
        builder.section('note', rec.note);
    }
    return builder.build();
}
//# sourceMappingURL=format-recommendation.js.map