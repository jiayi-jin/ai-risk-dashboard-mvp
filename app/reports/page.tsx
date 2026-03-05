import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";

export default async function ReportsPage() {
  if (!supabaseServer) {
    redirect("/");
  }
  const { data } = await supabaseServer
    .from("analyses")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data?.id) redirect(`/analyses/${data.id}`);
  redirect("/");
}
