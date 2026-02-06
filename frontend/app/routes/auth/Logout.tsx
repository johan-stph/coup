import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "~/auth/AuthContext";
import { toast } from "sonner";

export default function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await logout();
        toast.success("Successfully logged out");
        navigate("/login");
      } catch (error: any) {
        console.error("Logout error:", error);
        toast.error(error.message || "Failed to log out");
        navigate("/");
      }
    };

    handleLogout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500">
      <div className="text-white text-xl">Logging out...</div>
    </div>
  );
}
