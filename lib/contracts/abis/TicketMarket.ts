// lib/contracts/abis/TicketMarket.ts
export const TicketMarketABI = [
  "function listTicket(uint256 ticketId, uint256 amount, uint256 price, uint256 duration) external returns (uint256)",
  "function executeTrade(tuple(uint256 listingId,address buyer,uint256 amount,uint256 totalPrice,uint256 validUntil,bytes32 tradeId) calldata approval, bytes calldata signature) external",
  "function cancelListing(uint256 listingId) external",
  "function getListing(uint256 listingId) external view returns (tuple(address seller,uint256 ticketId,uint256 amount,uint256 price,uint256 expiresAt,bool isActive))",
  "function isListingActive(uint256 listingId) external view returns (bool)",
  "event TicketListed(uint256 indexed listingId, uint256 indexed ticketId, address seller, uint256 price, uint256 amount, uint256 expiresAt)",
  "event TicketSold(uint256 indexed listingId, address buyer, uint256 price, uint256 amount, bytes32 tradeId)"
] as const;