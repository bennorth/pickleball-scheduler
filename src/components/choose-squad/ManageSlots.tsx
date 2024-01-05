import { createContext, useContext, useEffect, useState } from "react";
import { ActiveModal, ModalUiState } from "../../model/modal-ui";
import { PersonId } from "../../model/player-pool";
import { useStoreActions, useStoreState } from "../../store";
import { useLoadedValue } from "../hooks";
import { AddMemberCard } from "./AddSlot";
import { Alert, Button, Form } from "react-bootstrap";
import { Actions } from "easy-peasy";
import classNames from "classnames";
import { ignoreValue, submitOnEnterKeyFun } from "../../utils";

type PersonCardContextT = {
  activeModal: ActiveModal;
  activateEditPersonName: (personId: PersonId) => void;
  activateVerifyDeletePerson: (personId: PersonId) => void;
  cancelModal: () => void;
  editPersonName: (personId: PersonId, newName: string) => void;
  deletePerson: (personId: PersonId) => void;
};
const PersonCardContext = createContext<PersonCardContextT | undefined>(
  undefined
);
function usePersonCardContext() {
  const mContext = useContext(PersonCardContext);
  if (mContext == null) {
    throw new Error("PersonCardContext has not been set");
  }
  return mContext;
}

type PersonCardProps = { idx: number; name: string };

function PersonCardDisplay({ idx, name }: PersonCardProps) {
  const ctx = usePersonCardContext();
  return (
    <>
      <div className="name">{name}</div>
      <div className="controls">
        <Button onClick={() => ctx.activateEditPersonName(idx)}>EDIT</Button>
        <Button
          onClick={() => ctx.activateVerifyDeletePerson(idx)}
          variant="danger"
        >
          DELETE
        </Button>
      </div>
    </>
  );
}

function PersonCardEditName({ idx, name }: PersonCardProps) {
  const ctx = usePersonCardContext();
  const [newName, setNewName] = useState(name);
  const doEdit = () => {
    ctx.cancelModal();
    ctx.editPersonName(idx, newName);
  };
  const onKeyDown = submitOnEnterKeyFun(doEdit, name !== "");
  return (
    <>
      <div className="name">
        <Form.Control
          type="text"
          value={newName}
          onChange={(evt) => {
            setNewName(evt.target.value);
          }}
          onKeyDown={onKeyDown}
        />
        <Button onClick={() => ctx.cancelModal()}>Cancel</Button>
        <Button onClick={doEdit} variant="success">
          OK
        </Button>
      </div>
    </>
  );
}

function PersonCardVerifyDelete({ idx, name }: PersonCardProps) {
  const ctx = usePersonCardContext();
  const doDelete = () => {
    ctx.cancelModal();
    ctx.deletePerson(idx);
  };
  return (
    <>
      <div className="name">
        <span>
          <Button onClick={doDelete} variant="danger">
            DELETE
          </Button>
          <span className="verify-delete-person">{name}</span>
        </span>
        <Button onClick={() => ctx.cancelModal()}>Cancel</Button>
      </div>
    </>
  );
}

function PersonCard(props: PersonCardProps) {
  const ctx = usePersonCardContext();

  const content = (() => {
    switch (ctx.activeModal.kind) {
      case "none":
        return <PersonCardDisplay {...props} />;
      case "edit-person-name":
        return ctx.activeModal.personId === props.idx ? (
          <PersonCardEditName {...props} />
        ) : (
          <PersonCardDisplay {...props} />
        );
      case "verify-delete-person":
        return ctx.activeModal.personId === props.idx ? (
          <PersonCardVerifyDelete {...props} />
        ) : (
          <PersonCardDisplay {...props} />
        );
    }
  })();

  const modalKindClass = `modal-kind-${ctx.activeModal.kind}`;
  const classes = classNames("PersonCard", modalKindClass);
  return (
    <Alert className={classes}>
      <div className="card-content">{content}</div>
    </Alert>
  );
}

function useUiAction(mapActions: (actions: Actions<ModalUiState>) => any) {
  return useStoreActions((a) => mapActions(a.modalUiState));
}

type SortOrder = {
  direction: "ascending" | "descending";
  key: "name";
};

const defaultSortOrder = { direction: "ascending", key: "name" } as const;

function ManagePool_Ready() {
  const pool = useLoadedValue((s) => s.scheduleParamsState);
  const activeModal = useStoreState((s) => s.modalUiState.activeModal);
  const activateEditPersonName = useUiAction((a) => a.activateEditPersonName);
  const activateVerifyDeletePerson = useUiAction(
    (a) => a.activateVerifyDeletePerson
  );
  const cancelModal = useUiAction((a) => a.cancel);
  const editPersonName = useStoreActions((a) => a.editScheduleSlotName);
  const deletePerson = useStoreActions((a) => a.deleteScheduleSlot);
  const [_sortOrder, _setSortOrder] = useState<SortOrder>(defaultSortOrder);

  const context: PersonCardContextT = {
    activeModal,
    activateEditPersonName,
    activateVerifyDeletePerson,
    editPersonName(iSlot, newName) {
      editPersonName({ iSlot, newName });
    },
    deletePerson(iSlot) {
      deletePerson({ iSlot });
    },
    cancelModal,
  };

  const slotNames = pool.slotNames;

  return (
    <div className="ManageSlots">
      <h1 className="page-name">Configure schedule-slots</h1>
      <div className="pool-members">
        <PersonCardContext.Provider value={context}>
          {slotNames.map((person, iSlot) => (
            <PersonCard key={iSlot} idx={iSlot} name={person} />
          ))}
        </PersonCardContext.Provider>
        <AddMemberCard />
      </div>
    </div>
  );
}

export function ManagePool() {
  const refreshFromDb = useStoreActions((a) => a.refreshFromDb);
  const paramsStateKind = useStoreState((s) => s.scheduleParamsState.kind);

  useEffect(ignoreValue(refreshFromDb));

  switch (paramsStateKind) {
    case "stale":
    case "in-progress":
      return <div>Loading...</div>;
    case "failed":
      return <div>Error sorry</div>;
    case "loaded":
      return <ManagePool_Ready />;
  }
}
