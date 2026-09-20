"use client";

import { DbErrorHint } from "@/components/layout/DbError";

export default function MachineHistoryError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return <DbErrorHint detail={error.message || error.digest} />;
}
