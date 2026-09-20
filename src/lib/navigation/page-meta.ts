export type PageMeta = {
  title: string;
  subtitle?: string;
};

const exact: Record<string, PageMeta> = {
  "/dashboard": { title: "Tableau de bord", subtitle: "Pilotage technique & conformité" },
  "/donnees-de-base": { title: "Données de base", subtitle: "Machines & techniciens" },
  "/donnees-de-base/machines": { title: "Machines", subtitle: "Parc équipements & statuts" },
  "/donnees-de-base/technicians": { title: "Techniciens", subtitle: "Profils & spécialités" },
  "/machines": { title: "Machines", subtitle: "Parc équipements & statuts" },
  "/interventions": { title: "Liste de Maintenance", subtitle: "Historique maintenance" },
  "/interventions/new": { title: "Nouvelle intervention", subtitle: "Saisie terrain" },
  "/maintenance-orders": { title: "Ordres de maintenance journaliers", subtitle: "Un bon de travail par jour — préventif et correctif" },
  "/technicians": { title: "Techniciens", subtitle: "Profils & spécialités" },
  "/parts": { title: "Pièces de rechange", subtitle: "Stock & seuils d'alerte" },
  "/stock": { title: "Stock & Pièces", subtitle: "Inventaire, alertes et mouvements" },
  "/water-quality": { title: "Qualité de l'eau", subtitle: "Relevés & conformité" },
};

export function getPageMeta(pathname: string | null): PageMeta {
  if (!pathname) return { title: "NutriFish GMAO" };
  if (exact[pathname]) return exact[pathname];
  if (pathname.startsWith("/interventions")) return exact["/interventions"]!;
  if (pathname.startsWith("/maintenance-orders")) return exact["/maintenance-orders"]!;
  if (pathname.startsWith("/donnees-de-base")) return exact["/donnees-de-base"]!;
  if (pathname.startsWith("/machines")) return exact["/machines"]!;
  return { title: "NutriFish GMAO", subtitle: "Maintenance industrielle" };
}
