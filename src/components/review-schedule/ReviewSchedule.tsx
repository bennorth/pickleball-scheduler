import { useStoreActions } from "../../store";
import { Button } from "react-bootstrap";
import { BareSchedule } from "./BareSchedule";

export function ReviewSchedule() {
  const generateSchedule = useStoreActions((a) => a.generateSchedule);
  const setPage = useStoreActions((a) => a.setPage);

  const doGenerate = () => generateSchedule();
  const switchToPrintLayout = () => setPage("schedule-print-layout");

  return (
    <div className="ReviewSchedule">
      <h1 className="page-name">Review schedule</h1>
      <BareSchedule />
      <div className="button-strip">
        <Button onClick={doGenerate}>Regenerate</Button>
        <Button onClick={switchToPrintLayout}>Print layout</Button>
      </div>
    </div>
  );
}
