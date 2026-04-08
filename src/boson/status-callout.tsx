"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type CalloutTone = "info" | "loading" | "empty" | "error";

export function StatusCallout({
  tone,
  title,
  children,
  className,
}: {
  tone: CalloutTone;
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const toneClass =
    tone === "error"
      ? "border-destructive/30 bg-destructive/5 text-destructive"
      : tone === "loading"
        ? "border-border bg-data/20 text-muted-foreground"
        : tone === "empty"
          ? "border-border bg-muted/10 text-muted-foreground"
          : "border-border bg-data/20 text-muted-foreground";

  return (
    <div className={cn("rounded-md border px-3 py-2 text-xs", toneClass, className)}>
      <div className={cn("font-medium", tone === "error" ? "text-destructive" : "text-foreground/80")}>{title}</div>
      {children ? <div className={cn("mt-1 leading-relaxed", tone === "error" ? "text-destructive" : "")}>{children}</div> : null}
    </div>
  );
}

