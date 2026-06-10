import { DashboardHeader } from "@/components/DashboardHeader";
import { useState, useEffect } from "react";
import { Search, Filter, Eye, X, Loader2, Headphones, Play, Pause } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

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
    recordingStatus: 'none' | 'pending' | 'completed' | 'failed';
    recordingUrl?: string; // This will store the signed URL when fetched
}

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

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
    const [loadingAudio, setLoadingAudio] = useState(false);

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
                recordingStatus: c.recording_status || "none",
                transcript: c.transcript || []
            }));

            setCalls(mappedCalls);
        } catch (err: any) {
            console.error("Error fetching calls:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePlayRecording = async (call: Call) => {
        if (call.recordingStatus !== 'completed') return;

        try {
            setLoadingAudio(true);
            const res = await fetch(`${API_URL}/api/recordings/${call.id}/url`);
            if (!res.ok) throw new Error("Failed to get recording link");
            const data = await res.json();

            // Update the selected call's recording URL so it can be played
            if (selected?.id === call.id) {
                setSelected({ ...selected, recordingUrl: data.url });
            }
            setPlayingId(call.id);
        } catch (err) {
            console.error("Audio error:", err);
            // Fallback: simple alert for now
            toast({
                title: "Recording Unavailable",
                description: "The audio link has expired or is still being processed. Please refresh and try again.",
                variant: "destructive",
            });
        } finally {
            setLoadingAudio(false);
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
                                        {["Phone", "Name", "Date & Time", "Duration", "Outcome", "Rec", "Actions"].map((h) => (
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
                                                <td className={`px-4 py-3 text-sm font-mono ${durationColor(call.durationSec)}`}>{call.duration}</td>
                                                <td className="px-4 py-3">{outcomeBadge(call.outcome as any)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center">
                                                        {call.recordingStatus === 'completed' ? (
                                                            <Headphones className="w-4 h-4 text-accent animate-pulse-slow" title="Recording available" />
                                                        ) : call.recordingStatus === 'pending' ? (
                                                            <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" title="Processing recording..." />
                                                        ) : (
                                                            <span className="text-muted-foreground/30">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="p-1.5 rounded-md hover:bg-primary/10 transition-colors text-muted-foreground hover:text-accent"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelected(call);
                                                            }}
                                                        >
                                                            <Eye className="w-4 h-4" />
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setSelected(null)}>
                        <div className="glass-card rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 m-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold">Call Details</h2>
                                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

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

                            {/* Recording Player */}
                            {selected.recordingStatus === 'completed' && (
                                <div className="glass-card p-4 mb-4 border border-accent/20">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-2">
                                            <Headphones className="w-3.5 h-3.5" /> Call Recording
                                        </p>
                                        {loadingAudio && <Loader2 className="w-3 h-3 animate-spin text-accent" />}
                                    </div>

                                    {!selected.recordingUrl ? (
                                        <button
                                            onClick={() => handlePlayRecording(selected)}
                                            disabled={loadingAudio}
                                            className="w-full py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Loader2 className={`w-4 h-4 ${loadingAudio ? 'animate-spin' : 'hidden'}`} />
                                            Load Audio Recording
                                        </button>
                                    ) : (
                                        <audio controls className="w-full h-10 custom-audio-player">
                                            <source src={selected.recordingUrl} type="audio/mpeg" />
                                            Your browser does not support the audio element.
                                        </audio>
                                    )}
                                </div>
                            )}

                            {selected.recordingStatus === 'pending' && (
                                <div className="glass-card p-4 mb-4 border border-warning/20">
                                    <p className="text-xs text-warning flex items-center gap-2">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Recording is processing... please wait a moment.
                                    </p>
                                </div>
                            )}

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
