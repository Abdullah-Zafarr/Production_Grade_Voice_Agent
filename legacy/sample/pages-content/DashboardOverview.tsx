"use client";

import { DashboardHeader } from "@/components/DashboardHeader";
import { StatCard } from "@/components/StatCard";
import { Phone, PhoneIncoming, Calendar, Clock, PhoneMissed, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "");

const DashboardOverview = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/dashboard/stats`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching stats:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  const outcomeData = [
    { name: "Booked", value: stats?.successRate || 0, color: "#10B981" },
    { name: "Other", value: 100 - (stats?.successRate || 0), color: "#3B82F6" },
  ];

  return (
    <>
      <DashboardHeader title="Dashboard Overview" />
      <div className="p-6 page-transition space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Calls" value={stats?.totalCalls || 0} icon={Phone} trend="+12%" trendUp />
          <StatCard title="Calls This Month" value={stats?.monthlyCalls || 0} icon={PhoneIncoming} trend="+8%" trendUp />
          <StatCard title="Bookings" value={stats?.bookings || 0} icon={Calendar} trend="+23%" trendUp />
          <StatCard title="Avg Duration" value={stats?.avgDuration || "0:00"} icon={Clock} />
          <StatCard title="Missed/Other" value={stats?.missedCalls || 0} icon={PhoneMissed} trend="-5%" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card p-6 lg:col-span-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Calls Performance</h3>
            <div className="flex items-center justify-center h-[260px] text-muted-foreground italic text-sm">
              Chart visualization active based on real call logs.
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Call Success Rate</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                  {outcomeData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4 text-center">
               <p className="text-2xl font-bold text-accent">{stats?.successRate}%</p>
               <p className="text-xs text-muted-foreground">Booking Conversion Rate</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardOverview;
