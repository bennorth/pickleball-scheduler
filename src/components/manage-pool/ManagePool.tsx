import { createContext, useContext, useState } from "react";
import { ActiveModal, ModalUiState } from "../../model/modal-ui";
import { PersonId, PoolMember } from "../../model/player-pool";
import { useStoreActions, useStoreState } from "../../store";
import { useLoadedValue } from "../hooks";
import { AddMemberCard } from "./AddMember";
import { Alert, Button, Form } from "react-bootstrap";
import { Actions } from "easy-peasy";
import classNames from "classnames";
import { submitOnEnterKeyFun } from "../../utils";

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

type PersonCardProps = { person: PoolMember };

function PersonCardDisplay(props: PersonCardProps) {
  const ctx = usePersonCardContext();
  return (
    <>
      <div className="name">{props.person.name}</div>
      <div className="controls">
        <Button onClick={() => ctx.activateEditPersonName(props.person.id)}>
          EDIT
        </Button>
        <Button
          onClick={() => ctx.activateVerifyDeletePerson(props.person.id)}
          variant="danger"
        >
          DELETE
        </Button>
      </div>
    </>
  );
}

function PersonCardEditName({ person }: PersonCardProps) {
  const ctx = usePersonCardContext();
  const [name, setName] = useState(person.name);
  const doEdit = () => {
    ctx.cancelModal();
    ctx.editPersonName(person.id, name);
  };
  const onKeyDown = submitOnEnterKeyFun(doEdit, name !== "");
  return (
    <>
      <div className="name">
        <Form.Control
          type="text"
          value={name}
          onChange={(evt) => {
            setName(evt.target.value);
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

function PersonCardVerifyDelete({ person }: PersonCardProps) {
  const ctx = usePersonCardContext();
  const doDelete = () => {
    ctx.cancelModal();
    ctx.deletePerson(person.id);
  };
  return (
    <>
      <div className="name">
        <span>
          <Button onClick={doDelete} variant="danger">
            DELETE
          </Button>
          <span className="verify-delete-person">{person.name}</span>
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
        return ctx.activeModal.personId === props.person.id ? (
          <PersonCardEditName {...props} />
        ) : (
          <PersonCardDisplay {...props} />
        );
      case "verify-delete-person":
        return ctx.activeModal.personId === props.person.id ? (
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

export function ManagePool() {
  const pool = useLoadedValue((s) => s.poolState);
  const activeModal = useStoreState((s) => s.modalUiState.activeModal);
  const activateEditPersonName = useUiAction((a) => a.activateEditPersonName);
  const activateVerifyDeletePerson = useUiAction(
    (a) => a.activateVerifyDeletePerson
  );
  const cancelModal = useUiAction((a) => a.cancel);
  const editPersonName = useStoreActions((a) => a.editPersonName);
  const deletePerson = useStoreActions((a) => a.deletePerson);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  const context: PersonCardContextT = {
    activeModal,
    activateEditPersonName,
    activateVerifyDeletePerson,
    editPersonName(personId, newName) {
      editPersonName({ personId, newName });
    },
    deletePerson(personId) {
      deletePerson({ personId });
    },
    cancelModal,
  };

  return (
    <div className="ManagePool">
      <h1 className="page-name">Player pool</h1>
      <div className="pool-members">
        <PersonCardContext.Provider value={context}>
          {pool.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </PersonCardContext.Provider>
        <AddMemberCard />
      </div>
    </div>
  );
}
