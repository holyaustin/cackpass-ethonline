// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title CackPassArcPayment
 * @dev Smart contract for processing USDC payments on Arc blockchain
 * @notice USDC is the native gas token on Arc, and uses 18 decimals
 */
contract CackPassArcPayment {
    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────
    event PaymentInitiated(
        bytes32 indexed paymentId,
        address indexed payer,
        uint256 amount,
        string paymentReference,
        uint256 timestamp
    );
    
    event PaymentConfirmed(
        bytes32 indexed paymentId,
        address indexed payer,
        uint256 amount,
        string paymentReference,
        uint256 timestamp
    );
    
    event PaymentFailed(
        bytes32 indexed paymentId,
        address indexed payer,
        string reason,
        uint256 timestamp
    );

    // ──────────────────────────────────────────────
    // State Variables
    // ──────────────────────────────────────────────
    address public platformOwner;
    uint256 public platformFeeBps = 200; // 2% platform fee
    uint256 public constant MAX_FEE_BPS = 1000; // Max 10%
    
    // ──────────────────────────────────────────────
    // Structs
    // ──────────────────────────────────────────────
    struct Payment {
        bytes32 paymentId;
        address payer;
        uint256 amount;
        uint256 fee;
        string paymentReference;
        PaymentStatus status;
        uint256 createdAt;
        uint256 confirmedAt;
        bytes32 eventId;
        uint256 ticketQuantity;
    }

    enum PaymentStatus {
        Pending,
        Confirmed,
        Failed,
        Refunded
    }

    // ──────────────────────────────────────────────
    // Mappings
    // ──────────────────────────────────────────────
    mapping(bytes32 => Payment) public payments;
    mapping(address => bytes32[]) public userPayments;
    
    // ──────────────────────────────────────────────
    // Modifiers
    // ──────────────────────────────────────────────
    modifier onlyPlatformOwner() {
        require(msg.sender == platformOwner, "Only platform owner");
        _;
    }

    // ✅ FIXED: Renamed from 'paymentExists' to avoid name conflict
    modifier onlyIfPaymentExists(bytes32 paymentId) {
        require(payments[paymentId].payer != address(0), "Payment does not exist");
        _;
    }

    modifier onlyIfPaymentStatus(bytes32 paymentId, PaymentStatus expectedStatus) {
        require(payments[paymentId].status == expectedStatus, "Invalid payment status");
        _;
    }

    // ──────────────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────────────
    constructor() {
        platformOwner = msg.sender;
    }

    // ──────────────────────────────────────────────
    // Core Functions
    // ──────────────────────────────────────────────
    /**
     * @dev Initialize a payment
     * @param paymentId Unique payment identifier (bytes32)
     * @param amount Amount in USDC (18 decimals)
     * @param paymentReference Payment reference string
     * @param eventId Event ID (bytes32)
     * @param ticketQuantity Number of tickets
     */
    function initializePayment(
        bytes32 paymentId,
        uint256 amount,
        string calldata paymentReference,
        bytes32 eventId,
        uint256 ticketQuantity
    ) external {
        require(payments[paymentId].payer == address(0), "Payment already exists");
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 fee = (amount * platformFeeBps) / 10000;
        
        payments[paymentId] = Payment({
            paymentId: paymentId,
            payer: msg.sender,
            amount: amount,
            fee: fee,
            paymentReference: paymentReference,
            status: PaymentStatus.Pending,
            createdAt: block.timestamp,
            confirmedAt: 0,
            eventId: eventId,
            ticketQuantity: ticketQuantity
        });
        
        userPayments[msg.sender].push(paymentId);
        
        emit PaymentInitiated(paymentId, msg.sender, amount, paymentReference, block.timestamp);
    }

    /**
     * @dev Confirm payment by platform owner
     * @param paymentId Unique payment identifier
     */
    function confirmPayment(bytes32 paymentId) 
        external 
        onlyPlatformOwner 
        onlyIfPaymentExists(paymentId)      // ✅ UPDATED
        onlyIfPaymentStatus(paymentId, PaymentStatus.Pending)  // ✅ UPDATED
    {
        Payment storage payment = payments[paymentId];
        payment.status = PaymentStatus.Confirmed;
        payment.confirmedAt = block.timestamp;
        
        emit PaymentConfirmed(
            paymentId,
            payment.payer,
            payment.amount,
            payment.paymentReference,
            block.timestamp
        );
    }

    /**
     * @dev Mark payment as failed
     * @param paymentId Unique payment identifier
     * @param reason Failure reason
     */
    function failPayment(bytes32 paymentId, string calldata reason) 
        external 
        onlyPlatformOwner 
        onlyIfPaymentExists(paymentId)      // ✅ UPDATED
        onlyIfPaymentStatus(paymentId, PaymentStatus.Pending)  // ✅ UPDATED
    {
        payments[paymentId].status = PaymentStatus.Failed;
        
        emit PaymentFailed(paymentId, payments[paymentId].payer, reason, block.timestamp);
    }

    // ──────────────────────────────────────────────
    // View Functions
    // ──────────────────────────────────────────────
    /**
     * @dev Get full payment details
     * @param paymentId Unique payment identifier
     */
    function getPayment(bytes32 paymentId) 
        external 
        view 
        onlyIfPaymentExists(paymentId)      // ✅ UPDATED
        returns (Payment memory) 
    {
        return payments[paymentId];
    }

    /**
     * @dev Get payment status as string
     * @param paymentId Unique payment identifier
     */
    function getPaymentStatus(bytes32 paymentId) 
        external 
        view 
        onlyIfPaymentExists(paymentId)      // ✅ UPDATED
        returns (string memory) 
    {
        PaymentStatus status = payments[paymentId].status;
        if (status == PaymentStatus.Pending) return "pending";
        if (status == PaymentStatus.Confirmed) return "confirmed";
        if (status == PaymentStatus.Failed) return "failed";
        if (status == PaymentStatus.Refunded) return "refunded";
        return "unknown";
    }

    /**
     * @dev Get user's payment history
     * @param user Address of user
     */
    function getUserPayments(address user) external view returns (bytes32[] memory) {
        return userPayments[user];
    }

    /**
     * @dev Check if payment exists
     * @param paymentId Unique payment identifier
     */
    function paymentExists(bytes32 paymentId) external view returns (bool) {
        return payments[paymentId].payer != address(0);
    }

    // ──────────────────────────────────────────────
    // Admin Functions
    // ──────────────────────────────────────────────
    /**
     * @dev Update platform fee (basis points)
     * @param newFeeBps New fee in basis points (max 1000 = 10%)
     */
    function updatePlatformFee(uint256 newFeeBps) external onlyPlatformOwner {
        require(newFeeBps <= MAX_FEE_BPS, "Fee exceeds maximum");
        platformFeeBps = newFeeBps;
    }

    /**
     * @dev Transfer platform ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyPlatformOwner {
        require(newOwner != address(0), "Invalid address");
        platformOwner = newOwner;
    }
}