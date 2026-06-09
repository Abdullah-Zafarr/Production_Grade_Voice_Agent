import { useState } from "react";

type OrbState = "idle" | "thinking" | "speaking";

export const AIOrb = () => {
  const [state] = useState<OrbState>("idle");

  return (
    <div className="relative flex items-center justify-center">
      <div
        className={`w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent ${state === "idle" ? "orb-idle" : state === "thinking" ? "orb-thinking" : "orb-idle"
          }`}
      />
      <span className="ml-2 text-xs font-medium text-muted-foreground hidden md:inline">
        Soul AI
      </span>
    </div>
  );
};
