import { useStoreActions, useStoreState } from "../../store";
import { Button } from "react-bootstrap";
import { BareSchedule } from "./BareSchedule";

export function ReviewSchedule() {
  const generationState = useStoreState((s) => s.generationState);
  const generateScheduleAction = useStoreActions((a) => a.generateSchedule);
  const cancelGeneration = useStoreActions((a) => a.cancelGeneration);
  const clearPersonHighlight = useStoreActions((a) => a.clearPersonHighlight);
  const setPage = useStoreActions((a) => a.setPage);

  const switchToPrintLayout = () => {
    clearPersonHighlight();
    setPage("schedule-print-layout");
  };

  const generateSchedule = () => {
    clearPersonHighlight();
    generateScheduleAction();
  };

  const buttons = (() => {
    switch (generationState.kind) {
      case "idle":
        return (
          <>
            <Button onClick={() => generateSchedule()}>New schedule</Button>
            <Button onClick={switchToPrintLayout}>Print layout</Button>
          </>
        );
      case "running":
        return (
          <>
            <Button onClick={() => cancelGeneration()}>Interrupt</Button>
            <Button disabled={true}>Print layout</Button>
          </>
        );
    }
  })();

  return (
    <div className="ReviewSchedule">
      <h1 className="page-name">Review schedule</h1>
      <BareSchedule />
      <div className="button-strip">{buttons}</div>
    </div>
  );
}
