import { LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface HeaderProps {
  title: string;
  userName?: string;
  showLogout?: boolean;
}

export const Header = ({ title, userName, showLogout = false }: HeaderProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error logging out");
      return;
    }
    toast.success("Logged out successfully!");
    navigate("/");
  };

  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Kids Paradise School Logo" 
              className="h-12 w-12 object-contain"
            />
            <div className="ml-2">
              <h1 className="text-2xl font-bold">{title}</h1>
              {userName && (
                <p className="text-sm opacity-90">Welcome, {userName}!</p>
              )}
            </div>
          </div>
          {showLogout && (
            <Button
              variant="secondary"
              size="lg"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
