import "server-only";
import {
  BASE_CONFIG,
  PROJECT_PAYMENT_ADDRESS,
  ROOTSTOCK_CONFIG,
  ROUTE_PRICE_USD,
  type RouteId,
  usdToUsdcAtomic,
  usdToWeiAtBtcPrice,
} from "./config";
import { getBtcUsd } from "./btc-price";

export interface BasePaymentRequirement {
  scheme: "exact";
  network: string;
  asset: string;
  maxAmountRequired: string;
  payTo: string;
  resource: string;
  description: string;
  mimeType: "application/json";
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

export interface RskPaymentRequirement {
  scheme: "sovereign-rsk";
  network: string;
  asset: "rBTC";
  maxAmountRequired: string;
  payTo: string;
  resource: string;
  description: string;
  mimeType: "application/json";
  maxTimeoutSeconds: number;
  extra: {
    chainId: number;
    decimals: number;
    confirmations: number;
    quoteValidUntil: number;
    quotedUsd: number;
    btcUsd: number;
  };
}

export type PaymentRequirement = BasePaymentRequirement | RskPaymentRequirement;

export interface PaymentChallenge {
  x402Version: 1;
  accepts: PaymentRequirement[];
  error?: string;
}

export async function buildChallenge(args: {
  routeId: RouteId;
  resource: string;
  error?: string;
}): Promise<PaymentChallenge> {
  const priceUsd = ROUTE_PRICE_USD[args.routeId];
  const description = `Axiom Pilot ${args.routeId}`;

  const baseReq: BasePaymentRequirement = {
    scheme: "exact",
    network: BASE_CONFIG.network,
    asset: BASE_CONFIG.usdcAddress,
    maxAmountRequired: usdToUsdcAtomic(priceUsd).toString(),
    payTo: PROJECT_PAYMENT_ADDRESS,
    resource: args.resource,
    description,
    mimeType: "application/json",
    maxTimeoutSeconds: 60,
    extra: {
      name: BASE_CONFIG.usdcDomainName,
      version: BASE_CONFIG.usdcDomainVersion,
    },
  };

  const btcUsd = await getBtcUsd();
  const validUntil =
    Math.floor(Date.now() / 1000) + ROOTSTOCK_CONFIG.quoteValiditySeconds;

  const rskReq: RskPaymentRequirement = {
    scheme: "sovereign-rsk",
    network: ROOTSTOCK_CONFIG.network,
    asset: "rBTC",
    maxAmountRequired: usdToWeiAtBtcPrice(priceUsd, btcUsd).toString(),
    payTo: PROJECT_PAYMENT_ADDRESS,
    resource: args.resource,
    description,
    mimeType: "application/json",
    maxTimeoutSeconds: 60,
    extra: {
      chainId: ROOTSTOCK_CONFIG.chainId,
      decimals: ROOTSTOCK_CONFIG.decimals,
      confirmations: ROOTSTOCK_CONFIG.confirmations,
      quoteValidUntil: validUntil,
      quotedUsd: priceUsd,
      btcUsd,
    },
  };

  return {
    x402Version: 1,
    accepts: [baseReq, rskReq],
    ...(args.error ? { error: args.error } : {}),
  };
}
