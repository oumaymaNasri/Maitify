import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEFAULT_PAGE_SIZE } from "@/lib/db/pagination";

export function TablePageSkeleton({
  columns = 6,
  rows = DEFAULT_PAGE_SIZE,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Chargement du tableau">
      <Skeleton className="h-10 w-full max-w-sm" />
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRow key={i} className={i % 2 === 1 ? "bg-slate-50" : undefined}>
                {Array.from({ length: columns }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full max-w-[12rem]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-center border-t border-slate-200 p-4">
          <Skeleton className="h-9 w-52" />
        </div>
      </div>
    </div>
  );
}
