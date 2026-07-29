type LandStatusBadgeProps = {
  status?: string;
};

export default function LandStatusBadge({ status = "unknown" }: LandStatusBadgeProps) {
  return <span>{status}</span>;
}
