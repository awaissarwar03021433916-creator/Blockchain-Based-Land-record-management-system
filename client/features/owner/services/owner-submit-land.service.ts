import { api } from "@/lib/api/client";
import type { OwnerLand } from "@/types/owner";

/**
 * Owner submit-land service — typed wrapper over the new-land
 * registration endpoint.
 *
 * Endpoint note: the registry uses TWO endpoints under `/api/land`:
 *   • POST /api/land/register  — submit a NEW plot for verification
 *                                (pending → admin approves → on-chain)
 *   • POST /api/land/submit    — list an ALREADY-REGISTERED plot for
 *                                sale on the marketplace
 *
 * This service drives the FORMER. The body shape (plotNumber + location
 * + area) only fits `/register`; `/submit` is keyed off plot+location
 * coordinates of an existing land and does not accept `area`. Backend
 * reference: `server/controllers/land.controller.js#registerNewLand`.
 *
 * Errors flow through the api client's interceptor — every method
 * here resolves with the typed body or rejects with a typed
 * `ApiError` subclass. The most common rejection is `ValidationError`
 * (missing/oversized fields) or 400 "Plot already exists at this
 * location" — both surface as `ValidationError` here.
 */

const LAND_BASE = "/api/land";

export interface SubmitLandRequest {
  plotNumber: string;
  location: string;
  area: string;
}

export interface SubmitLandResponse {
  message: string;
  land: OwnerLand;
}

export const ownerSubmitLandService = {
  /**
   * `POST /api/land/register`
   *
   * Creates a new Land doc with status === "pending" and the caller as
   * `owner`. The land is NOT on-chain yet; an admin must approve before
   * the chain leg fires (see `admin.controller.js#approveLand`).
   */
  submit: (body: SubmitLandRequest): Promise<SubmitLandResponse> =>
    api.post<SubmitLandResponse>(`${LAND_BASE}/register`, body),
};

export type OwnerSubmitLandService = typeof ownerSubmitLandService;
