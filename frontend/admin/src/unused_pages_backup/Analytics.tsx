"use client";

import { DashboardHeader } from "@/components/DashboardHeader";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const tooltipStyle = {
    background: "hsl(222 47% 13%)",
    border: "1px solid hsl(217 33% 17%)",
    borderRadius: "8px",
    color: "#E5E7EB",
};

const OUTCOME_COLORS: Record<string, string> = {
    booking: "#10B981",
    transfer: "#3B82F6",
    inquiry: "#F59E0B",
    other: "#6B7280",
};

const API_URL = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || "") : "";

const Analytics = () => {
    const [loading, setLoading] = useState(true);
    const [callTrend, setCallTrend] = useState<any[]>([]);
    const [outcomes, setOutcomes] = useState<any[]>([]);
    const [durations, setDurations] = useState<any[]>([]);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch(`${API_URL}/api/analytics`);
            if (!res.ok) throw new Error(`API error ${res.status}`);
            const payload = await res.json();

            const trend = (payload.trend || []).map((t: any) => ({
                week: t.day,
                calls: t.calls,
            }));
            setCallTrend(trend);

            const total = Object.values(payload.outcomes || {}).reduce((a: number, b: any) => a + Number(b), 0) || 1;
            const outcomeArr = Object.entries(payload.outcomes || {}).map(([name, count]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value: Math.round((Number(count) / total) * 100),
                color: OUTCOME_COLORS[name] || "#6B7280",
            }));
            setOutcomes(outcomeArr);

            setDurations(payload.durations || []);
        } catch (err) {
            console.error("Analytics error:", err);
        } finally {
            setLoading(false);
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
            <DashboardHeader title="Analytics" />
            <div className="p-6 page-transition space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glass-card p-6">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4">Calls This Week</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={callTrend}>
                                <XAxis dataKey="week" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Line type="monotone" dataKey="calls" stroke="#3B82F6" strokeWidth={2} dot={{ fill: "#3B82F6", r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4">Call Outcomes</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={outcomes} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                                    {outcomes.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap justify-center gap-4 mt-2">
                            {outcomes.map((d) => (
                                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                                    <span className="text-muted-foreground">{d.name}</span>
                                    <span className="font-medium">{d.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">Call Duration Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={durations}>
                            <XAxis dataKey="range" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </>
    );
};

export default Analytics;
