import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadRenterRentalDetail } from "@/lib/renter-rentals";
import { RenterRentalDetail } from "@/components/renter-rental-detail";

export const dynamic = "force-dynamic";

export default async function MyRentalDetailPage({
  params,
}: PageProps<"/my-rentals/[id]">) {
  const { user, supabase } = await requireUser();

  const { data: me } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if ((me as { is_admin?: boolean } | null)?.is_admin) redirect("/admin");

  const { id } = await params;
  const detail = await loadRenterRentalDetail(supabase, user.id, id);
  if (!detail) notFound();

  return <RenterRentalDetail data={detail} backHref="/my-rentals" />;
}
