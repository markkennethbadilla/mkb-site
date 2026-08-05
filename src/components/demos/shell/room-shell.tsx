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
 * below the fold. scripts/check-demos.mjs asserts every room page renders this
 * component, so the guarantee survives someone writing a fourth room from memory.
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
          <p className="max-w-prose pt-1 text-[13px] leading-relaxed text-muted-foreground">
            <span className="text-foreground/70">{room.capability}</span> {room.mechanism}
          </p>
        </div>
        <ScopeNote room={room} />
        {children}
        <SourceFooter room={room} />
      </div>
    </>
  );
}
