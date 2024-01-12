import { useStoreActions, useStoreState } from "./store";
import "./App.scss";
import { ManagePool } from "./components/manage-pool/ManagePool";
import { MenuBar } from "./components/MenuBar";
import { ignoreValue } from "./utils";
import { useEffect } from "react";
import { ReviewSchedule } from "./components/review-schedule/ReviewSchedule";
import classNames from "classnames";
import { PrintLayout as SchedulePrintLayout } from "./components/review-schedule/PrintLayout";
import { ChooseSquadAndSlots } from "./components/choose-squad/ChooseSquadAndSlots";
import "./font-awesome-lib";

function PageContent() {
  const refreshFromDb = useStoreActions((a) => a.refreshFromDb);
  const page = useStoreState((s) => s.page);
  const poolState = useStoreState((s) => s.poolState);

  useEffect(ignoreValue(refreshFromDb));

  switch (poolState.kind) {
    case "stale":
    case "in-progress":
      return <div>LOADING...</div>;
    case "failed":
      return <div>Error sorry</div>;
    case "loaded":
      switch (page) {
        case "manage-pool":
          return <ManagePool />;
        case "choose-squad":
          return <ChooseSquadAndSlots />;
        case "review-schedule":
          return <ReviewSchedule />;
        case "schedule-print-layout":
          return <SchedulePrintLayout />;
        default:
          return <div>ERROR</div>;
      }
  }
}

export function App() {
  const page = useStoreState((s) => s.page);

  const mMenuBar = page !== "schedule-print-layout" ? <MenuBar /> : null;

  const classes = classNames("App", `page-${page}`);
  return (
    <div className={classes}>
      {mMenuBar}
      <PageContent />
    </div>
  );
}
