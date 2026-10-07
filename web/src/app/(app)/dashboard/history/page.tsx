import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadLessorHistory } from "@/lib/lessor-history";
import { LessorHistoryView } from "@/components/lessor-history-view";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const { user, supabase } = await requireUser();

  const { data: me } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if ((me as { is_admin?: boolean } | null)?.is_admin) redirect("/admin");

  const data = await loadLessorHistory(supabase);
  return <LessorHistoryView data={data} />;
}
