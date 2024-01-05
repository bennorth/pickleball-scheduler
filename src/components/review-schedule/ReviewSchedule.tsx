import { useStoreActions } from "../../store";
import { useLoadedValue } from "../hooks";
import { Button } from "react-bootstrap";
import { BareSchedule } from "./BareSchedule";
import { PersonLutContext, makePersonLutContext } from "./context";

export function ReviewSchedule() {
  const pool = useLoadedValue((s) => s.poolState);
  const generateSchedule = useStoreActions((a) => a.generateSchedule);
  const setPage = useStoreActions((a) => a.setPage);

  const personFromId = makePersonLutContext(pool);
  const doGenerate = () => generateSchedule();
  const switchToPrintLayout = () => setPage("schedule-print-layout");

  return (
    <PersonLutContext.Provider value={personFromId}>
      <div className="ReviewSchedule">
        <h1 className="page-name">Review schedule</h1>
        <BareSchedule />
        <div className="button-strip">
          <Button onClick={doGenerate}>Regenerate</Button>
          <Button onClick={switchToPrintLayout}>Print layout</Button>
        </div>
      </div>
    </PersonLutContext.Provider>
  );
}
