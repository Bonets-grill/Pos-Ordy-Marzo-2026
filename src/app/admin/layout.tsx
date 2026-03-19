import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase-server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <main style={{ minHeight: "100vh" }}>{children}</main>
    </div>
  );
}
