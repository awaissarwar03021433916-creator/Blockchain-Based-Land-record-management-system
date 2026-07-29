import { useMemo } from "react";
import type { Land } from "./land-types";

export function useLands(initialData: Land[] = []) {
  return useMemo(() => initialData, [initialData]);
}
