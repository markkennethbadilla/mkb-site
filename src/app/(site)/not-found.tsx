import Link from "next/link";
import { Fragment } from "react";
import { Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OPEN_ROOMS } from "@/lib/demos/registry";

export default function NotFound() {
    return (
        <div className="min-h-[calc(100vh-12rem)] flex flex-col">
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="flex flex-col items-center text-center max-w-md relative">
                    <h1 className="text-[200px] font-semibold font-mono bg-linear-to-b from-primary/30 to-secondary/10 text-transparent bg-clip-text absolute -top-40 left-1/2 -translate-x-1/2 mask-[linear-gradient(to_bottom,black,black_20%,transparent_80%)] tracking-tighter uppercase [-webkit-text-stroke:3px_hsl(var(--primary)/0.6)]">
                        404
                    </h1>
                    <h2 className="text-4xl tracking-tight font-semibold text-foreground mb-2">
                        Page Not Found
                    </h2>
                    <p className="text-muted-foreground mb-8 text-balance tracking-tight font-medium">
                        The page you&apos;re looking for doesn&apos;t exist or may have been
                        moved.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link href="/">
                            <Button variant="outline" className="gap-2 cursor-pointer">
                                <Home className="h-4 w-4" />
                                Go to Home
                            </Button>
                        </Link>
                    </div>
                    {/* Demo URLs go into job applications, so a mistyped one is a
                        real scenario rather than a hypothetical - and the person
                        who mistyped it is exactly the person who should not have
                        to go hunting. */}
                    <div className="mt-10 w-full border-t border-border pt-6 text-left">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            Looking for a demo?
                        </p>
                        {/* A room name and what it does are a label and a value, and
                            they were welded into one line with a margin between them,
                            so a parser read a run-on. A <dl> makes the pairing real
                            and lets the names line up down the left. */}
                        <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[9rem_1fr]">
                            {OPEN_ROOMS.map((room) => (
                                <Fragment key={room.slug}>
                                    <dt>
                                        <Link
                                            href={`/demos/${room.slug}`}
                                            className="text-[13px] text-foreground/80 underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                                        >
                                            {room.name}
                                        </Link>
                                    </dt>
                                    <dd className="mb-2 text-[13px] text-muted-foreground sm:mb-0">
                                        {room.capability}
                                    </dd>
                                </Fragment>
                            ))}
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
}


