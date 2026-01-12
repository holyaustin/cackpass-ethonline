// lib/contracts/abis/CackPassCore.ts
export const CackPassCoreABI = [
  "function createEvent(string calldata eventName, string calldata baseURI, uint256 startTime, uint256 endTime) external returns (uint256)",
  "function addTicketType(uint256 eventId, uint8 category, uint256 maxTickets, uint256 ticketPrice) external",
  "function mintWithApproval(tuple(address recipient,uint256 eventId,uint256 ticketCategory,uint256 amount,uint256 price,uint256 validUntil,bytes32 id) calldata approval, bytes calldata signature) external",
  "function settleEventPayment(uint256 eventId, uint256 totalRevenue, uint256 platformFee, uint256 organizerPayout) external",
  "function isTicketUsed(uint256 ticketId) external view returns (bool)",
  "function getEventId(uint256 ticketId) external pure returns (uint256)",
  "function getTicketCategory(uint256 ticketId) external pure returns (uint256)",
  "function getPaymentSettlement(uint256 eventId) external view returns (tuple(uint256 totalRevenue,uint256 organizerPayout,uint256 platformFee,uint256 settledAt,address settledBy,bool isSettled))",
  "function getTicketTypeInfo(uint256 eventId, uint8 category) external view returns (tuple(uint256 maxTickets,uint256 ticketsSold,uint256 ticketPrice,bool isActive))",
  "event EventCreated(uint256 indexed eventId, address indexed organizer, string eventName, uint256 startTime, uint256 endTime)",
  "event TicketMinted(address indexed to, uint256 indexed eventId, uint256 ticketId, uint8 category, uint256 amount, uint256 totalPrice)",
  "event PaymentSettled(uint256 indexed eventId, address indexed organizer, uint256 totalRevenue, uint256 organizerPayout, uint256 platformFee, address settledBy)"
] as const;