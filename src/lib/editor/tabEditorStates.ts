import type { EditorState } from "@codemirror/state";

/** 各 Tab 的 CM EditorState（保留撤销栈 / 选区 / 滚动） */
const stateByTab = new Map<string, EditorState>();

export function getTabEditorState(tabId: string): EditorState | undefined {
  return stateByTab.get(tabId);
}

export function setTabEditorState(tabId: string, state: EditorState): void {
  stateByTab.set(tabId, state);
}

export function discardTabEditorState(tabId: string): void {
  stateByTab.delete(tabId);
}

export function clearAllTabEditorStates(): void {
  stateByTab.clear();
}
