import { Compartment, type Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { spellcheckExtension } from "@/lib/editor/spellcheck";

export function createSpellcheckCompartment() {
  const compartment = new Compartment();
  return {
    initial(enabled: boolean): Extension {
      return compartment.of(spellcheckExtension(enabled));
    },
    setEnabled(view: EditorView, enabled: boolean) {
      view.dispatch({
        effects: compartment.reconfigure(spellcheckExtension(enabled)),
      });
    },
  };
}
