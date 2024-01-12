import { useEffect } from "react";
import { useStoreActions, useStoreState } from "../../store";
import { ignoreValue } from "../../utils";
import { useLoadedValue } from "../hooks";
import { Button } from "react-bootstrap";

function ChooseParams_Ready() {
  const schedule = useLoadedValue((s) => s.scheduleParamsState);
  const setNCourts = useStoreActions((a) => a.setScheduleNCourts);
  const setNGames = useStoreActions((a) => a.setScheduleNGames);

  const nCourts = schedule.nCourts;
  const nGames = schedule.nGames;

  const incrementNCourts = () => setNCourts({ nCourts: nCourts + 1 });
  const decrementNCourts = () => setNCourts({ nCourts: nCourts - 1 });
  const decrementNCourtsEnabled = nCourts > 1;

  const incrementNGames = () => setNGames({ nGames: nGames + 1 });
  const decrementNGames = () => setNGames({ nGames: nGames - 1 });
  const decrementNGamesEnabled = nGames > 1;

  return (
    <div className="ChooseParams">
      <h1 className="page-name">How many courts and games?</h1>
      <div className="choose-number n-courts">
        <div className="current-value">Courts: {nCourts}</div>
        <div className="controls">
          <Button
            onClick={decrementNCourts}
            disabled={!decrementNCourtsEnabled}
          >
            -
          </Button>
          <Button onClick={incrementNCourts}>+</Button>
        </div>
      </div>
      <div className="choose-number n-games">
        <div className="current-value">Games: {nGames}</div>
        <div className="controls">
          <Button onClick={decrementNGames} disabled={!decrementNGamesEnabled}>
            -
          </Button>
          <Button onClick={incrementNGames}>+</Button>
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
