export type GlobalSearchScope = "all" | "machines" | "maintenance" | "stock";

export type GlobalSearchHitKind = "machine" | "maintenance_order" | "intervention" | "part";

export type GlobalSearchHit = {
  id: string;
  kind: GlobalSearchHitKind;
  title: string;
  subtitle: string;
  href: string;
};

export type GlobalSearchResponse = {
  machines: GlobalSearchHit[];
  maintenance: GlobalSearchHit[];
  parts: GlobalSearchHit[];
};
