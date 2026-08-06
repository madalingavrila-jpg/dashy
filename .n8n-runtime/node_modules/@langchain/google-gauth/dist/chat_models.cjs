const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const require_auth = require('./auth.cjs');
const __langchain_google_common = require_rolldown_runtime.__toESM(require("@langchain/google-common"));

//#region src/chat_models.ts
/**
* Integration with a Google chat model.
*/
var ChatGoogle = class extends __langchain_google_common.ChatGoogleBase {
	static lc_name() {
		return "ChatGoogle";
	}
	constructor(fields) {
		super(fields);
	}
	buildAbstractedClient(fields) {
		return new require_auth.GAuthClient(fields);
	}
};

//#endregion
exports.ChatGoogle = ChatGoogle;
//# sourceMappingURL=chat_models.cjs.map