import type { Metadata } from "next";
import RoomShell from "@/components/demos/shell/room-shell";
import Room from "@/components/demos/rooms/ledger-under-fire";
import { roomBySlug } from "@/lib/demos/registry";

const room = roomBySlug("ledger-under-fire")!;

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
