"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  title: React.ReactNode;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  noPadding?: boolean;
}

export function CollapsibleCard({ title, children, headerExtra, defaultOpen = true, className, noPadding }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={`border-0 shadow-sm ${className ?? ""}`}>
        <CardHeader className="pb-2 pt-5">
          <div className="flex items-center justify-between gap-2">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 text-left group">
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 -rotate-90 group-data-[panel-open]:rotate-0" />
            </CollapsibleTrigger>
            {headerExtra && <div className="shrink-0">{headerExtra}</div>}
          </div>
        </CardHeader>
        <CollapsibleContent>
          {noPadding ? children : <CardContent className="pt-0">{children}</CardContent>}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
