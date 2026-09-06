const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CackPassArcPayment", function () {
  let cackPass;
  let owner;
  let user1;
  let user2;

  const DEFAULT_PLATFORM_FEE = 200; // 2% in basis points
  const PAYMENT_ID = ethers.id("payment-001");
  const EVENT_ID = ethers.id("event-123");
  const PAYMENT_AMOUNT = ethers.parseUnits("100", 18); // 100 USDC
  const PAYMENT_REFERENCE = "CACK-001";
  const TICKET_QUANTITY = 5;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy contract
    const CackPassArcPayment = await ethers.getContractFactory("CackPassArcPayment");
    cackPass = await CackPassArcPayment.deploy();
    await cackPass.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct platform owner", async function () {
      expect(await cackPass.platformOwner()).to.equal(owner.address);
    });

    it("Should set the correct initial platform fee", async function () {
      expect(await cackPass.platformFeeBps()).to.equal(DEFAULT_PLATFORM_FEE);
    });
  });

  describe("Payment Initialization", function () {
    it("Should initialize a payment successfully", async function () {
      await expect(
        cackPass.connect(user1).initializePayment(
          PAYMENT_ID,
          PAYMENT_AMOUNT,
          PAYMENT_REFERENCE,
          EVENT_ID,
          TICKET_QUANTITY
        )
      ).to.emit(cackPass, "PaymentInitiated");

      const payment = await cackPass.getPayment(PAYMENT_ID);
      expect(payment.payer).to.equal(user1.address);
      expect(payment.amount).to.equal(PAYMENT_AMOUNT);
      expect(payment.reference).to.equal(PAYMENT_REFERENCE);
      expect(payment.status).to.equal("pending");
      expect(payment.ticketQuantity).to.equal(TICKET_QUANTITY);
    });

    it("Should calculate platform fee correctly", async function () {
      await cackPass.connect(user1).initializePayment(
        PAYMENT_ID,
        PAYMENT_AMOUNT,
        PAYMENT_REFERENCE,
        EVENT_ID,
        TICKET_QUANTITY
      );

      const payment = await cackPass.getPayment(PAYMENT_ID);
      const expectedFee = (PAYMENT_AMOUNT * BigInt(DEFAULT_PLATFORM_FEE)) / BigInt(10000);
      expect(payment.fee).to.equal(expectedFee);
    });

    it("Should reject payment with zero amount", async function () {
      await expect(
        cackPass.connect(user1).initializePayment(
          PAYMENT_ID,
          0,
          PAYMENT_REFERENCE,
          EVENT_ID,
          TICKET_QUANTITY
        )
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should reject payment with empty reference", async function () {
      await expect(
        cackPass.connect(user1).initializePayment(
          PAYMENT_ID,
          PAYMENT_AMOUNT,
          "",
          EVENT_ID,
          TICKET_QUANTITY
        )
      ).to.be.revertedWith("Reference cannot be empty");
    });

    it("Should reject payment with zero ticket quantity", async function () {
      await expect(
        cackPass.connect(user1).initializePayment(
          PAYMENT_ID,
          PAYMENT_AMOUNT,
          PAYMENT_REFERENCE,
          EVENT_ID,
          0
        )
      ).to.be.revertedWith("Ticket quantity must be greater than 0");
    });

    it("Should reject duplicate payment ID", async function () {
      await cackPass.connect(user1).initializePayment(
        PAYMENT_ID,
        PAYMENT_AMOUNT,
        PAYMENT_REFERENCE,
        EVENT_ID,
        TICKET_QUANTITY
      );

      await expect(
        cackPass.connect(user1).initializePayment(
          PAYMENT_ID,
          PAYMENT_AMOUNT,
          PAYMENT_REFERENCE,
          EVENT_ID,
          TICKET_QUANTITY
        )
      ).to.be.revertedWith("Payment already exists");
    });

    it("Should track user payments", async function () {
      const paymentId1 = ethers.id("payment-001");
      const paymentId2 = ethers.id("payment-002");

      await cackPass.connect(user1).initializePayment(
        paymentId1,
        PAYMENT_AMOUNT,
        "CACK-001",
        EVENT_ID,
        TICKET_QUANTITY
      );

      await cackPass.connect(user1).initializePayment(
        paymentId2,
        PAYMENT_AMOUNT,
        "CACK-002",
        EVENT_ID,
        TICKET_QUANTITY
      );

      const userPayments = await cackPass.getUserPayments(user1.address);
      expect(userPayments.length).to.equal(2);
      expect(userPayments[0]).to.equal(paymentId1);
      expect(userPayments[1]).to.equal(paymentId2);
    });

    it("Should return correct payment count", async function () {
      const paymentId1 = ethers.id("payment-001");
      const paymentId2 = ethers.id("payment-002");

      await cackPass.connect(user1).initializePayment(
        paymentId1,
        PAYMENT_AMOUNT,
        "CACK-001",
        EVENT_ID,
        TICKET_QUANTITY
      );

      await cackPass.connect(user1).initializePayment(
        paymentId2,
        PAYMENT_AMOUNT,
        "CACK-002",
        EVENT_ID,
        TICKET_QUANTITY
      );

      const count = await cackPass.getUserPaymentCount(user1.address);
      expect(count).to.equal(2);
    });
  });

  describe("Payment Confirmation", function () {
    beforeEach(async function () {
      await cackPass.connect(user1).initializePayment(
        PAYMENT_ID,
        PAYMENT_AMOUNT,
        PAYMENT_REFERENCE,
        EVENT_ID,
        TICKET_QUANTITY
      );
    });

    it("Should confirm a pending payment", async function () {
      await expect(cackPass.connect(owner).confirmPayment(PAYMENT_ID)).to.emit(
        cackPass,
        "PaymentConfirmed"
      );

      const payment = await cackPass.getPayment(PAYMENT_ID);
      expect(payment.status).to.equal("confirmed");
      expect(payment.confirmedAt).to.be.gt(0);
    });

    it("Should reject payment confirmation by non-owner", async function () {
      await expect(
        cackPass.connect(user1).confirmPayment(PAYMENT_ID)
      ).to.be.revertedWith("Only platform owner can call this");
    });

    it("Should reject confirmation of non-existent payment", async function () {
      const nonExistentId = ethers.id("non-existent");
      await expect(
        cackPass.connect(owner).confirmPayment(nonExistentId)
      ).to.be.revertedWith("Payment not found");
    });

    it("Should reject confirmation of already confirmed payment", async function () {
      await cackPass.connect(owner).confirmPayment(PAYMENT_ID);

      await expect(
        cackPass.connect(owner).confirmPayment(PAYMENT_ID)
      ).to.be.revertedWith("Payment not pending");
    });
  });

  describe("Payment Failure", function () {
    beforeEach(async function () {
      await cackPass.connect(user1).initializePayment(
        PAYMENT_ID,
        PAYMENT_AMOUNT,
        PAYMENT_REFERENCE,
        EVENT_ID,
        TICKET_QUANTITY
      );
    });

    it("Should mark payment as failed", async function () {
      const reason = "Insufficient funds";
      await expect(cackPass.connect(owner).failPayment(PAYMENT_ID, reason)).to.emit(
        cackPass,
        "PaymentFailed"
      );

      const payment = await cackPass.getPayment(PAYMENT_ID);
      expect(payment.status).to.equal("failed");
    });

    it("Should reject payment failure by non-owner", async function () {
      await expect(
        cackPass.connect(user1).failPayment(PAYMENT_ID, "Insufficient funds")
      ).to.be.revertedWith("Only platform owner can call this");
    });

    it("Should reject failure of non-existent payment", async function () {
      const nonExistentId = ethers.id("non-existent");
      await expect(
        cackPass.connect(owner).failPayment(nonExistentId, "Invalid")
      ).to.be.revertedWith("Payment not found");
    });

    it("Should reject failure of already confirmed payment", async function () {
      await cackPass.connect(owner).confirmPayment(PAYMENT_ID);

      await expect(
        cackPass.connect(owner).failPayment(PAYMENT_ID, "Invalid")
      ).to.be.revertedWith("Payment not pending");
    });
  });

  describe("Payment Status", function () {
    beforeEach(async function () {
      await cackPass.connect(user1).initializePayment(
        PAYMENT_ID,
        PAYMENT_AMOUNT,
        PAYMENT_REFERENCE,
        EVENT_ID,
        TICKET_QUANTITY
      );
    });

    it("Should return correct payment status", async function () {
      let status = await cackPass.getPaymentStatus(PAYMENT_ID);
      expect(status).to.equal("pending");

      await cackPass.connect(owner).confirmPayment(PAYMENT_ID);

      status = await cackPass.getPaymentStatus(PAYMENT_ID);
      expect(status).to.equal("confirmed");
    });
  });

  describe("Platform Fee Management", function () {
    it("Should update platform fee", async function () {
      const newFee = 300; // 3%
      await expect(cackPass.connect(owner).updatePlatformFee(newFee)).to.emit(
        cackPass,
        "PlatformFeeUpdated"
      );

      expect(await cackPass.platformFeeBps()).to.equal(newFee);
    });

    it("Should reject fee update by non-owner", async function () {
      await expect(
        cackPass.connect(user1).updatePlatformFee(300)
      ).to.be.revertedWith("Only platform owner can call this");
    });

    it("Should reject fee greater than 10%", async function () {
      await expect(
        cackPass.connect(owner).updatePlatformFee(1001)
      ).to.be.revertedWith("Fee too high (max 10%)");
    });

    it("Should accept maximum fee of 10%", async function () {
      await cackPass.connect(owner).updatePlatformFee(1000);
      expect(await cackPass.platformFeeBps()).to.equal(1000);
    });
  });

  describe("Ownership Transfer", function () {
    it("Should transfer ownership", async function () {
      await expect(
        cackPass.connect(owner).transferOwnership(user1.address)
      ).to.emit(cackPass, "OwnershipTransferred");

      expect(await cackPass.platformOwner()).to.equal(user1.address);
    });

    it("Should reject ownership transfer by non-owner", async function () {
      await expect(
        cackPass.connect(user1).transferOwnership(user2.address)
      ).to.be.revertedWith("Only platform owner can call this");
    });

    it("Should reject invalid new owner address", async function () {
      await expect(
        cackPass.connect(owner).transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should allow new owner to call owner-only functions", async function () {
      await cackPass.connect(owner).transferOwnership(user1.address);

      await cackPass.connect(user1).initializePayment(
        PAYMENT_ID,
        PAYMENT_AMOUNT,
        PAYMENT_REFERENCE,
        EVENT_ID,
        TICKET_QUANTITY
      );

      await cackPass.connect(user1).confirmPayment(PAYMENT_ID);
      const payment = await cackPass.getPayment(PAYMENT_ID);
      expect(payment.status).to.equal("confirmed");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle large payment amounts", async function () {
      const largeAmount = ethers.parseUnits("1000000", 18); // 1 million USDC
      const paymentId = ethers.id("large-payment");

      await cackPass.connect(user1).initializePayment(
        paymentId,
        largeAmount,
        PAYMENT_REFERENCE,
        EVENT_ID,
        TICKET_QUANTITY
      );

      const payment = await cackPass.getPayment(paymentId);
      expect(payment.amount).to.equal(largeAmount);
    });

    it("Should handle small payment amounts", async function () {
      const smallAmount = ethers.parseUnits("0.01", 18); // 0.01 USDC
      const paymentId = ethers.id("small-payment");

      await cackPass.connect(user1).initializePayment(
        paymentId,
        smallAmount,
        PAYMENT_REFERENCE,
        EVENT_ID,
        1
      );

      const payment = await cackPass.getPayment(paymentId);
      expect(payment.amount).to.equal(smallAmount);
    });

    it("Should handle large ticket quantities", async function () {
      const largeQuantity = 1000000;
      const paymentId = ethers.id("large-tickets");

      await cackPass.connect(user1).initializePayment(
        paymentId,
        PAYMENT_AMOUNT,
        PAYMENT_REFERENCE,
        EVENT_ID,
        largeQuantity
      );

      const payment = await cackPass.getPayment(paymentId);
      expect(payment.ticketQuantity).to.equal(largeQuantity);
    });
  });
});
