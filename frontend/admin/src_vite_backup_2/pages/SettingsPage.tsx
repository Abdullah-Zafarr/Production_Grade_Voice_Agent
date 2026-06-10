import { DashboardHeader } from "@/components/DashboardHeader";
import { User, Bell, Shield, Save, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

const SettingsPage = () => {
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        name: "Admin User",
        email: "admin@soulimaging.com",
        clinicName: "Soul Imaging Radiology Clinic",
    });
    const [notifications, setNotifications] = useState({
        email: true,
        missedCalls: true,
        weeklyReport: true,
    });

    // Load settings from backend on mount
    useEffect(() => {
        fetch(`${API_URL}/api/agent/config`)
            .then(res => res.json())
            .then(data => {
                if (data.clinic_profile) setProfile(data.clinic_profile);
                if (data.notifications) setNotifications(data.notifications);
            })
            .catch(err => console.error("Error loading settings:", err));
    }, []);

    const handleSave = async () => {
        try {
            setSaving(true);
            // Persist profile locally
            localStorage.setItem("soulbot_profile", JSON.stringify(profile));

            // Also update clinic_settings via backend
            await fetch(`${API_URL}/api/agent/config`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clinic_profile: profile,
                    notifications,
                }),
            });

            toast.success("Settings saved successfully!");
        } catch (err) {
            toast.error("Save failed. Check the API server.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <DashboardHeader title="Settings" />
            <div className="p-6 page-transition space-y-6 max-w-3xl">
                {/* Profile */}
                <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <User className="w-5 h-5 text-accent" />
                        <h3 className="font-semibold">Profile</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block">Full Name</label>
                            <input
                                value={profile.name}
                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                className="w-full bg-input border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
                            <input
                                value={profile.email}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                className="w-full bg-input border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs text-muted-foreground mb-1.5 block">Clinic Name</label>
                            <input
                                value={profile.clinicName}
                                onChange={(e) => setProfile({ ...profile, clinicName: e.target.value })}
                                className="w-full bg-input border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className="bg-card/80 backdrop-blur-xl rounded-xl border border-white/10 p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Bell className="w-5 h-5 text-accent" />
                        <h3 className="font-semibold">Notifications</h3>
                    </div>
                    {Object.entries(notifications).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                            <button
                                onClick={() => setNotifications({ ...notifications, [key]: !val })}
                                className={`w-11 h-6 rounded-full transition-colors ${val ? "bg-accent" : "bg-border"} relative`}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform ${val ? "left-[22px]" : "left-0.5"}`} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Privacy */}
                <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5 text-accent" />
                        <h3 className="font-semibold">Privacy &amp; Data</h3>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">Data Retention (days)</label>
                        <select className="bg-input border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent">
                            <option className="bg-card">30 days</option>
                            <option className="bg-card">90 days</option>
                            <option className="bg-card">180 days</option>
                            <option className="bg-card">365 days</option>
                        </select>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-4 py-2 rounded-lg glass text-sm text-foreground hover:bg-[hsl(0_0%_100%/0.08)] transition-colors">
                            Export Data
                        </button>
                        <button className="px-4 py-2 rounded-lg bg-destructive/15 text-destructive text-sm hover:bg-destructive/25 transition-colors">
                            Delete All Data
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>
        </>
    );
};

export default SettingsPage;
