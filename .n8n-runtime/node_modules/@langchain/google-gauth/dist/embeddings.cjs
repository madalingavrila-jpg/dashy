const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const require_auth = require('./auth.cjs');
const __langchain_google_common = require_rolldown_runtime.__toESM(require("@langchain/google-common"));

//#region src/embeddings.ts
/**
* Integration with an Google embeddings model.
*/
var GoogleEmbeddings = class extends __langchain_google_common.BaseGoogleEmbeddings {
	static lc_name() {
		return "GoogleEmbeddings";
	}
	lc_serializable = true;
	constructor(fields) {
		super(fields);
	}
	buildAbstractedClient(fields) {
		return new require_auth.GAuthClient(fields);
	}
};

//#endregion
exports.GoogleEmbeddings = GoogleEmbeddings;
//# sourceMappingURL=embeddings.cjs.map