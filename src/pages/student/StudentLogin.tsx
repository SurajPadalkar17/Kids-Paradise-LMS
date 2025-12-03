import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { GraduationCap, Mail, Lock } from "lucide-react";

const StudentLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Check if user is student
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.role !== "student") {
        await supabase.auth.signOut();
        toast.error("This portal is for students only!");
        setLoading(false);
        return;
      }

      toast.success(`Welcome back, ${profile.full_name}! 🎉`);
      navigate("/student/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Student Login" />
      
      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <Card className="w-full max-w-md p-8 space-y-6 border-2 border-accent/20">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto">
              <GraduationCap className="h-10 w-10 text-accent-foreground" />
            </div>
            <h2 className="text-3xl font-bold">Student Portal</h2>
            <p className="text-muted-foreground">Log in to explore your library! 📚</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-lg">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-12 text-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-lg">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 h-12 text-lg"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg bg-accent hover:bg-accent/90"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login to Library"}
            </Button>
          </form>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => navigate("/")}
              className="text-muted-foreground"
            >
              ← Back to Home
            </Button>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default StudentLogin;
