"use client";

import { DashboardHeader } from "@/components/DashboardHeader";
import { Upload, Link, Plus, FileText, Trash2, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "");

interface Source {
  id: string;
  name: string;
  type: "file" | "url" | "faq";
  status: "indexed" | "processing";
}

const KnowledgeBase = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/knowledge`);
      const data = await res.json();
      setSources(data);
    } catch (err) {
      console.error("Error fetching knowledge source:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch(`${API_URL}/api/knowledge/sync`, { method: 'POST' });
      if (!res.ok) throw new Error("Sync failed");
      toast.info("Knowledge base sync started in background...");
      
      // Artificial delay for the spinner to feel real
      setTimeout(() => {
        setSyncing(false);
        fetchSources();
      }, 2000);
    } catch (err) {
      toast.error("Failed to start sync");
      setSyncing(false);
    }
  };

  return (
    <>
      <DashboardHeader title="Knowledge Base" />
      <div className="p-6 page-transition space-y-6 max-w-4xl">
        <div className="flex justify-between items-center bg-accent/5 p-4 rounded-xl border border-accent/10">
           <div>
              <h3 className="font-semibold text-sm">Synchronize Store</h3>
              <p className="text-xs text-muted-foreground">Force re-index all documents into the vector database.</p>
           </div>
           <button 
             onClick={handleSync}
             disabled={syncing}
             className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
           >
             {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
             Sync Knowledge
           </button>
        </div>

        {/* Upload Placeholder */}
        <div className="glass-card p-8 border-dashed border-2 border-border/50 flex flex-col items-center justify-center text-center cursor-pointer hover:border-accent/30 transition-colors">
          <Upload className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">To add new data, place files in agent/knowledge/data</p>
          <p className="text-xs text-muted-foreground mt-1">Direct upload integration coming soon.</p>
        </div>

        {/* Sources List */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Current Knowledge Sources</h3>
          {loading ? (
             <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-2">
              {sources.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No source files found in data directory.</p>
              ) : (
                sources.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[hsl(0_0%_100%/0.03)] transition-colors">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">{s.name}</span>
                    <span className="flex items-center gap-1 text-xs text-success"><CheckCircle className="w-3.5 h-3.5" /> Indexed</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default KnowledgeBase;
