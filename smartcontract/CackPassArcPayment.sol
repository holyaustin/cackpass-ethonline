// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CackPassArcPayment
 * @dev Smart contract for processing USDC payments on Arc blockchain
 * @notice USDC is the native gas token on Arc
 */
contract CackPassArcPayment {
    // Events
    event PaymentInitiated(
        bytes32 indexed paymentId,
        address indexed payer,
        uint256 amount,
        string reference,
        uint256 timestamp
    );

    event PaymentConfirmed(
        bytes32 indexed paymentId,
        address indexed payer,
        uint256 amount,
        string reference,
        uint256 timestamp
    );

    event PaymentFailed(
        bytes32 indexed paymentId,
        address indexed payer,
        string reason,
        uint256 timestamp
    );

    event PlatformFeeUpdated(uint256 newFeeBps, uint256 timestamp);

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );

    // State variables
    address public platformOwner;
    uint256 public platformFeeBps = 200; // 2% platform fee (200 basis points)

    // Payment struct
    struct Payment {
        bytes32 paymentId;
        address payer;
        uint256 amount;
        uint256 fee;
        string reference;
        string status; // "pending", "confirmed", "failed"
        uint256 createdAt;
        uint256 confirmedAt;
        bytes32 eventId;
        uint256 ticketQuantity;
    }

    // Mappings
    mapping(bytes32 => Payment) public payments;
    mapping(address => bytes32[]) public userPayments;

    // Modifiers
    modifier onlyPlatformOwner() {
        require(msg.sender == platformOwner, "Only platform owner can call this");
        _;
    }

    modifier validPaymentId(bytes32 paymentId) {
        require(paymentId != bytes32(0), "Invalid payment ID");
        _;
    }

    /**
     * @dev Initialize the contract
     */
    constructor() {
        platformOwner = msg.sender;
    }

    /**
     * @dev Initialize a payment
     * @param paymentId Unique payment identifier
     * @param amount Amount in USDC (18 decimals on Arc)
     * @param reference Payment reference (CACK-xxx)
     * @param eventId Event ID
     * @param ticketQuantity Number of tickets
     */
    function initializePayment(
        bytes32 paymentId,
        uint256 amount,
        string memory reference,
        bytes32 eventId,
        uint256 ticketQuantity
    ) external validPaymentId(paymentId) {
        require(payments[paymentId].payer == address(0), "Payment already exists");
        require(amount > 0, "Amount must be greater than 0");
        require(bytes(reference).length > 0, "Reference cannot be empty");
        require(ticketQuantity > 0, "Ticket quantity must be greater than 0");

        uint256 fee = (amount * platformFeeBps) / 10000;
        uint256 netAmount = amount - fee;

        payments[paymentId] = Payment({
            paymentId: paymentId,
            payer: msg.sender,
            amount: amount,
            fee: fee,
            reference: reference,
            status: "pending",
            createdAt: block.timestamp,
            confirmedAt: 0,
            eventId: eventId,
            ticketQuantity: ticketQuantity
        });

        userPayments[msg.sender].push(paymentId);

        emit PaymentInitiated(paymentId, msg.sender, amount, reference, block.timestamp);
    }

    /**
     * @dev Confirm payment after successful USDC transfer
     * @param paymentId Unique payment identifier
     */
    function confirmPayment(bytes32 paymentId) external onlyPlatformOwner validPaymentId(paymentId) {
        Payment storage payment = payments[paymentId];
        require(payment.payer != address(0), "Payment not found");
        require(
            keccak256(bytes(payment.status)) == keccak256(bytes("pending")),
            "Payment not pending"
        );

        payment.status = "confirmed";
        payment.confirmedAt = block.timestamp;

        emit PaymentConfirmed(
            paymentId,
            payment.payer,
            payment.amount,
            payment.reference,
            block.timestamp
        );
    }

    /**
     * @dev Mark payment as failed
     * @param paymentId Unique payment identifier
     * @param reason Failure reason
     */
    function failPayment(bytes32 paymentId, string memory reason)
        external
        onlyPlatformOwner
        validPaymentId(paymentId)
    {
        Payment storage payment = payments[paymentId];
        require(payment.payer != address(0), "Payment not found");
        require(
            keccak256(bytes(payment.status)) == keccak256(bytes("pending")),
            "Payment not pending"
        );

        payment.status = "failed";

        emit PaymentFailed(paymentId, payment.payer, reason, block.timestamp);
    }

    /**
     * @dev Get payment details
     * @param paymentId Unique payment identifier
     */
    function getPayment(bytes32 paymentId) external view returns (Payment memory) {
        return payments[paymentId];
    }

    /**
     * @dev Get user's payment history
     * @param user Address of user
     */
    function getUserPayments(address user) external view returns (bytes32[] memory) {
        return userPayments[user];
    }

    /**
     * @dev Get payment status
     * @param paymentId Unique payment identifier
     */
    function getPaymentStatus(bytes32 paymentId) external view returns (string memory) {
        return payments[paymentId].status;
    }

    /**
     * @dev Get number of user payments
     * @param user Address of user
     */
    function getUserPaymentCount(address user) external view returns (uint256) {
        return userPayments[user].length;
    }

    /**
     * @dev Update platform fee (basis points)
     * @param newFeeBps New fee in basis points (max 1000 = 10%)
     */
    function updatePlatformFee(uint256 newFeeBps) external onlyPlatformOwner {
        require(newFeeBps <= 1000, "Fee too high (max 10%)");
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps, block.timestamp);
    }

    /**
     * @dev Transfer platform ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyPlatformOwner {
        require(newOwner != address(0), "Invalid address");
        address previousOwner = platformOwner;
        platformOwner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner, block.timestamp);
    }
}
