const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const __langchain_google_gauth = require_rolldown_runtime.__toESM(require("@langchain/google-gauth"));

//#region src/embeddings.ts
/**
* Integration with a Google Vertex AI embeddings model using
* the "@langchain/google-gauth" package for auth.
*/
var VertexAIEmbeddings = class extends __langchain_google_gauth.GoogleEmbeddings {
	static lc_name() {
		return "VertexAIEmbeddings";
	}
	constructor(fields) {
		super({
			...fields,
			platformType: "gcp"
		});
	}
};

//#endregion
exports.VertexAIEmbeddings = VertexAIEmbeddings;
//# sourceMappingURL=embeddings.cjs.map