"use client";

import { DashboardHeader } from "@/components/DashboardHeader";
import { Calendar, Mail, Video, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "");

const Integrations = () => {
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.ok ? setApiHealthy(true) : setApiHealthy(false))
      .catch(() => setApiHealthy(false));
  }, []);

  const integrations = [
    {
      name: "Cal.com Calendar",
      icon: Calendar,
      connected: true,
      description: "Book and manage patient appointments via Cal.com",
      detail: "Live via CALCOM_API_KEY in .env",
    },
    {
      name: "LiveKit Voice",
      icon: Video,
      connected: apiHealthy === null ? null : apiHealthy,
      description: "Real-time voice calls with patients",
      detail: apiHealthy ? "Worker registered & live" : "Check API server",
    },
    {
      name: "Supabase Database",
      icon: Mail,
      connected: true,
      description: "Persistent call logs, transcripts & settings",
      detail: "Connected via SUPABASE_SERVICE_ROLE_KEY",
    },
  ];

  return (
    <>
      <DashboardHeader title="Integrations" />
      <div className="p-6 page-transition max-w-4xl">
        <p className="text-sm text-muted-foreground mb-6">All integrations are configured via environment variables in your <code className="text-accent">.env</code> file.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((int) => (
            <div key={int.name} className="glass-card p-6 flex flex-col items-center text-center">
              <div className="p-3 rounded-xl bg-primary/10 mb-4">
                <int.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold text-sm">{int.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{int.description}</p>
              <p className="text-xs text-muted-foreground/60 mt-1 italic">{int.detail}</p>

              <div className={`mt-4 px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                int.connected === null
                  ? "bg-muted/20 text-muted-foreground"
                  : int.connected
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive"
              }`}>
                {int.connected === null ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : int.connected ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                {int.connected === null ? "Checking..." : int.connected ? "Connected" : "Disconnected"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Integrations;
