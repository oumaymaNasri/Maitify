import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: { page?: string; detail?: string };
};

export default function MachinesRedirectPage({ searchParams }: PageProps) {
  const params = new URLSearchParams();
  if (searchParams?.page) params.set("page", searchParams.page);
  if (searchParams?.detail) params.set("detail", searchParams.detail);
  const qs = params.toString();
  redirect(qs ? `/donnees-de-base/machines?${qs}` : "/donnees-de-base/machines");
}
