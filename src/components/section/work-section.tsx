/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DATA } from "@/data/resume";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function LogoImage({ src }: { src: string }) {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    return (
      <div className="size-8 md:size-10 p-1 border rounded-full shadow ring-2 ring-border bg-muted flex-none" />
    );
  }

  // Decorative. The company name is rendered as text immediately beside it, so
  // carrying it as alt text made a screen reader - and a plain-text copy of the
  // page - say "Hatchit Solutions Hatchit Solutions".
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className="size-8 md:size-10 p-1 border rounded-full shadow ring-2 ring-border overflow-hidden object-contain flex-none"
      onError={() => setImageError(true)}
    />
  );
}

export default function WorkSection() {
  // The current role is open at rest. With everything collapsed, a scrolling
  // visitor saw three company names and three date ranges, so the section read
  // as tenure and nothing else - which is the one thing the work here is not
  // selling. A row that shows a date and no evidence is a row that argues
  // against him.
  const current = DATA.work[0];
  const openByDefault = `${current.company}-${current.title}-${current.start}`;

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={openByDefault}
      className="w-full grid gap-6"
    >
      {DATA.work.map((work) => {
        // Keyed on the ROLE, not the company. Both Hatchit Solutions rows took
        // value="Hatchit Solutions", and Radix matches items by value, so
        // opening either one opened both. Somebody holding two jobs at one
        // employer is normal, so company is never a unique key here.
        const roleId = `${work.company}-${work.title}-${work.start}`;
        return (
          <AccordionItem
            key={roleId}
            value={roleId}
            className="w-full border-b-0 grid gap-2"
          >
            <AccordionTrigger className="hover:no-underline p-0 cursor-pointer transition-colors rounded-none group [&>svg]:hidden">
              <div className="flex items-center gap-x-3 justify-between w-full text-left">
                <div className="flex items-center gap-x-3 flex-1 min-w-0">
                  <LogoImage src={work.logoUrl} />
                  <div className="flex-1 min-w-0 gap-0.5 flex flex-col">
                    <div className="font-semibold leading-none flex items-center gap-2">
                      {work.company}
                      {/* The chevron is visible at REST, not only on hover. It
                          used to be opacity-0 until hover, which meant a phone -
                          where there is no hover - showed nothing at all to say
                          these rows open. A row whose only affordance is a state
                          half the visitors cannot enter is a row nobody presses. */}
                      <span className="relative inline-flex items-center w-3.5 h-3.5">
                        <ChevronRight
                          className={cn(
                            "absolute h-3.5 w-3.5 shrink-0 text-muted-foreground stroke-2 transition-all duration-300 ease-out",
                            "translate-x-0 opacity-70",
                            "group-hover:translate-x-1 group-hover:opacity-100",
                            "group-data-[state=open]:opacity-0 group-data-[state=open]:translate-x-0"
                          )}
                        />
                        <ChevronDown
                          className={cn(
                            "absolute h-3.5 w-3.5 shrink-0 text-muted-foreground stroke-2 transition-all duration-200",
                            "opacity-0 rotate-0",
                            "group-data-[state=open]:opacity-100 group-data-[state=open]:rotate-180"
                          )}
                        />
                      </span>
                    </div>
                    <div className="font-sans text-sm text-muted-foreground">
                      {work.title}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground text-right flex-none">
                  <span>
                    {work.start} - {work.end ?? "Present"}
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-0 ml-13 text-sm text-muted-foreground">
              <ul className="list-disc space-y-1.5 pl-4 marker:text-muted-foreground/50">
                {work.description.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

