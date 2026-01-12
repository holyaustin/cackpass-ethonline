// lib/contracts/abis/RoyaltyEngine.ts
export const RoyaltyEngineABI = [
  "function setRoyaltyConfig(uint256 eventId, uint256 organizerPercentage, uint256 platformPercentage, address organizer) external",
  "function processRoyalty(tuple(uint256 eventId,address seller,address buyer,uint256 saleAmount,uint256 validUntil,bytes32 royaltyId) calldata approval, bytes calldata signature) external",
  "function calculateRoyalties(uint256 eventId, uint256 saleAmount) external view returns (uint256 organizerRoyalty, uint256 platformRoyalty, uint256 sellerAmount)",
  "function hasActiveRoyalties(uint256 eventId) external view returns (bool)",
  "event RoyaltyPaid(uint256 indexed eventId, address indexed seller, address indexed organizer, uint256 saleAmount, uint256 organizerRoyalty, uint256 platformRoyalty, bytes32 royaltyId)"
] as const;