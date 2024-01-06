import { useEffect } from "react";
import { useStoreActions, useStoreState } from "../../store";
import { ignoreValue } from "../../utils";
import { useLoadedValue } from "../hooks";
import { Button } from "react-bootstrap";

function ChooseParams_Ready() {
  const schedule = useLoadedValue((s) => s.scheduleParamsState);
  const setNCourts = useStoreActions((a) => a.setScheduleNCourts);

  const nCourts = schedule.nCourts;
  const incrementNCourts = () => setNCourts({ nCourts: nCourts + 1 });
  const decrementNCourts = () => setNCourts({ nCourts: nCourts - 1 });
  const decrementEnabled = nCourts > 1;
  return (
    <div className="ChooseParams">
      <div className="n-courts">
        <div className="current-value">Number of courts: {nCourts}</div>
        <div className="controls">
          <Button onClick={incrementNCourts}>+</Button>
          <Button onClick={decrementNCourts} disabled={!decrementEnabled}>
            -
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ChooseParams() {
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
      return <ChooseParams_Ready />;
  }
}
