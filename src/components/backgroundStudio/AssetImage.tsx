import { useEffect, useState } from "react";
import { studioAsset } from "@/lib/backgroundStudio/storage";
export function AssetImage({
  assetKey,
  alt = "",
  className = "",
}: {
  assetKey: string;
  alt?: string;
  className?: string;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let cancelled = false,
      current = "";
    setUrl("");
    void studioAsset(assetKey)
      .then((blob) => {
        if (!cancelled) {
          current = URL.createObjectURL(blob);
          setUrl(current);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (current) URL.revokeObjectURL(current);
    };
  }, [assetKey]);
  return url ? (
    <img src={url} alt={alt} className={className} draggable={false} />
  ) : (
    <div
      className={`${className} bg-muted`}
      aria-label="Image preview unavailable"
    />
  );
}
