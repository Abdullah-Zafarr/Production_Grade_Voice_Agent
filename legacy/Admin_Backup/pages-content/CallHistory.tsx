"use client";

import { DashboardHeader } from "@/components/DashboardHeader";
import { useState, useEffect } from "react";
import { Search, Filter, Eye, X, Loader2, Play, Volume2, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Call {
  id: string;
  phone: string;
  name: string;
  date: string;
  duration: string;
  durationSec: number;
  outcome: string;
  summary: string;
  transcript: any[];
  recordingUrl?: string;
  recordingStatus?: string;
}

const API_URL = "";

const outcomeBadge = (outcome: Call["outcome"]) => {
  const styles: Record<string, string> = {
    Booked: "bg-success/15 text-success",
    Inquiry: "bg-primary/20 text-accent",
    Callback: "bg-warning/15 text-warning",
    Other: "bg-muted/15 text-muted-foreground",
  };
  
  // Normalize outcome string to match frontend types
  const label = outcome ? outcome.charAt(0).toUpperCase() + outcome.slice(1) : "Other";
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[label] || styles['Other']}`}>{label}</span>;
};

const formatDuration = (sec: number | null) => {
  if (!sec) return "0:00";
  const mins = Math.floor(sec / 60);
  const secs = Math.round(sec % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const durationColor = (sec: number) => {
  if (sec < 60) return "text-muted-foreground";
  if (sec < 300) return "text-foreground";
  return "text-accent";
};

const CallHistory = () => {
  const [selected, setSelected] = useState<Call | null>(null);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/calls`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();

      const mappedCalls: Call[] = (data || []).map((c: any) => ({
        id: c.call_id,
        phone: c.caller_data?.phone_number || "Unknown",
        name: c.caller_data?.full_name || "Guest",
        date: format(new Date(c.started_at), "yyyy-MM-dd HH:mm"),
        duration: formatDuration(c.duration_seconds),
        durationSec: c.duration_seconds || 0,
        outcome: c.outcome || "other",
        summary: c.summary || "No summary available.",
        transcript: c.transcript || [],
        recordingUrl: c.recording_url,
        recordingStatus: c.recording_status
      }));

      setCalls(mappedCalls);
    } catch (err: any) {
      console.error("Error fetching calls:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSignedUrl = async (callId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/recordings/${callId}/url`);
      if (!res.ok) throw new Error("Failed to get secure recording link");
      const data = await res.json();
      setAudioUrl(data.url);
      setPlayingId(callId);
    } catch (err) {
      console.error("Playback error:", err);
      alert("Could not load recording. It might still be processing.");
    }
  };

  const handleDownload = async (callId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/recordings/${callId}/url?download=true`);
      if (!res.ok) throw new Error("Failed to get download link");
      const data = await res.json();
      
      const a = document.createElement("a");
      a.href = data.url;
      a.download = `recording-${callId}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download error:", err);
      alert("Could not download recording.");
    }
  };
  
  const handleDelete = async (callId: string) => {
    if (!confirm("Are you sure you want to delete this call log and its recording? This action cannot be undone.")) return;
    
    try {
      const res = await fetch(`${API_URL}/api/calls/${callId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Delete failed");
      
      toast.success("Call log deleted successfully.");
      setCalls(calls.filter(c => c.id !== callId));
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete call log.");
    }
  };

  const filtered = calls.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.phone.includes(search)) return false;
    if (outcomeFilter && c.outcome !== outcomeFilter.toLowerCase()) return false;
    return true;
  });

  return (
    <>
      <DashboardHeader title="Call History" />
      <div className="p-6 page-transition space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 glass-card px-3 py-2 rounded-lg flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
            />
          </div>
          <div className="flex items-center gap-2 glass-card px-3 py-2 rounded-lg">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-foreground cursor-pointer"
            >
              <option value="" className="bg-card">All Outcomes</option>
              <option value="Booking" className="bg-card">Booked</option>
              <option value="Transfer" className="bg-card">Transferred</option>
              <option value="Inquiry" className="bg-card">Inquiry</option>
            </select>
          </div>
          <button 
            onClick={fetchCalls}
            className="glass-card px-4 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-sm text-muted-foreground">Fetching call logs...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <p className="text-destructive">Failed to load call logs</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30">
                    {["Phone", "Name", "Date & Time", "Duration", "Outcome", "Summary", "Actions"].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-muted-foreground">No call logs found.</td>
                    </tr>
                  ) : (
                    filtered.map((call) => (
                      <tr
                        key={call.id}
                        onClick={() => setSelected(call)}
                        className="border-b border-border/20 hover:bg-[hsl(0_0%_100%/0.03)] transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 text-sm font-mono">{call.phone}</td>
                        <td className="px-4 py-3 text-sm font-medium">{call.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{call.date}</td>
                        <td className={`px-4 py-3 text-sm font-mono flex items-center gap-2 ${durationColor(call.durationSec)}`}>
                          {call.duration}
                          {call.recordingStatus === 'completed' && <Volume2 className="w-3.5 h-3.5 text-accent" />}
                        </td>
                        <td className="px-4 py-3">{outcomeBadge(call.outcome as any)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{call.summary}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected(call);
                              }}
                              className="p-1.5 rounded-md hover:bg-primary/10 transition-colors text-muted-foreground hover:text-accent"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {call.recordingStatus === 'completed' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(call.id);
                                }}
                                className="p-1.5 rounded-md hover:bg-accent/10 transition-colors text-muted-foreground hover:text-accent"
                                title="Download Recording"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(call.id);
                              }}
                              className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                              title="Delete Call"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => {
            setSelected(null);
            setAudioUrl(null);
            setPlayingId(null);
          }}>
            <div className="glass-card rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 m-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Call Details</h2>
                <button onClick={() => {
                  setSelected(null);
                  setAudioUrl(null);
                  setPlayingId(null);
                }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Recording Player */}
              {selected.recordingStatus === "completed" && (
                <div className="mb-6 p-4 bg-accent/5 border border-accent/20 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5" /> Call Recording
                    </p>
                    <button 
                      onClick={() => handleDownload(selected.id)}
                      className="flex items-center gap-1 text-[10px] bg-accent/10 text-accent px-2 py-1 rounded hover:bg-accent/20 transition-colors"
                    >
                      <Download className="w-3 h-3" /> Download MP3
                    </button>
                  </div>
                  {playingId === selected.id && audioUrl ? (
                    <audio controls autoPlay className="w-full h-10 accent-accent">
                      <source src={audioUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  ) : (
                    <button 
                      onClick={() => fetchSignedUrl(selected.id)}
                      className="w-full py-3 bg-accent text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-accent/90 transition-all shadow-glow"
                    >
                      <Play className="w-4 h-4 fill-current" /> Listen to Recording
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass-card p-4">
                  <p className="text-xs text-muted-foreground">Caller</p>
                  <p className="text-sm font-medium mt-1">{selected.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{selected.phone}</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-xs text-muted-foreground">Call Info</p>
                  <p className="text-sm font-medium mt-1 uppercase">{selected.duration} · {selected.outcome}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selected.date}</p>
                </div>
              </div>

              {/* Summary */}
              <div className="glass-card p-4 mb-4">
                <p className="text-xs text-muted-foreground mb-2">AI Summary</p>
                <p className="text-sm leading-relaxed">{selected.summary}</p>
              </div>

              {/* Transcript */}
              <div className="glass-card p-4">
                <p className="text-xs text-muted-foreground mb-3">Transcript</p>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {selected.transcript && selected.transcript.length > 0 ? (
                    selected.transcript.map((t, i) => (
                      <div key={i} className="flex gap-3">
                        <span className={`text-xs font-semibold shrink-0 w-16 ${t.role === 'assistant' ? 'text-accent' : 'text-foreground'}`}>
                          {t.role === 'assistant' ? 'AGENT' : 'CALLER'}:
                        </span>
                        <p className="text-sm text-muted-foreground">{t.content}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No transcript available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CallHistory;
