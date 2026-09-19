export type PageMeta = {
  title: string;
  subtitle?: string;
};

const exact: Record<string, PageMeta> = {
  "/dashboard": { title: "Tableau de bord", subtitle: "Pilotage technique & conformité" },
  "/machines": { title: "Liste des Machines", subtitle: "Parc équipements & statuts" },
  "/interventions": { title: "Liste de Maintenance", subtitle: "Historique maintenance" },
  "/interventions/new": { title: "Nouvelle intervention", subtitle: "Saisie terrain" },
  "/maintenance-orders": { title: "Ordre de maintenance", subtitle: "Planification Directeur" },
  "/technicians": { title: "Liste des Techniciens", subtitle: "Profils & spécialités" },
  "/parts": { title: "Pièces de rechange", subtitle: "Stock & seuils d'alerte" },
  "/stock": { title: "Stock & Pièces", subtitle: "Inventaire, alertes et mouvements" },
  "/water-quality": { title: "Qualité de l'eau", subtitle: "Relevés & conformité" },
};

export function getPageMeta(pathname: string | null): PageMeta {
  if (!pathname) return { title: "NutriFish GMAO" };
  if (exact[pathname]) return exact[pathname];
  if (pathname.startsWith("/interventions")) return exact["/interventions"]!;
  if (pathname.startsWith("/maintenance-orders")) return exact["/maintenance-orders"]!;
  if (pathname.startsWith("/machines")) return exact["/machines"]!;
  return { title: "NutriFish GMAO", subtitle: "Maintenance industrielle" };
}
