import { Tool } from "@langchain/core/tools";

//#region src/tools/calculator.d.ts
declare class Calculator extends Tool {
  static lc_name(): string;
  get lc_namespace(): string[];
  name: string;
  /** @ignore */
  _call(input: string): Promise<string>;
  description: string;
}
//#endregion
export { Calculator, calculator_d_exports };
//# sourceMappingURL=calculator.d.cts.map