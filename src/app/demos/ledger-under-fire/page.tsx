import type { Metadata } from "next";
import RoomShell from "@/components/demos/shell/room-shell";
import Room from "@/components/demos/rooms/ledger-under-fire";
import { roomBySlug } from "@/lib/demos/registry";

const room = roomBySlug("ledger-under-fire")!;

export const metadata: Metadata = {
  title: room.name,
  description: room.promise,
  alternates: { canonical: `/demos/${room.slug}/` },
  openGraph: {
    title: room.name,
    description: room.promise,
    url: `/demos/${room.slug}/`,
    images: [{ url: "/og-lightbox.png", width: 1200, height: 630, alt: room.name }],
  },
};

export default function Page() {
  return (
    <RoomShell room={room}>
      <Room />
    </RoomShell>
  );
}
