// lib/pinata/config.ts
"server only"; // This directive ensures server-side only usage

import { PinataSDK } from "pinata";

// Initialize Pinata SDK instance
export const pinata = new PinataSDK({
  pinataJwt: `${process.env.PINATA_JWT}`,
  pinataGateway: `${process.env.NEXT_PUBLIC_GATEWAY_URL}`
});