import { GAuthClient } from "./auth.js";
import { ChatGoogleBase } from "@langchain/google-common";

//#region src/chat_models.ts
/**
* Integration with a Google chat model.
*/
var ChatGoogle = class extends ChatGoogleBase {
	static lc_name() {
		return "ChatGoogle";
	}
	constructor(fields) {
		super(fields);
	}
	buildAbstractedClient(fields) {
		return new GAuthClient(fields);
	}
};

//#endregion
export { ChatGoogle };
//# sourceMappingURL=chat_models.js.map