import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
export function DbErrorHint({ detail }: { detail?: string }) {
  return (
    <Card className="mx-auto mt-8 max-w-lg border-destructive/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-destructive">Base de données inaccessible</CardTitle>
        <CardDescription>
          Démarrez Docker (<code className="text-xs">docker compose up -d</code>), vérifiez{" "}
          <code className="text-xs">.env</code> puis{" "}
          <code className="text-xs">npm run db:push</code>. Pour importer Access :{" "}
          <code className="text-xs">npm run import:access</code>.
        </CardDescription>
      </CardHeader>
      {detail ? (
        <CardContent>
          <p className="text-xs text-muted-foreground break-all">{detail}</p>
        </CardContent>
      ) : null}
      <CardContent className="pt-0">
        <ButtonLink href="/dashboard" variant="outline" size="sm">
          Réessayer
        </ButtonLink>
      </CardContent>
    </Card>
  );
}
