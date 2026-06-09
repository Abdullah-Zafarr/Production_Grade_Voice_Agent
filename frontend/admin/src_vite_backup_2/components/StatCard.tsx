import { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  title: string;
  value: number | string;
  suffix?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export const StatCard = ({ title, value, suffix = "", icon: Icon, trend, trendUp }: Props) => {
  const [display, setDisplay] = useState<number | string>(0);

  useEffect(() => {
    // If it's a string (like "1:05"), don't animate, just set it
    if (typeof value === "string") {
      setDisplay(value);
      return;
    }

    // Number animation logic
    if (typeof value === "number") {
      if (value === 0) {
        setDisplay(0);
        return;
      }

      const duration = 800;
      const steps = 30;
      const increment = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplay(value);
          clearInterval(timer);
        } else {
          setDisplay(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [value]);

  return (
    <div className="stat-card group cursor-default">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-5 h-5 text-accent" />
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trendUp ? "text-success" : "text-destructive"}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">
        {typeof display === "number" ? display.toLocaleString() : display}
        {suffix}
      </p>
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
    </div>
  );
};
