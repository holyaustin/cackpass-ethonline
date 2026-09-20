// test/CackPassArcRegistry.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { CackPassArcRegistry } from "../typechain-types";

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
const id = (s: string) => ethers.id(s);

const b32 = (n: number) => ethers.zeroPadValue("0x" + n.toString(16), 32);

const usdc = (amount: string) => ethers.parseUnits(amount, 18);

describe("CackPassArcRegistry", () => {
  let registry: CackPassArcRegistry;
  let owner: SignerWithAddress;
  let processor: SignerWithAddress;
  let stranger: SignerWithAddress;
  let payer: SignerWithAddress;

  const PAYMENT_ID = id("payment-1");
  const REFERENCE = "CACK-abc123";
  const EVENT_ID = id("event-1");
  const ORDER_HASH = id("order-hash-1");
  const PAYMENT_TX_HASH = id("tx-hash-1");
  const AMOUNT = usdc("0.45");

  beforeEach(async () => {
    [owner, processor, stranger, payer] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("CackPassArcRegistry");
    registry = await Factory.deploy(processor.address);
    await registry.waitForDeployment();
  });

  // ══════════════════════════════════════════════════════════
  // Deployment
  // ══════════════════════════════════════════════════════════
  describe("Deployment", () => {
    it("sets deployer as platformOwner", async () => {
      expect(await registry.platformOwner()).to.equal(owner.address);
    });

    it("sets initialPaymentProcessor correctly", async () => {
      expect(await registry.paymentProcessor()).to.equal(processor.address);
    });

    it("starts unpaused", async () => {
      expect(await registry.paused()).to.equal(false);
    });

    it("reverts if payment processor is zero address", async () => {
      const Factory = await ethers.getContractFactory("CackPassArcRegistry");
      await expect(
        Factory.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid payment processor");
    });
  });

  // ══════════════════════════════════════════════════════════
  // Receive / Fallback
  // ══════════════════════════════════════════════════════════
  describe("Fund rejection", () => {
    it("rejects direct USDC transfers via receive()", async () => {
      await expect(
        owner.sendTransaction({
          to: await registry.getAddress(),
          value: ethers.parseEther("1"),
        })
      ).to.be.revertedWith("Registry does not accept funds");
    });

    it("rejects unknown function calls via fallback()", async () => {
      // Trigger fallback with a call to a non-existent selector
      const data = "0xdeadbeef";
      await expect(
        owner.sendTransaction({
          to: await registry.getAddress(),
          data,
        })
      ).to.be.reverted;
    });
  });

  // ══════════════════════════════════════════════════════════
  // recordPayment
  // ══════════════════════════════════════════════════════════
  describe("recordPayment", () => {
    it("records a payment and emits PaymentRecorded", async () => {
      await expect(
        registry.connect(processor).recordPayment(
          PAYMENT_ID,
          payer.address,
          AMOUNT,
          REFERENCE,
          EVENT_ID,
          2,
          ORDER_HASH,
          PAYMENT_TX_HASH
        )
      )
        .to.emit(registry, "PaymentRecorded")
        .withArgs(
          PAYMENT_ID,
          payer.address,
          EVENT_ID,
          AMOUNT,
          2,
          ORDER_HASH,
          PAYMENT_TX_HASH,
          REFERENCE,
          anyValue
        );

      const p = await registry.getPayment(PAYMENT_ID);
      expect(p.payer).to.equal(payer.address);
      expect(p.amount).to.equal(AMOUNT);
      expect(p.paymentReference).to.equal(REFERENCE);
      expect(p.eventId).to.equal(EVENT_ID);
      expect(p.ticketQuantity).to.equal(2n);
      expect(p.orderHash).to.equal(ORDER_HASH);
      expect(p.paymentTxHash).to.equal(PAYMENT_TX_HASH);
      // status = Pending (enum value 0)
      expect(p.status).to.equal(0n);
    });

    it("indexes payments by payer", async () => {
      await registry.connect(processor).recordPayment(
        PAYMENT_ID, payer.address, AMOUNT, REFERENCE,
        EVENT_ID, 1, ORDER_HASH, PAYMENT_TX_HASH
      );
      const list = await registry.getUserPayments(payer.address);
      expect(list.length).to.equal(1);
      expect(list[0]).to.equal(PAYMENT_ID);
    });

    it("indexes payments by reference", async () => {
      await registry.connect(processor).recordPayment(
        PAYMENT_ID, payer.address, AMOUNT, REFERENCE,
        EVENT_ID, 1, ORDER_HASH, PAYMENT_TX_HASH
      );
      expect(await registry.getPaymentIdByReference(REFERENCE)).to.equal(PAYMENT_ID);
    });

    it("rejects call from non-processor", async () => {
      await expect(
        registry.connect(stranger).recordPayment(
          PAYMENT_ID, payer.address, AMOUNT, REFERENCE,
          EVENT_ID, 1, ORDER_HASH, PAYMENT_TX_HASH
        )
      ).to.be.revertedWith("Only payment processor");
    });

    it("rejects duplicate paymentId", async () => {
      await registry.connect(processor).recordPayment(
        PAYMENT_ID, payer.address, AMOUNT, REFERENCE,
        EVENT_ID, 1, ORDER_HASH, PAYMENT_TX_HASH
      );
      await expect(
        registry.connect(processor).recordPayment(
          PAYMENT_ID, payer.address, AMOUNT, REFERENCE,
          EVENT_ID, 1, ORDER_HASH, PAYMENT_TX_HASH
        )
      ).to.be.revertedWith("Payment already exists");
    });

    it("rejects duplicate reference", async () => {
      await registry.connect(processor).recordPayment(
        PAYMENT_ID, payer.address, AMOUNT, REFERENCE,
        EVENT_ID, 1, ORDER_HASH, PAYMENT_TX_HASH
      );
      await expect(
        registry.connect(processor).recordPayment(
          id("payment-2"), payer.address, AMOUNT, REFERENCE,
          EVENT_ID, 1, ORDER_HASH, id("tx-hash-2")
        )
      ).to.be.revertedWith("Reference already used");
    });

    it("rejects zero amount", async () => {
      await expect(
        registry.connect(processor).recordPayment(
          PAYMENT_ID, payer.address, 0, REFERENCE,
          EVENT_ID, 1, ORDER_HASH, PAYMENT_TX_HASH
        )
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("rejects zero payer", async () => {
      await expect(
        registry.connect(processor).recordPayment(
          PAYMENT_ID, ethers.ZeroAddress, AMOUNT, REFERENCE,
          EVENT_ID, 1, ORDER_HASH, PAYMENT_TX_HASH
        )
      ).to.be.revertedWith("Invalid payer");
    });

    it("rejects zero orderHash", async () => {
      await expect(
        registry.connect(processor).recordPayment(
          PAYMENT_ID, payer.address, AMOUNT, REFERENCE,
          EVENT_ID, 1, ethers.ZeroHash, PAYMENT_TX_HASH
        )
      ).to.be.revertedWith("Invalid order hash");
    });

    it("rejects zero paymentTxHash", async () => {
      await expect(
        registry.connect(processor).recordPayment(
          PAYMENT_ID, payer.address, AMOUNT, REFERENCE,
          EVENT_ID, 1, ORDER_HASH, ethers.ZeroHash
        )
      ).to.be.revertedWith("Invalid payment tx hash");
    });

    it("rejects when paused", async () => {
      await registry.connect(owner).pause();
      await expect(
        registry.connect(processor).recordPayment(
          PAYMENT_ID, payer.address, AMOUNT, REFERENCE,
          EVENT_ID, 1, ORDER_HASH, PAYMENT_TX_HASH
        )
      ).to.be.revertedWith("Contract is paused");
    });
  });

  // ══════════════════════════════════════════════════════════
  // confirmPayment
  // ══════════════════════════════════════════════════════════
  describe("confirmPayment", () => {
    beforeEach(async () => {
      await registry.connect(processor).recordPayment(
        PAYMENT_ID, payer.address, AMOUNT, REFERENCE,
        EVENT_ID, 1, ORDER_HASH, PAYMENT_TX_HASH
      );
    });

    it("confirms a pending payment", async () => {
      await expect(registry.connect(processor).confirmPayment(PAYMENT_ID))
        .to.emit(registry, "PaymentConfirmed");

      expect(await registry.getPaymentStatus(PAYMENT_ID)).to.equal("confirmed");
    });

    it("rejects confirming twice", async () => {
      await registry.connect(processor).confirmPayment(PAYMENT_ID);
      await expect(
        registry.connect(processor).confirmPayment(PAYMENT_ID)
      ).to.be.revertedWith("Invalid payment status");
    });

    it("rejects unknown payment", async () => {
      await expect(
        registry.connect(processor).confirmPayment(id("nope"))
      ).to.be.revertedWith("Payment does not exist");
    });
  });

  // ══════════════════════════════════════════════════════════
  // failPayment
  // ══════════════════════════════════════════════════════════
  describe("failPayment", () => {
    beforeEach(async () => {
      await registry.connect(processor).recordPayment(
        PAYMENT_ID, payer.address, AMOUNT, REFERENCE,
        EVENT_ID, 1, ORDER_HASH, PAYMENT_TX_HASH
      );
    });

    it("fails a pending payment", async () => {
      await expect(
        registry.connect(processor).failPayment(PAYMENT_ID, "insufficient usdc")
      ).to.emit(registry, "PaymentFailed");

      expect(await registry.getPaymentStatus(PAYMENT_ID)).to.equal("failed");
    });

    it("rejects failing a confirmed payment", async () => {
      await registry.connect(processor).confirmPayment(PAYMENT_ID);
      await expect(
        registry.connect(processor).failPayment(PAYMENT_ID, "too late")
      ).to.be.revertedWith("Invalid payment status");
    });
  });

  // ══════════════════════════════════════════════════════════
  // refundPayment
  // ══════════════════════════════════════════════════════════
  describe("refundPayment", () => {
    beforeEach(async () => {
      await registry.connect(processor).recordPayment(
        PAYMENT_ID, payer.address, AMOUNT, REFERENCE,
        EVENT_ID, 1, ORDER_HASH, PAYMENT_TX_HASH
      );
      await registry.connect(processor).confirmPayment(PAYMENT_ID);
    });

    it("refunds a confirmed payment", async () => {
      await expect(
        registry.connect(processor).refundPayment(PAYMENT_ID, "event cancelled")
      ).to.emit(registry, "PaymentRefunded");

      expect(await registry.getPaymentStatus(PAYMENT_ID)).to.equal("refunded");
    });

    it("rejects refunding a pending payment", async () => {
      const fresh = id("payment-x");
      await registry.connect(processor).recordPayment(
        fresh, payer.address, AMOUNT, "CACK-x",
        EVENT_ID, 1, id("order-x"), id("tx-x")
      );
      await expect(
        registry.connect(processor).refundPayment(fresh, "nope")
      ).to.be.revertedWith("Invalid payment status");
    });
  });

  // ══════════════════════════════════════════════════════════
  // Anchors
  // ══════════════════════════════════════════════════════════
  describe("anchorBatch", () => {
    const BATCH_ID = id("batch-2026-week-03");
    const ROOT = id("merkle-root-1");

    it("anchors a batch and emits BatchAnchored", async () => {
      await expect(
        registry.connect(processor).anchorBatch(
          BATCH_ID, ROOT, 50, "2026-09-week3"
        )
      )
        .to.emit(registry, "BatchAnchored")
        .withArgs(BATCH_ID, ROOT, 50, "2026-09-week3", anyValue);

      expect(await registry.batchExists(BATCH_ID)).to.equal(true);
      const a = await registry.getAnchor(BATCH_ID);
      expect(a.merkleRoot).to.equal(ROOT);
      expect(a.recordCount).to.equal(50n);
    });

    it("rejects re-anchoring the same batchId", async () => {
      await registry.connect(processor).anchorBatch(
        BATCH_ID, ROOT, 50, "2026-09-week3"
      );
      await expect(
        registry.connect(processor).anchorBatch(
          BATCH_ID, ROOT, 50, "2026-09-week3"
        )
      ).to.be.revertedWith("Batch already anchored");
    });

    it("rejects zero root", async () => {
      await expect(
        registry.connect(processor).anchorBatch(
          BATCH_ID, ethers.ZeroHash, 50, "label"
        )
      ).to.be.revertedWith("Invalid merkle root");
    });

    it("rejects zero record count", async () => {
      await expect(
        registry.connect(processor).anchorBatch(
          BATCH_ID, ROOT, 0, "label"
        )
      ).to.be.revertedWith("Empty batch");
    });

    it("rejects non-processor call", async () => {
      await expect(
        registry.connect(stranger).anchorBatch(BATCH_ID, ROOT, 50, "label")
      ).to.be.revertedWith("Only payment processor");
    });

    it("tracks all batch ids", async () => {
      await registry.connect(processor).anchorBatch(
        BATCH_ID, ROOT, 50, "2026-09-week3"
      );
      await registry.connect(processor).anchorBatch(
        id("batch-2"), id("root-2"), 20, "2026-09-week4"
      );
      expect(await registry.getTotalBatches()).to.equal(2n);
      expect(await registry.getBatchIdAt(0)).to.equal(BATCH_ID);
    });
  });

  // ══════════════════════════════════════════════════════════
  // Merkle proof verification
  // ══════════════════════════════════════════════════════════
  describe("verifyBatchEntry", () => {
    it("verifies a valid 4-leaf Merkle proof", async () => {
      // Build a 4-leaf Merkle tree in the test
      const leaves = [
        ethers.keccak256(ethers.toUtf8Bytes("record-1")),
        ethers.keccak256(ethers.toUtf8Bytes("record-2")),
        ethers.keccak256(ethers.toUtf8Bytes("record-3")),
        ethers.keccak256(ethers.toUtf8Bytes("record-4")),
      ];

      const sortedHash = (a: string, b: string) =>
        a.toLowerCase() <= b.toLowerCase()
          ? ethers.keccak256(ethers.concat([a, b]))
          : ethers.keccak256(ethers.concat([b, a]));

      const n01 = sortedHash(leaves[0], leaves[1]);
      const n23 = sortedHash(leaves[2], leaves[3]);
      const root = sortedHash(n01, n23);

      // Proof for leaf[0]
      const proof = [leaves[1], n23];

      const BATCH_ID = id("batch-proof");
      await registry.connect(processor).anchorBatch(
        BATCH_ID, root, 4, "proof-test"
      );

      const ok = await registry.verifyBatchEntry(BATCH_ID, leaves[0], proof);
      expect(ok).to.equal(true);

      // Wrong proof should fail
      const badProof = [leaves[2], n23];
      const bad = await registry.verifyBatchEntry(BATCH_ID, leaves[0], badProof);
      expect(bad).to.equal(false);
    });

    it("returns false for unknown batch", async () => {
      const result = await registry.verifyBatchEntry(
        id("unknown-batch"),
        id("hash"),
        []
      );
      expect(result).to.equal(false);
    });
  });

  // ══════════════════════════════════════════════════════════
  // Admin
  // ══════════════════════════════════════════════════════════
  describe("Admin", () => {
    it("allows owner to update platform owner", async () => {
      await expect(
        registry.connect(owner).updatePlatformOwner(stranger.address)
      )
        .to.emit(registry, "PlatformOwnerUpdated")
        .withArgs(owner.address, stranger.address);

      expect(await registry.platformOwner()).to.equal(stranger.address);
    });

    it("rejects non-owner updating platform owner", async () => {
      await expect(
        registry.connect(stranger).updatePlatformOwner(stranger.address)
      ).to.be.revertedWith("Only platform owner");
    });

    it("allows owner to update payment processor", async () => {
      await expect(
        registry.connect(owner).updatePaymentProcessor(stranger.address)
      )
        .to.emit(registry, "PaymentProcessorUpdated")
        .withArgs(processor.address, stranger.address);

      expect(await registry.paymentProcessor()).to.equal(stranger.address);
    });

    it("pause/unpause works and blocks writes", async () => {
      await registry.connect(owner).pause();
      expect(await registry.paused()).to.equal(true);

      // Calling pause() twice hits the whenNotPaused modifier
      await expect(registry.connect(owner).pause())
        .to.be.revertedWith("Contract is paused");

      await registry.connect(owner).unpause();
      expect(await registry.paused()).to.equal(false);

      // Calling unpause() twice hits the whenPaused modifier
      await expect(registry.connect(owner).unpause())
        .to.be.revertedWith("Contract is not paused");
    });

    it("rejects non-owner pausing", async () => {
      await expect(
        registry.connect(stranger).pause()
      ).to.be.revertedWith("Only platform owner");
    });
  });
});

// Custom matcher for events with block timestamp
function anyValue() {
  return true; // chai-matchers allows any value when using plain boolean
}