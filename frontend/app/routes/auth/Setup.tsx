import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "~/auth/AuthContext";
import { API_URL } from "~/config/environment";

export default function Setup() {
  const { getIdToken, refreshUserData, user } = useAuth();
  const [userName, setUserName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (userName.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const idToken = await getIdToken();
      const response = await fetch(`${API_URL}/user/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ userName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create profile");
      }

      await refreshUserData();
      toast.success("Profile created successfully!");
      navigate("/");
    } catch (error: any) {
      console.error("Setup error:", error);
      toast.error(error.message || "Failed to create profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-4">
            {user?.photoURL && (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-20 h-20 rounded-full mx-auto border-4 border-purple-500"
              />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome to Coup!
          </h1>
          <p className="text-gray-600">Let's set up your profile</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="userName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Choose a username
            </label>
            <input
              type="text"
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your username"
              minLength={3}
              maxLength={50}
              required
              disabled={isSubmitting}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-sm text-gray-500">
              3-50 characters, this will be visible to other players
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || userName.length < 3}
            className="w-full bg-purple-600 text-white font-semibold py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating profile...</span>
              </div>
            ) : (
              "Continue"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
