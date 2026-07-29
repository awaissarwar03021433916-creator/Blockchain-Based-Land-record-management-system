export type LandStatus = "pending" | "approved" | "rejected";

export interface Land {
  id: string;
  title: string;
  location: string;
  status: LandStatus;
}
