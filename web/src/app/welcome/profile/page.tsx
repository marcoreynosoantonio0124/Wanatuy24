import Image from "next/image";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DuskScene } from "@/components/dusk-scene";
import { ProfileForm } from "@/components/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user, supabase } = await requireUser();

  const { data, error } = await supabase
    .from("users")
    .select("role, is_admin, full_name, phone, profile_completed")
    .eq("id", user.id)
    .single();
  const me = data as {
    role?: string | null;
    is_admin?: boolean | null;
    full_name?: string | null;
    phone?: string | null;
    profile_completed?: boolean | null;
  } | null;

  if (!error && me?.is_admin) redirect("/admin");
  // No role yet → go back to pick one.
  if (!error && !me?.role) redirect("/welcome");
  // Already done → straight to their dashboard.
  if (!error && me?.profile_completed) {
    redirect(me.role === "tenant" ? "/my-rentals" : "/dashboard");
  }

  const isRenter = me?.role === "tenant";
  const mascot = isRenter ? "/meet-mascot.png" : "/due-mascot.png";
  const mascotName = isRenter ? "MEET" : "DUE";
  const defaultName =
    me?.full_name ?? (user.email ?? "").split("@")[0].replace(/[._]/g, " ");

  return (
    <main className="relative isolate flex min-h-screen flex-col text-white">
      <DuskScene
        silhouetteOnly
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-slate-950/70 via-slate-950/80 to-slate-950/95" />

      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
        <div className="mb-5 flex items-end gap-3">
          <Image
            src={mascot}
            alt={`${mascotName} mascot`}
            width={120}
            height={200}
            priority
            className="h-24 w-auto drop-shadow-xl"
          />
          <div className="pb-2">
            <p className="text-sm font-medium text-emerald-300">
              Almost there! 🎉
            </p>
            <h1 className="text-2xl font-bold">Tell us about yourself</h1>
            <p className="mt-0.5 text-sm text-white/70">
              A quick one-time record for your account — needed for every
              agreement.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
          <ProfileForm
            defaultName={defaultName}
            defaultPhone={me?.phone ?? ""}
          />
        </div>
      </div>
    </main>
  );
}
