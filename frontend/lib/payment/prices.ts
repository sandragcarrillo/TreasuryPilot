export type PaidRouteId =
  | "evaluate-proposal"
  | "evaluate-report"
  | "submit-proposal"
  | "submit-report"
  | "create-org";

// Mirror of ROUTE_PRICE_USD in lib/server/x402/config.ts.
// Kept here separately because the server config is `import "server-only"`.
// If you change one, change the other.
export const ROUTE_PRICE_USD: Record<PaidRouteId, number> = {
  "evaluate-proposal": 1.5,
  "evaluate-report": 0.75,
  "submit-proposal": 1.0,
  "submit-report": 0.25,
  "create-org": 2.0,
};

export function formatUsdcCost(routeId: PaidRouteId): string {
  const price = ROUTE_PRICE_USD[routeId];
  return `${price.toFixed(2)} USDC`;
}
