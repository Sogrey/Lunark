import { Compartment, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

/** 打字机：扩大 scrollMargins + 输入/选区变化时把光标滚到视口中部 */
export function typewriterScrollExtension(enabled: boolean): Extension {
  if (!enabled) return [];
  return [
    EditorView.scrollMargins.of((view) => {
      const half = Math.floor(view.scrollDOM.clientHeight / 2);
      return { top: half, bottom: half };
    }),
    EditorView.updateListener.of((update) => {
      if (!update.selectionSet && !update.docChanged) return;
      const head = update.state.selection.main.head;
      requestAnimationFrame(() => {
        const view = update.view;
        const coords = view.coordsAtPos(head);
        if (!coords) return;
        const scroll = view.scrollDOM;
        const rect = scroll.getBoundingClientRect();
        const caretY = coords.top - rect.top + scroll.scrollTop;
        scroll.scrollTop = caretY - scroll.clientHeight / 2;
      });
    }),
  ];
}

export function createTypewriterCompartment(): {
  compartment: Compartment;
  setEnabled: (view: EditorView, enabled: boolean) => void;
  initial: (enabled: boolean) => Extension;
} {
  const compartment = new Compartment();
  return {
    compartment,
    initial: (enabled) => compartment.of(typewriterScrollExtension(enabled)),
    setEnabled: (view, enabled) => {
      view.dispatch({
        effects: compartment.reconfigure(typewriterScrollExtension(enabled)),
      });
    },
  };
}
