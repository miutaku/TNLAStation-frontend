import { ArrowLeft, RadioTower } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto mt-20 max-w-lg text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-xl bg-primary/10 text-primary">
        <RadioTower aria-hidden="true" className="size-7" />
      </span>
      <p className="mt-5 text-xs font-bold tracking-[0.18em] text-primary uppercase">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">ページが見つかりません</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">URL が変更されたか、ページが削除された可能性があります。</p>
      <Link href="/" className={buttonVariants({ className: "mt-6" })}>
        <ArrowLeft aria-hidden="true" />
        ホームへ戻る
      </Link>
    </div>
  );
}
