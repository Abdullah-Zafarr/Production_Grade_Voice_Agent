"use client";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');

const EmbedCodes = () => {
  const [position, setPosition] = useState("bottom-right");
  const [color, setColor] = useState("#3B82F6");
  const [buttonText, setButtonText] = useState("Chat with us");
  const [autoOpen, setAutoOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const code = `<script src="${API_URL}/orb/widget.js"
  data-position="${position}"
  data-color="${color}"
  data-text="${buttonText}"
  data-auto-open="${autoOpen}"
></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <DashboardHeader title="Embed Codes" />
      <div className="p-6 page-transition grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* Customization */}
        <div className="glass-card p-6 space-y-5">
          <h3 className="font-semibold">Widget Settings</h3>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Position</label>
            <select value={position} onChange={(e) => setPosition(e.target.value)} className="w-full bg-input border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent">
              <option value="bottom-right" className="bg-card">Bottom Right</option>
              <option value="bottom-left" className="bg-card">Bottom Left</option>
              <option value="top-right" className="bg-card">Top Right</option>
              <option value="top-left" className="bg-card">Top Left</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Brand Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0" />
              <span className="text-sm font-mono text-muted-foreground">{color}</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Button Text</label>
            <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} className="w-full bg-input border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm">Auto-open widget</label>
            <button
              onClick={() => setAutoOpen(!autoOpen)}
              className={`w-11 h-6 rounded-full transition-colors ${autoOpen ? "bg-accent" : "bg-border"} relative`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform ${autoOpen ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        {/* Code Output + Preview */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Embed Code</h3>
              <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="bg-input rounded-lg p-4 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">{code}</pre>
          </div>

          {/* Preview */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-3">Widget Preview</h3>
            <div className="grid grid-cols-2 gap-3">
              {["bg-background", "bg-foreground/5"].map((bg, i) => (
                <div key={i} className={`${bg} rounded-xl h-40 relative border border-border/20`}>
                  <div
                    className={`absolute ${position.includes("bottom") ? "bottom-3" : "top-3"} ${position.includes("right") ? "right-3" : "left-3"} px-4 py-2 rounded-full text-xs font-medium text-primary-foreground flex items-center gap-2 shadow-lg`}
                    style={{ background: color }}
                  >
                    💬 {buttonText}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmbedCodes;
