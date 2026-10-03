export type AssignedPartVm = {
  id: string;
  designation: string;
  reference: string | null;
  quantity: number;
  minStock: number;
};

export function mergeAssignedParts(
  primary: AssignedPartVm[],
  linked: AssignedPartVm[],
): AssignedPartVm[] {
  const map = new Map<string, AssignedPartVm>();
  for (const part of [...linked, ...primary]) {
    map.set(part.id, part);
  }
  return Array.from(map.values()).sort((a, b) => a.designation.localeCompare(b.designation, "fr"));
}

export function formatAssignedPartStock(part: AssignedPartVm): string {
  return `${part.designation}${part.reference ? ` (${part.reference})` : ""} — stock ${part.quantity}`;
}
