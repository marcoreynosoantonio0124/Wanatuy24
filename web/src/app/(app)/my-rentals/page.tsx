import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadRenterRentals } from "@/lib/renter-rentals";
import { firstName } from "@/lib/format";
import { RenterRentalsList } from "@/components/renter-rentals-list";
import { PageWallpaper } from "@/components/page-wallpaper";

export const dynamic = "force-dynamic";

export default async function MyRentalsPage() {
  const { user, supabase } = await requireUser();

  // Founder / admin accounts are monitoring-only — send them to the Command Center.
  const { data: me } = await supabase
    .from("users")
    .select("is_admin, full_name")
    .eq("id", user.id)
    .single();
  const meRow = me as { is_admin?: boolean; full_name?: string | null } | null;
  if (meRow?.is_admin) redirect("/admin");

  const data = await loadRenterRentals(supabase, user.id);

  const greetingName = firstName(meRow?.full_name, user.email);

  return (
    <>
      <PageWallpaper src="/renter-hero.jpg" />
      <RenterRentalsList data={data} greetingName={greetingName} />
    </>
  );
}
