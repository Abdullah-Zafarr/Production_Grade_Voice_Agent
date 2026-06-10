import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogIn, Lock, Mail } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("soulbot_auth", "true");
        localStorage.setItem("soulbot_user", JSON.stringify(data.user));
        toast.success(`Access Granted. Welcome back, ${data.user.name}.`);
        router.push("/");
      } else {
        toast.error(data.detail || "Access Denied. Invalid credentials.");
        setIsLoading(false);
      }
    } catch (err) {
      toast.error("Connection failed. Ensure the API server is running.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b111b] p-4 relative overflow-hidden">
      {/* Decorative clinical background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px]"></div>

      <Card className="w-full max-w-md border-white/10 shadow-2xl backdrop-blur-xl bg-slate-950/40 z-10 animate-in fade-in zoom-in duration-500">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 border border-white/5">
            <img src="/orb/logo/favicon.png?v=4" alt="Soul Imaging" className="w-12 h-12 rounded-xl shadow-glow" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Soul Imaging</CardTitle>
          <CardDescription className="text-slate-400">
            Secure portal for Soul Imaging administrators
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Medical Registry Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@soulimaging.com" 
                  required 
                  className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-600 focus:ring-accent/50 h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Security Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  required 
                  className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-600 focus:ring-accent/50 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button 
              type="submit" 
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 transition-all duration-300 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Authenticating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Access Dashboard
                </div>
              )}
            </Button>
          </CardFooter>
        </form>
        <div className="px-6 pb-6 text-center">
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 opacity-60">
            Protected by Soul Imaging Enterprise Security
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
