//#region src/event-queue.d.ts
declare function createEventQueue<T>(processEvent: (event: T) => Promise<void>): {
  enqueue: (event: T) => void;
};
//#endregion
export { createEventQueue as t };
//# sourceMappingURL=event-queue2.d.mts.map