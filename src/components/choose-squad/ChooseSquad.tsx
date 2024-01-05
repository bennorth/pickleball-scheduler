import { Alert, Button } from "react-bootstrap";
import { PersonId, PoolMember } from "../../model/player-pool";
import { useStoreActions, useStoreState } from "../../store";
import { useLoadedValue } from "../hooks";
import { ignoreValue } from "../../utils";
import classNames from "classnames";
import { useState } from "react";

type PoolMemberCardProps = {
  person: PoolMember;
  isInSquad: boolean;
  toggleIsInSquad(personId: number): void;
};

function SquadSelectionCard(props: PoolMemberCardProps) {
  const doToggle = () => props.toggleIsInSquad(props.person.id);
  const isSelected = props.isInSquad;
  const classes = classNames("selected-indicator", { isSelected });
  return (
    <Alert className="SquadSelectionCard" onClick={doToggle}>
      <div className="content">
        <div className={classes}>YES</div>
        {props.person.name}
      </div>
    </Alert>
  );
}

type SortOrder = {
  direction: "ascending" | "descending";
  key: "name" | "isSelected";
};

const defaultSortOrder = { direction: "ascending", key: "name" } as const;

function comparisonFun(sortOrder: SortOrder, squad: Set<PersonId>) {
  const ascendingCmp = (() => {
    switch (sortOrder.key) {
      case "name":
        return (a: PoolMember, b: PoolMember) => {
          if (a.name < b.name) return -1;
          if (a.name === b.name) return 0;
          return 1;
        };
      case "isSelected":
        return (a: PoolMember, b: PoolMember) => {
          const aSelected = squad.has(a.id);
          const bSelected = squad.has(b.id);
          if (aSelected === bSelected) return 0;
          if (aSelected) return -1;
          return 1;
        };
      default:
        throw new Error("bad sort key");
    }
  })();

  const directionFactor = sortOrder.direction === "ascending" ? 1 : -1;
  return (a: PoolMember, b: PoolMember) => ascendingCmp(a, b) * directionFactor;
}

export function ChooseSquad() {
  const pool = useLoadedValue((s) => s.poolState);
  const squad = useStoreState((s) => s.squad);
  const toggleAction = useStoreActions((a) => a.toggleIsInSquad);
  const makeSchedule = useStoreActions((a) => a.generateSchedule);
  const selectAll = useStoreActions((a) => a.setSquadToFullPool);
  const clearSelection = useStoreActions((a) => a.clearSquad);
  const [sortOrder /*, setSortOrder */] = useState<SortOrder>(defaultSortOrder);

  const nSquadMembers = squad.size;
  const toggleIsInSquad = (personId: number) => {
    toggleAction({ personId });
  };

  let persons = pool.slice();
  persons.sort(comparisonFun(sortOrder, squad));

  const nameSortSuffix =
    sortOrder.key === "name"
      ? sortOrder.direction === "ascending"
        ? "⇩"
        : "⇧"
      : "";

  return (
    <div className="ChooseSquad">
      <h1 className="page-name">Choose squad</h1>

      <div className="button-strip">
        <Button onClick={ignoreValue(makeSchedule)}>
          Make schedule with {nSquadMembers} people
        </Button>
        <Button onClick={ignoreValue(selectAll)}>Select all</Button>
        <Button onClick={ignoreValue(clearSelection)}>Clear selection</Button>
      </div>
      <div className="possible-squad-members">
        <div className="sort-order-buttons">
          <Button>Name {nameSortSuffix}</Button>
          <Button>Selected V</Button>
        </div>
        {persons.map((person) => (
          <SquadSelectionCard
            key={person.id}
            person={person}
            isInSquad={squad.has(person.id)}
            toggleIsInSquad={toggleIsInSquad}
          />
        ))}
      </div>
    </div>
  );
}
