import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadRenterRentals } from "@/lib/renter-rentals";
import { RenterRentalsList } from "@/components/renter-rentals-list";
import { PageWallpaper } from "@/components/page-wallpaper";

export const dynamic = "force-dynamic";

export default async function MyRentalsPage() {
  const { user, supabase } = await requireUser();

  // Founder / admin accounts are monitoring-only — send them to the Command Center.
  const { data: me } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if ((me as { is_admin?: boolean } | null)?.is_admin) redirect("/admin");

  const data = await loadRenterRentals(supabase, user.id);

  const first = (user.email ?? "there").split("@")[0].split(/[._+]/)[0];
  const greetingName = first.charAt(0).toUpperCase() + first.slice(1);

  return (
    <>
      <PageWallpaper src="/renter-hero.jpg" />
      <RenterRentalsList data={data} greetingName={greetingName} />
    </>
  );
}
