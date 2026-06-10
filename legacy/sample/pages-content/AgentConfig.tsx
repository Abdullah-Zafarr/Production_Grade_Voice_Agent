"use client";

import { DashboardHeader } from "@/components/DashboardHeader";
import { Bot, Mic, Gauge, MessageSquare, Save, Play, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "");

const AgentConfig = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // States matching backend keys
  const [identity, setIdentity] = useState({
    name: "Dr. Sarah",
    voice_id: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    speed: 1.0,
    tone: "professional"
  });
  
  const [prompt, setPrompt] = useState({
    instructions: "",
    greeting: "",
    closing: ""
  });

  useEffect(() => {
    fetch(`${API_URL}/api/agent/config`)
      .then(res => res.json())
      .then(data => {
        if (data.agent_identity) setIdentity(data.agent_identity);
        if (data.agent_prompt) setPrompt(data.agent_prompt);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading config:", err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/api/agent/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_identity: identity,
          agent_prompt: prompt
        })
      });

      if (!response.ok) throw new Error("Save failed");
      
      toast.success("Agent configuration saved successfully!");
    } catch (error) {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <DashboardHeader title="Agent Configuration" />
      <div className="p-6 page-transition space-y-6 max-w-4xl">
        {/* Agent Identity */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-5 h-5 text-accent" />
            <h3 className="font-semibold">Agent Identity</h3>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Agent Name</label>
            <input 
              value={identity.name} 
              onChange={(e) => setIdentity({...identity, name: e.target.value})} 
              className="w-full bg-input border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Mic className="w-3 h-3" /> Voice ID</label>
              <input 
                value={identity.voice_id} 
                onChange={(e) => setIdentity({...identity, voice_id: e.target.value})} 
                className="w-full bg-input border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" 
                placeholder="Cartesia Voice ID"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Gauge className="w-3 h-3" /> Speed: {identity.speed}x</label>
              <input type="range" min="0.5" max="2" step="0.1" value={identity.speed} onChange={(e) => setIdentity({...identity, speed: Number(e.target.value)})} className="w-full accent-accent" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Tone</label>
              <select value={identity.tone} onChange={(e) => setIdentity({...identity, tone: e.target.value})} className="w-full bg-input border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent">
                <option value="professional" className="bg-card">Professional</option>
                <option value="friendly" className="bg-card">Friendly</option>
                <option value="casual" className="bg-card">Casual</option>
              </select>
            </div>
          </div>
        </div>

        {/* System Prompt */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-3">System Instructions</h3>
          <textarea
            value={prompt.instructions}
            onChange={(e) => setPrompt({...prompt, instructions: e.target.value})}
            rows={6}
            className="w-full bg-input border border-border/50 rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent font-mono resize-none"
          />
          <div className="flex gap-3 mt-4">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Configuration
            </button>
          </div>
        </div>

        {/* Call Behavior */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-semibold mb-2">Call Behavior</h3>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Greeting Message</label>
            <input value={prompt.greeting} onChange={(e) => setPrompt({...prompt, greeting: e.target.value})} className="w-full bg-input border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Closing Message</label>
            <input value={prompt.closing} onChange={(e) => setPrompt({...prompt, closing: e.target.value})} className="w-full bg-input border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" />
          </div>
        </div>
      </div>
    </>
  );
};

export default AgentConfig;
