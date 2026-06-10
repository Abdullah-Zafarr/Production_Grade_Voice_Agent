import { DashboardHeader } from "@/components/DashboardHeader";
import { UserPlus, MoreVertical, Trash2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string;
}

const TeamManagement = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [invitePassword, setInvitePassword] = useState("");
    const [inviteName, setInviteName] = useState("");
    const [inviteRole, setInviteRole] = useState("Admin");

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/team`);
            const data = await res.json();

            const mapped = data.map((m: any) => ({
                id: m.id,
                name: m.name,
                email: m.email,
                role: m.role,
                avatar: m.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
            }));

            setMembers(mapped);

            // Sync local storage for the login page authorization
            const emails = mapped.map((m: any) => m.email.toLowerCase());
            localStorage.setItem("soulbot_authorized_emails", JSON.stringify(emails));

        } catch (err) {
            console.error("Error fetching team:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail || !inviteName) {
            toast.error("Please provide both name and email.");
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/team`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: inviteName,
                    email: inviteEmail,
                    password: invitePassword,
                    role: inviteRole,
                }),
            });

            if (!response.ok) throw new Error("Invite failed");

            toast.success(`${inviteName} has been granted access!`);
            setShowInvite(false);
            setInviteName("");
            setInviteEmail("");
            fetchMembers();
        } catch (error) {
            toast.error("Failed to grant access. Check API server.");
        } finally {
            setLoading(false);
        }
    };

    const removeMember = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to revoke access for ${name}?`)) return;

        try {
            const response = await fetch(`${API_URL}/api/team/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error("Delete failed");

            toast.success(`Access revoked for ${name}`);
            fetchMembers();
        } catch (error) {
            toast.error("Failed to revoke access.");
        }
    };

    return (
        <>
            <DashboardHeader title="Team Management" />
            <div className="p-6 page-transition space-y-6 max-w-4xl">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{members.length} authorized team members</p>
                    <button
                        onClick={() => setShowInvite(!showInvite)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        <UserPlus className="w-4 h-4" /> {showInvite ? "Cancel" : "Add Member"}
                    </button>
                </div>

                {showInvite && (
                    <div className="glass-card p-6 animate-fade-in space-y-4">
                        <h3 className="font-semibold text-gradient">Grant Medical Access</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <input
                                placeholder="Full Name"
                                value={inviteName}
                                onChange={(e) => setInviteName(e.target.value)}
                                className="bg-input border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
                            />
                            <input
                                placeholder="Email address"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="bg-input border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
                            />
                            <input
                                placeholder="Initial Password"
                                type="password"
                                value={invitePassword}
                                onChange={(e) => setInvitePassword(e.target.value)}
                                className="bg-input border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
                            />
                            <select
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value)}
                                className="bg-input border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
                            >
                                {["Super Admin", "Admin", "Manager", "Viewer"].map((r) => (
                                    <option key={r} value={r} className="bg-card">{r}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleInvite}
                                className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors shadow-glow"
                            >
                                Grant Access
                            </button>
                        </div>
                    </div>
                )}

                <div className="glass-card rounded-xl overflow-hidden border border-border/30 shadow-lg">
                    {loading ? (
                        <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="bg-muted/30 border-b border-border/30">
                                    {["Member", "Role", "Actions"].map((h) => (
                                        <th key={h} className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-4">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((m) => (
                                    <tr key={m.id} className="border-b border-border/10 hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/80 to-accent/80 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                                                    {m.avatar}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold">{m.name}</p>
                                                    <p className="text-xs text-muted-foreground/80">{m.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${m.role === 'Super Admin' || m.role === 'Administrator' ? 'bg-primary/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                                                }`}>
                                                {m.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => removeMember(m.id, m.name)}
                                                    className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
};

export default TeamManagement;
