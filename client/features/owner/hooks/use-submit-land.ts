"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { qk } from "@/config/query-keys";
import {
  ownerSubmitLandService,
  type SubmitLandRequest,
  type SubmitLandResponse,
} from "@/features/owner/services/owner-submit-land.service";

/**
 * `useSubmitLandMutation` — register a new land for admin verification.
 *
 * On success:
 *   • Invalidate `qk.owner.myLands` so the portfolio page refetches and
 *     the freshly-submitted (pending) row appears at the top.
 *
 * Errors are NOT caught here — the api client's response interceptor
 * has already classified them into typed `ApiError` subclasses; the
 * page-level form decides how to display them (toast vs inline).
 * Centralising the catch here would steal that control from the call
 * site.
 */
export function useSubmitLandMutation(): UseMutationResult<
  SubmitLandResponse,
  Error,
  SubmitLandRequest
> {
  const qc = useQueryClient();
  return useMutation<SubmitLandResponse, Error, SubmitLandRequest>({
    mutationFn: (body) => ownerSubmitLandService.submit(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.owner.myLands });
    },
  });
}
