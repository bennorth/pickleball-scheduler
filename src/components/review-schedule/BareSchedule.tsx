import { useContext } from "react";
import { PersonId, PoolMember } from "../../model/player-pool";
import {
  CourtAllocation,
  Pair,
  TimeSlotAllocation,
} from "../../model/scheduling";
import { range } from "itertools";
import { PersonLutContext, makePersonLutContext } from "./context";
import { useStoreActions, useStoreState } from "../../store";
import { useLoadedValue } from "../hooks";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import classNames from "classnames";

// TODO: Rename because these also apply when dragging a person.
type PairDragItem = { iSlot: number; personId: PersonId };
type PairDragProps = { isDragging: boolean };
type PairDropProps = { isOver: boolean; canDrop: boolean };

type PersonViewProps = { iSlot: number; poolMember: PoolMember };
function PersonView({ iSlot, poolMember }: PersonViewProps) {
  const swapPersonsInSlot = useStoreActions((a) => a.swapPersonsInSlot);

  const personId = poolMember.id;

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

  const classes = classNames("PersonView", { isDragging, isOver, canDrop });
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
  const swapPairsInSlot = useStoreActions((a) => a.swapPairsInSlot);

  // Identify a pair by the ID of the first person in it.
  const personId = pair[0];

  const personFromId = useContext(PersonLutContext);
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

  const classes = classNames("PairView", { isDragging, isOver, canDrop });
  return (
    <div ref={drag} className="drag-container">
      <div ref={drop} className="drop-target">
        <div className={classes}>
          <PersonView iSlot={iSlot} poolMember={personFromId(pair[0])} />
          <div className="pair-joiner">+</div>
          <PersonView iSlot={iSlot} poolMember={personFromId(pair[1])} />
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
  return (
    <tr className="TimeSlotView">
      <th>{name}</th>
      {slot.courtAllocations.map((court, idx) => (
        <CourtView iSlot={iSlot} key={idx} court={court} />
      ))}
      <BenchView iSlot={iSlot} bench={slot.bench} />
    </tr>
  );
}

type BenchViewProps = { iSlot: number; bench: TimeSlotAllocation["bench"] };
function BenchView({ iSlot, bench }: BenchViewProps) {
  const personFromId = useContext(PersonLutContext);
  return (
    <td className="on-bench">
      {bench.map((personId) => {
        return (
          <PersonView
            key={personId}
            iSlot={iSlot}
            poolMember={personFromId(personId)}
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

  if (schedule == null) {
    return <div>Error no schedule</div>;
  }
  const displayTitle = scheduleParams.displayTitle;

  const slotNames = scheduleParams.slotNames;

  const personFromId = makePersonLutContext(pool);

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
    <PersonLutContext.Provider value={personFromId}>
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
    </PersonLutContext.Provider>
  );
}
