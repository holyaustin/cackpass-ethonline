// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title CackPassArcRegistry
 * @notice Unified on-chain audit registry for CACK-pass on Arc.
 *
 * ═══════════════════════════════════════════════════════════════════
 * PURPOSE
 * ═══════════════════════════════════════════════════════════════════
 *
 * This contract is the immutable on-chain audit layer for CACK-pass.
 * It records two kinds of facts:
 *
 *   1. USDC payments  — full payment record, one per ticket sale
 *   2. Fiat anchors   — Merkle roots that commit to batches of
 *                       fiat payment records stored in MongoDB
 *
 * Together, these make the chain the source of truth for integrity:
 * any MongoDB record can be proven not to have been tampered with.
 *
 * ═══════════════════════════════════════════════════════════════════
 * DESIGN PRINCIPLES
 * ═══════════════════════════════════════════════════════════════════
 *
 * 1. This contract NEVER holds funds.
 *    - `receive()` and `fallback()` revert on all value transfers.
 *    - All USDC goes from buyer's Privy wallet → treasury EOA.
 *
 * 2. This contract NEVER takes fees, splits payments, or pays out.
 *    - Fee splits and organizer payouts are handled off-chain.
 *    - MongoDB stores the complete accounting.
 *
 * 3. Roles are split for security:
 *    - platformOwner      → cold wallet, admin only
 *    - paymentProcessor   → backend hot wallet, writes records
 *
 * 4. Ownership and processor can be rotated by the owner.
 *
 * ═══════════════════════════════════════════════════════════════════
 * GAS FLOW
 * ═══════════════════════════════════════════════════════════════════
 *
 *   USDC transfer (Privy → Treasury)   → gas paid by buyer (in USDC)
 *   recordPayment() call               → gas paid by paymentProcessor
 *   anchorBatch() call                 → gas paid by paymentProcessor
 *
 * The paymentProcessor wallet is funded from the treasury, which is
 * funded in part by a small user-paid processing markup.
 *
 * ═══════════════════════════════════════════════════════════════════
 * ANCHOR CADENCE (off-chain decision, enforced by backend)
 * ═══════════════════════════════════════════════════════════════════
 *
 * The backend anchors a batch when EITHER:
 *   - 50 new fiat records have accumulated, OR
 *   - 7 days have passed since the last anchor
 *
 * Whichever fires first.
 */
contract CackPassArcRegistry {

    // ═══════════════════════════════════════════════════════════════
    // ENUMS
    // ═══════════════════════════════════════════════════════════════

    enum PaymentStatus {
        Pending,
        Confirmed,
        Failed,
        Refunded
    }

    // ═══════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════

    struct Payment {
        bytes32 paymentId;          // Unique CACK payment ID
        address payer;              // Actual buyer wallet
        uint256 amount;             // USDC, 18-decimal native units
        string paymentReference;    // Human-readable ("CACK-abc123")
        PaymentStatus status;
        uint256 createdAt;
        uint256 confirmedAt;
        bytes32 eventId;            // CACK event ID
        uint256 ticketQuantity;
        bytes32 orderHash;          // keccak256 of MongoDB order
        bytes32 paymentTxHash;      // Arc tx hash of USDC transfer
    }

    struct AnchorBatch {
        bytes32 merkleRoot;         // Root of the Merkle tree
        uint256 recordCount;        // Number of records in this batch
        uint256 anchoredAt;         // Block timestamp of anchor
        string batchLabel;          // Human label ("2026-09-week3")
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    event PaymentRecorded(
        bytes32 indexed paymentId,
        address indexed payer,
        bytes32 indexed eventId,
        uint256 amount,
        uint256 ticketQuantity,
        bytes32 orderHash,
        bytes32 paymentTxHash,
        string paymentReference,
        uint256 timestamp
    );

    event PaymentConfirmed(
        bytes32 indexed paymentId,
        address indexed payer,
        uint256 amount,
        uint256 timestamp
    );

    event PaymentFailed(
        bytes32 indexed paymentId,
        address indexed payer,
        string reason,
        uint256 timestamp
    );

    event PaymentRefunded(
        bytes32 indexed paymentId,
        address indexed payer,
        uint256 amount,
        string reason,
        uint256 timestamp
    );

    event BatchAnchored(
        bytes32 indexed batchId,
        bytes32 merkleRoot,
        uint256 recordCount,
        string batchLabel,
        uint256 timestamp
    );

    event PlatformOwnerUpdated(
        address indexed previousOwner,
        address indexed newOwner
    );

    event PaymentProcessorUpdated(
        address indexed previousProcessor,
        address indexed newProcessor
    );

    event ContractPaused(address indexed account);
    event ContractUnpaused(address indexed account);

    // ═══════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════

    /// @notice Cold wallet controlling admin.
    address public platformOwner;

    /// @notice Backend hot wallet authorized to write records.
    address public paymentProcessor;

    /// @notice When true, all write functions revert.
    bool public paused;

    // ═══════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════

    // ── USDC payment records ──
    mapping(bytes32 => Payment) private _payments;
    mapping(address => bytes32[]) private _userPayments;
    mapping(string => bytes32) public referenceToPaymentId;

    // ── Fiat anchor batches ──
    mapping(bytes32 => AnchorBatch) private _anchors;
    bytes32[] private _allBatchIds;

    // ═══════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════

    modifier onlyPlatformOwner() {
        require(msg.sender == platformOwner, "Only platform owner");
        _;
    }

    modifier onlyPaymentProcessor() {
        require(msg.sender == paymentProcessor, "Only payment processor");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier whenPaused() {
        require(paused, "Contract is not paused");
        _;
    }

    modifier onlyIfPaymentExists(bytes32 paymentId) {
        require(_payments[paymentId].payer != address(0), "Payment does not exist");
        _;
    }

    modifier paymentDoesNotExist(bytes32 paymentId) {
        require(_payments[paymentId].payer == address(0), "Payment already exists");
        _;
    }

    modifier paymentHasStatus(bytes32 paymentId, PaymentStatus expected) {
        require(_payments[paymentId].status == expected, "Invalid payment status");
        _;
    }

    // ═══════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════

    /**
     * @param initialPaymentProcessor Backend hot wallet authorized to
     *                                write records and anchors.
     *
     * The deployer (msg.sender) becomes the initial platformOwner.
     * Transfer ownership later via updatePlatformOwner(coldWallet).
     */
    constructor(address initialPaymentProcessor) {
        require(
            initialPaymentProcessor != address(0),
            "Invalid payment processor"
        );

        platformOwner = msg.sender;
        paymentProcessor = initialPaymentProcessor;

        emit PlatformOwnerUpdated(address(0), msg.sender);
        emit PaymentProcessorUpdated(address(0), initialPaymentProcessor);
    }

    // ═══════════════════════════════════════════════════════════════
    // RECEIVE / FALLBACK
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev The registry is not a vault. Reject all native USDC transfers.
     *      This prevents the "10.74 USDC stuck" class of bug.
     */
    receive() external payable {
        revert("Registry does not accept funds");
    }

    fallback() external payable {
        revert("Function does not exist");
    }

    // ═══════════════════════════════════════════════════════════════
    // USDC PAYMENT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Record a completed USDC ticket payment.
     *
     * @dev Called by the CACK backend AFTER the USDC transfer from
     *      the buyer's Privy wallet has landed in the treasury and
     *      been verified on-chain.
     *
     *      Atomicity guarantee: if this reverts, MongoDB should mark
     *      the payment as "unregistered" and retry.
     */
    function recordPayment(
        bytes32 paymentId,
        address payer,
        uint256 amount,
        string calldata paymentReference,
        bytes32 eventId,
        uint256 ticketQuantity,
        bytes32 orderHash,
        bytes32 paymentTxHash
    )
        external
        onlyPaymentProcessor
        whenNotPaused
        paymentDoesNotExist(paymentId)
    {
        require(paymentId != bytes32(0), "Invalid payment ID");
        require(payer != address(0), "Invalid payer");
        require(amount > 0, "Amount must be > 0");
        require(eventId != bytes32(0), "Invalid event ID");
        require(ticketQuantity > 0, "Invalid ticket quantity");
        require(orderHash != bytes32(0), "Invalid order hash");
        require(paymentTxHash != bytes32(0), "Invalid payment tx hash");
        require(
            referenceToPaymentId[paymentReference] == bytes32(0),
            "Reference already used"
        );

        _payments[paymentId] = Payment({
            paymentId: paymentId,
            payer: payer,
            amount: amount,
            paymentReference: paymentReference,
            status: PaymentStatus.Pending,
            createdAt: block.timestamp,
            confirmedAt: 0,
            eventId: eventId,
            ticketQuantity: ticketQuantity,
            orderHash: orderHash,
            paymentTxHash: paymentTxHash
        });

        _userPayments[payer].push(paymentId);
        referenceToPaymentId[paymentReference] = paymentId;

        emit PaymentRecorded(
            paymentId,
            payer,
            eventId,
            amount,
            ticketQuantity,
            orderHash,
            paymentTxHash,
            paymentReference,
            block.timestamp
        );
    }

    /**
     * @notice Mark a recorded payment as confirmed.
     */
    function confirmPayment(bytes32 paymentId)
        external
        onlyPaymentProcessor
        whenNotPaused
        onlyIfPaymentExists(paymentId)
        paymentHasStatus(paymentId, PaymentStatus.Pending)
    {
        Payment storage p = _payments[paymentId];
        p.status = PaymentStatus.Confirmed;
        p.confirmedAt = block.timestamp;

        emit PaymentConfirmed(
            paymentId,
            p.payer,
            p.amount,
            block.timestamp
        );
    }

    /**
     * @notice Mark a pending payment as failed.
     */
    function failPayment(bytes32 paymentId, string calldata reason)
        external
        onlyPaymentProcessor
        whenNotPaused
        onlyIfPaymentExists(paymentId)
        paymentHasStatus(paymentId, PaymentStatus.Pending)
    {
        Payment storage p = _payments[paymentId];
        p.status = PaymentStatus.Failed;

        emit PaymentFailed(
            paymentId,
            p.payer,
            reason,
            block.timestamp
        );
    }

    /**
     * @notice Record that a confirmed payment has been refunded.
     *
     * @dev Registry-only. The actual refund happens off-chain from
     *      the treasury.
     */
    function refundPayment(bytes32 paymentId, string calldata reason)
        external
        onlyPaymentProcessor
        whenNotPaused
        onlyIfPaymentExists(paymentId)
        paymentHasStatus(paymentId, PaymentStatus.Confirmed)
    {
        Payment storage p = _payments[paymentId];
        p.status = PaymentStatus.Refunded;

        emit PaymentRefunded(
            paymentId,
            p.payer,
            p.amount,
            reason,
            block.timestamp
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // FIAT ANCHOR FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Anchor a Merkle root committing to a batch of fiat payments.
     *
     * @dev The backend computes the Merkle root off-chain from a batch
     *      of MongoDB fiat records, then calls this function to publish
     *      it. The on-chain root becomes the immutable proof that the
     *      batch existed as-of now.
     *
     * @param batchId    Unique identifier for this batch (bytes32).
     * @param merkleRoot Root of the Merkle tree over the batch records.
     * @param recordCount Number of records committed in this batch.
     * @param batchLabel Human-readable label ("2026-09-week3").
     */
    function anchorBatch(
        bytes32 batchId,
        bytes32 merkleRoot,
        uint256 recordCount,
        string calldata batchLabel
    )
        external
        onlyPaymentProcessor
        whenNotPaused
    {
        require(batchId != bytes32(0), "Invalid batch ID");
        require(merkleRoot != bytes32(0), "Invalid merkle root");
        require(recordCount > 0, "Empty batch");
        require(
            _anchors[batchId].merkleRoot == bytes32(0),
            "Batch already anchored"
        );

        _anchors[batchId] = AnchorBatch({
            merkleRoot: merkleRoot,
            recordCount: recordCount,
            anchoredAt: block.timestamp,
            batchLabel: batchLabel
        });

        _allBatchIds.push(batchId);

        emit BatchAnchored(
            batchId,
            merkleRoot,
            recordCount,
            batchLabel,
            block.timestamp
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    // ── USDC payment views ──

    function getPayment(bytes32 paymentId)
        external
        view
        onlyIfPaymentExists(paymentId)
        returns (Payment memory)
    {
        return _payments[paymentId];
    }

    function getPaymentStatus(bytes32 paymentId)
        external
        view
        onlyIfPaymentExists(paymentId)
        returns (string memory)
    {
        PaymentStatus s = _payments[paymentId].status;
        if (s == PaymentStatus.Pending) return "pending";
        if (s == PaymentStatus.Confirmed) return "confirmed";
        if (s == PaymentStatus.Failed) return "failed";
        if (s == PaymentStatus.Refunded) return "refunded";
        return "unknown";
    }

    function getUserPayments(address user)
        external
        view
        returns (bytes32[] memory)
    {
        return _userPayments[user];
    }

    function paymentExists(bytes32 paymentId)
        public
        view
        returns (bool)
    {
        return _payments[paymentId].payer != address(0);
    }

    function getPaymentIdByReference(string calldata ref)
        external
        view
        returns (bytes32)
    {
        return referenceToPaymentId[ref];
    }

    function verifyOrderHash(bytes32 paymentId, bytes32 orderHash)
        external
        view
        onlyIfPaymentExists(paymentId)
        returns (bool)
    {
        return _payments[paymentId].orderHash == orderHash;
    }

    function getPaymentTxHash(bytes32 paymentId)
        external
        view
        onlyIfPaymentExists(paymentId)
        returns (bytes32)
    {
        return _payments[paymentId].paymentTxHash;
    }

    // ── Fiat anchor views ──

    function getAnchor(bytes32 batchId)
        external
        view
        returns (AnchorBatch memory)
    {
        return _anchors[batchId];
    }

    function batchExists(bytes32 batchId)
        external
        view
        returns (bool)
    {
        return _anchors[batchId].merkleRoot != bytes32(0);
    }

    function getTotalBatches()
        external
        view
        returns (uint256)
    {
        return _allBatchIds.length;
    }

    function getBatchIdAt(uint256 index)
        external
        view
        returns (bytes32)
    {
        require(index < _allBatchIds.length, "Index out of range");
        return _allBatchIds[index];
    }

    /**
     * @notice Verify a Merkle proof against a batch root.
     *
     * @param batchId    The batch the entry belongs to.
     * @param recordHash keccak256 hash of the MongoDB record.
     * @param proof      Sibling hashes from the leaf to the root.
     */
    function verifyBatchEntry(
        bytes32 batchId,
        bytes32 recordHash,
        bytes32[] calldata proof
    )
        external
        view
        returns (bool)
    {
        bytes32 root = _anchors[batchId].merkleRoot;
        if (root == bytes32(0)) return false;

        bytes32 computed = recordHash;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 sibling = proof[i];
            if (computed <= sibling) {
                computed = keccak256(abi.encodePacked(computed, sibling));
            } else {
                computed = keccak256(abi.encodePacked(sibling, computed));
            }
        }
        return computed == root;
    }

    /**
     * @notice Convenience: verify and immediately compare to a root.
     */
    function verifyAnchor(bytes32 batchId, bytes32 expectedRoot)
        external
        view
        returns (bool)
    {
        return _anchors[batchId].merkleRoot == expectedRoot;
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Rotate the platform owner (cold wallet).
     */
    function updatePlatformOwner(address newOwner)
        external
        onlyPlatformOwner
    {
        require(newOwner != address(0), "Invalid owner");
        address oldOwner = platformOwner;
        platformOwner = newOwner;

        emit PlatformOwnerUpdated(oldOwner, newOwner);
    }

    /**
     * @notice Rotate the payment processor (backend hot wallet).
     */
    function updatePaymentProcessor(address newProcessor)
        external
        onlyPlatformOwner
    {
        require(newProcessor != address(0), "Invalid processor");
        address oldProcessor = paymentProcessor;
        paymentProcessor = newProcessor;

        emit PaymentProcessorUpdated(oldProcessor, newProcessor);
    }

    function pause() external onlyPlatformOwner whenNotPaused {
        paused = true;
        emit ContractPaused(msg.sender);
    }

    function unpause() external onlyPlatformOwner whenPaused {
        paused = false;
        emit ContractUnpaused(msg.sender);
    }
}