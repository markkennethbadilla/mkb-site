import type { Metadata } from "next";
import RoomShell from "@/components/demos/shell/room-shell";
import Room from "@/components/demos/rooms/score-audit";
import { roomBySlug } from "@/lib/demos/registry";

const room = roomBySlug("score-audit")!;

export const metadata: Metadata = {
  title: room.name,
  description: room.promise,
};

export default function Page() {
  return (
    <RoomShell room={room}>
      <Room />
    </RoomShell>
  );
}
