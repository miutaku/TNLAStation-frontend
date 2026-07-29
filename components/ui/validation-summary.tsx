import { Alert, AlertDescription } from "@/components/ui/alert";

export function ValidationSummary({ errors }: { errors: readonly string[] }) {
  if (errors.length === 0) return null;

  return (
    <Alert role="alert" className="border-destructive/40">
      <AlertDescription>
        <p className="font-semibold">入力内容を確認してください。</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {errors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
