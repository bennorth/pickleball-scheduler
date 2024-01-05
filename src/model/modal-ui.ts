import { Action, Computed, action, computed } from "easy-peasy";
import { PersonId } from "./player-pool";

type NonTrivialModal =
  | { kind: "edit-person-name"; personId: PersonId }
  | { kind: "verify-delete-person"; personId: PersonId };

export type ActiveModal = { kind: "none" } | NonTrivialModal;

const noActiveModal = { kind: "none" as const };

export type ModalUiState = {
  activeModal: ActiveModal;
  mTargetPersonId: Computed<ModalUiState, PersonId | undefined>;
  cancel: Action<ModalUiState, void>;

  activateEditPersonName: Action<ModalUiState, PersonId>;
  activateVerifyDeletePerson: Action<ModalUiState, PersonId>;
};

export let modalUiState: ModalUiState = {
  activeModal: noActiveModal,
  mTargetPersonId: computed((s) =>
    s.activeModal.kind === "none" ? undefined : s.activeModal.personId
  ),
  cancel: action((s) => {
    s.activeModal = noActiveModal;
  }),
  activateEditPersonName: action((s, personId) => {
    s.activeModal = { kind: "edit-person-name", personId };
  }),
  activateVerifyDeletePerson: action((s, personId) => {
    s.activeModal = { kind: "verify-delete-person", personId };
  }),
};
