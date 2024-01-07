import { PersonId } from "../../model/player-pool";
import {
  CourtAllocation,
  Pair,
  PersonRole,
  TimeSlotAllocation,
  pairKeyFromIds,
} from "../../model/scheduling";
import { range } from "itertools";
import {
  RenderScheduleContext,
  makeRenderScheduleContext,
  useRenderScheduleContext,
} from "./context";
import { useStoreActions, useStoreState } from "../../store";
import { useLoadedValue } from "../hooks";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import classNames from "classnames";
import { Button } from "react-bootstrap";

// TODO: Rename because these also apply when dragging a person.
type PairDragItem = { iSlot: number; personId: PersonId };
type PairDragProps = { isDragging: boolean };
type PairDropProps = { isOver: boolean; canDrop: boolean };

type PersonViewProps = {
  iSlot: number;
  personId: PersonId;
  role: PersonRole;
};
function PersonView({ iSlot, personId, role }: PersonViewProps) {
  const ctx = useRenderScheduleContext();
  const swapPersonsInSlot = useStoreActions((a) => a.swapPersonsInSlot);

  const poolMember = ctx.personFromId(personId);

  const [{ isDragging }, drag] = useDrag<PairDragItem, void, PairDragProps>(
    () => ({
      type: "person",
      item: { iSlot, personId },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }),
    [iSlot, personId]
  );
  const [{ isOver, canDrop }, drop] = useDrop<
    PairDragItem,
    void,
    PairDropProps
  >(
    () => ({
      accept: "person",
      canDrop: (item) => item.iSlot === iSlot && item.personId !== personId,
      drop: (item) => {
        swapPersonsInSlot({
          iSlot,
          personId0: item.personId,
          personId1: personId,
        });
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [iSlot, personId]
  );

  const ruleViolations = ctx.sittingOutFairnessViolationsFromId(personId);
  const sittingOutTooManyTimes =
    ruleViolations.some((violation) => violation.subKind === "too-many") &&
    role === "sitting-out";

  const classes = classNames(
    "PersonView",
    { isDragging, isOver, canDrop },
    { sittingOutTooManyTimes }
  );
  return (
    <div ref={drag} className="drag-container">
      <div ref={drop} className="drop-target">
        <div ref={drag} className={classes}>
          {poolMember.name}
        </div>
      </div>
    </div>
  );
}

type PairViewProps = { iSlot: number; pair: Pair };
function PairView({ iSlot, pair }: PairViewProps) {
  const ctx = useRenderScheduleContext();
  const swapPairsInSlot = useStoreActions((a) => a.swapPairsInSlot);

  // Identify a pair by the ID of the first person in it.
  const personId = pair[0];
  const pairKey = pairKeyFromIds(pair);
  const ruleViolations = ctx.noDuplicatePairsViolationsFromPairKey(pairKey);
  const duplicated = ruleViolations.length > 0;

  const [{ isDragging }, drag] = useDrag<PairDragItem, void, PairDragProps>(
    () => ({
      type: "pair",
      item: { iSlot, personId },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [iSlot, personId]
  );
  const [{ isOver, canDrop }, drop] = useDrop<
    PairDragItem,
    void,
    PairDropProps
  >(
    () => ({
      accept: "pair",
      canDrop: (item) => item.iSlot === iSlot && item.personId !== personId,
      drop: (item) => {
        swapPairsInSlot({
          iSlot,
          personId0: item.personId,
          personId1: personId,
        });
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [iSlot, personId]
  );

  const classes = classNames(
    "PairView",
    { isDragging, isOver, canDrop },
    { duplicated }
  );
  return (
    <div ref={drag} className="drag-container">
      <div ref={drop} className="drop-target">
        <div className={classes}>
          <PersonView iSlot={iSlot} personId={pair[0]} role="playing" />
          <div className="pair-joiner">+</div>
          <PersonView iSlot={iSlot} personId={pair[1]} role="playing" />
        </div>
      </div>
    </div>
  );
}

type CourtViewProps = { iSlot: number; court: CourtAllocation };
function CourtView({ iSlot, court }: CourtViewProps) {
  return (
    <td className="CourtView">
      <PairView iSlot={iSlot} pair={court[0]} />
      <div className="pair-separator"></div>
      <PairView iSlot={iSlot} pair={court[1]} />
    </td>
  );
}

type TimeSlotViewProps = {
  iSlot: number;
  name: string;
  slot: TimeSlotAllocation;
};
export function TimeSlotView({ iSlot, name, slot }: TimeSlotViewProps) {
  const ctx = useRenderScheduleContext();
  return (
    <tr className="TimeSlotView">
      <th>
        {name}
        <Button
          className="non-print"
          onClick={() => {
            ctx.retrySlot({ iSlot });
          }}
        >
          retry
        </Button>
      </th>
      {slot.courtAllocations.map((court, idx) => (
        <CourtView iSlot={iSlot} key={idx} court={court} />
      ))}
      <BenchView iSlot={iSlot} bench={slot.bench} />
    </tr>
  );
}

type BenchViewProps = { iSlot: number; bench: TimeSlotAllocation["bench"] };
function BenchView({ iSlot, bench }: BenchViewProps) {
  return (
    <td className="on-bench">
      {bench.map((personId) => {
        return (
          <PersonView
            key={personId}
            iSlot={iSlot}
            personId={personId}
            role="sitting-out"
          />
        );
      })}
    </td>
  );
}

export function BareSchedule() {
  const pool = useLoadedValue((s) => s.poolState);
  const schedule = useStoreState((s) => s.schedule);
  const scheduleParams = useLoadedValue((s) => s.scheduleParamsState);
  const retrySlot = useStoreActions((a) => a.retrySlot);

  if (schedule == null) {
    return <div>Error no schedule</div>;
  }

  const displayTitle = scheduleParams.displayTitle;
  const slotNames = scheduleParams.slotNames;

  const context = makeRenderScheduleContext(pool, schedule, retrySlot);

  const header = (
    <tr>
      <th />
      {Array.from(range(schedule.nCourts)).map((idx) => (
        <th key={idx}>Court {idx + 1}</th>
      ))}
      <th>Sitting out</th>
    </tr>
  );

  return (
    <RenderScheduleContext.Provider value={context}>
      <DndProvider backend={HTML5Backend}>
        <div className="BareSchedule">
          <h1>{displayTitle}</h1>
          <table className="ScheduleView">
            <thead>{header}</thead>
            <tbody>
              {schedule.timeSlots.map((slot, idx) => (
                <TimeSlotView
                  key={idx}
                  iSlot={idx}
                  name={slotNames[idx]}
                  slot={slot}
                />
              ))}
            </tbody>
          </table>
        </div>
      </DndProvider>
    </RenderScheduleContext.Provider>
  );
}
