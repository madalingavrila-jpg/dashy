const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const require_auth = require('./auth.cjs');
const __langchain_google_common = require_rolldown_runtime.__toESM(require("@langchain/google-common"));

//#region src/llms.ts
/**
* Integration with a Google LLM.
*/
var GoogleLLM = class extends __langchain_google_common.GoogleBaseLLM {
	static lc_name() {
		return "GoogleLLM";
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
exports.GoogleLLM = GoogleLLM;
//# sourceMappingURL=llms.cjs.map