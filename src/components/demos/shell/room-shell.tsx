import RoomTint from "@/components/demos/shell/room-tint";
import Rail from "@/components/demos/shell/rail";
import ScopeNote from "@/components/demos/shell/scope-note";
import SourceFooter from "@/components/demos/shell/source-footer";
import type { DemoRoom } from "@/lib/demos/registry";

/**
 * Everything that is the same in every room, in the same order, every time.
 *
 * Four slots: the rail, the room's question, the wall label, and then the stage -
 * which belongs entirely to the room and shares nothing with the other two. The
 * source footer and the corridor close it.
 *
 * The rooms are meant to diverge hard. What they may not diverge on is what they
 * are allowed to assert about themselves, so the wall label is composed here rather
 * than by each room: a room cannot forget it, cannot collapse it, and cannot move it
 * below the fold. tests/demos.test.mjs asserts every room page renders this
 * component, so the guarantee survives someone writing a fourth room from memory.
 *
 * TWO READERS, TWO BLOCKS. The capability line and the mechanism used to be
 * concatenated into one muted paragraph with no separator between them, which fused
 * a plain-language clause onto 30 words of jargon and served neither reader. They
 * are now labelled and separated, and the mechanism is a list, so a recruiter can
 * stop after "What this shows" and an engineer can skim three named terms.
 */
export default function RoomShell({
  room,
  children,
}: {
  room: DemoRoom;
  children: React.ReactNode;
}) {
  return (
    <>
      <RoomTint hue={room.hue} />
      <Rail room={room} />
      <div className="space-y-6 pb-4">
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Room {room.order} of 3
          </p>
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">{room.name}</h1>
          <p className="max-w-prose text-[15px] leading-relaxed text-foreground/85">
            {room.promise}
          </p>
          <p className="max-w-prose text-[15px] leading-relaxed text-muted-foreground">
            {room.promiseDetail}
          </p>
        </div>

        {/* Same dl idiom, same label column width and same type scale as the wall
            label below it, so the two blocks read as one object rather than as two
            components that happened to land next to each other. */}
        <dl className="grid max-w-prose gap-2.5 pt-1 sm:grid-cols-[10.5rem_1fr] sm:gap-x-6 sm:gap-y-3">
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:pt-[5px]">
            What this shows
          </dt>
          <dd className="text-[14px] leading-relaxed text-foreground">{room.capability}</dd>

          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:pt-[5px]">
            How
          </dt>
          {/* A list rather than a sentence, because a term a reader does not know
              then costs them one line instead of the whole paragraph. */}
          <dd>
            <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-muted-foreground marker:text-muted-foreground/40">
              {room.mechanism.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </dd>
        </dl>
        <ScopeNote room={room} />
        {children}
        <SourceFooter room={room} />
      </div>
    </>
  );
}
