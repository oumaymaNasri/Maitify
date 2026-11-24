import { redirect } from "next/navigation";

type PageProps = { searchParams?: { machineId?: string } };

/** La création se fait désormais dans le modal de la page Planning. */
export default function NewPreventivePlanPage({ searchParams }: PageProps) {
  const params = new URLSearchParams({ new: "1" });
  if (searchParams?.machineId) params.set("machineId", searchParams.machineId);
  redirect(`/preventive-planning?${params.toString()}`);
}
