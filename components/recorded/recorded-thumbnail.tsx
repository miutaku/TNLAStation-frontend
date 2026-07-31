import { Film } from "lucide-react";

import { apiClient } from "@/lib/api/client";
import type { RecordedItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * 録画のサムネイル。まだ無い録画も並ぶので、代わりの絵を同じ枠で出して大きさを揃える。
 */
export function RecordedThumbnail({
  item,
  className,
  iconClassName,
}: {
  item: Pick<RecordedItem, "thumbnails">;
  className?: string;
  iconClassName?: string;
}) {
  if (item.thumbnails && item.thumbnails.length > 0) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={apiClient.thumbnailUrl(item.thumbnails[0])}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn("size-full object-cover", className)}
      />
    );
  }

  return <Film aria-hidden="true" className={cn("size-12 text-primary/55", iconClassName)} strokeWidth={1.3} />;
}
