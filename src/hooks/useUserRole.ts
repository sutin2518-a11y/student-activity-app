import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  student_id_card?: string;
  full_name?: string;
  grade_level?: string;
  classroom?: string;
  no?: string;
  role: "student" | "teacher" | "admin";
}

export function useUserRole() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as UserProfile);
      }
      setLoading(false);
    }

    getProfile();
  }, []);

  return {
    profile,
    loading,
    isStudent: profile?.role === "student",
    isTeacher: profile?.role === "teacher",
    isAdmin: profile?.role === "admin",
  };
}