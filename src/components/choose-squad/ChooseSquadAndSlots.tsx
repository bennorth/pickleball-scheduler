import { Button } from "react-bootstrap";
import { ChooseParams } from "./ChooseParams";
import { ChooseSquad } from "./ChooseSquad";
import { useStoreActions, useStoreState } from "../../store";
import { ignoreValue } from "../../utils";
import { nPlayersPerCourt } from "../../model/scheduling";

function MakeScheduleButton() {
  const paramsState = useStoreState((s) => s.scheduleParamsState);
  const makeSchedule = useStoreActions((a) => a.generateSchedule);
  const nSquadMembers = useStoreState((s) => s.squad.size);

  const canMake =
    paramsState.kind === "loaded" &&
    nSquadMembers >= paramsState.value.nCourts * nPlayersPerCourt;

  return (
    <div className="MakeScheduleButton-container">
      <Button
        disabled={!canMake}
        variant="success"
        onClick={ignoreValue(makeSchedule)}
      >
        Make schedule with {nSquadMembers} people
      </Button>
    </div>
  );
}

export function ChooseSquadAndSlots() {
  return (
    <div className="ChooseSquadAndSlots">
      <ChooseSquad />
      <div className="params-and-button">
        <ChooseParams />
        <MakeScheduleButton />
      </div>
    </div>
  );
}
