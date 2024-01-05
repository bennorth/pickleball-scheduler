import { PageKind } from "../model/app";
import { useStoreActions } from "../store";

export function MenuBar() {
  const setPageAction = useStoreActions((a) => a.setPage);
  const setPageFun = (page: PageKind) => () => {
    setPageAction(page);
  };

  return (
    <ul className="MenuBar">
      <li onClick={setPageFun("manage-pool")}>Player pool</li>
      <li onClick={setPageFun("choose-squad")}>Schedule</li>
    </ul>
  );
}
