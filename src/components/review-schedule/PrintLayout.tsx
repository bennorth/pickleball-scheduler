import { Button } from "react-bootstrap";
import { BareSchedule } from "./BareSchedule";
import { useStoreActions } from "../../store";

export function PrintLayout() {
  const setPage = useStoreActions((a) => a.setPage);
  const switchToSchedule = () => setPage("review-schedule");

  return (
    <div className="PrintLayout">
      <BareSchedule />
      <div className="non-print">
        <p>Now use browser's print feature.</p>
        <div className="button-strip">
          <Button onClick={switchToSchedule}>{"<-"}Back</Button>
        </div>
      </div>
    </div>
  );
}
