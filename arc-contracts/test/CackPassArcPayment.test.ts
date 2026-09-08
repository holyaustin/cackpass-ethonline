import { expect } from "chai";
import { ethers } from "hardhat";
import { CackPassArcPayment } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CackPassArcPayment", function () {
  let contract: CackPassArcPayment;
  let owner: SignerWithAddress;
  let payer: SignerWithAddress;
  let otherUser: SignerWithAddress;
  
  // Test constants
  const PAYMENT_ID = ethers.id("test-payment-1");
  const EVENT_ID = ethers.id("event-123");
  const REFERENCE = "TEST-REF-001";
  const AMOUNT = ethers.parseUnits("100", 18); // 100 USDC (18 decimals on Arc)
  const TICKET_QUANTITY = 2;

  beforeEach(async function () {
    // Get signers
    [owner, payer, otherUser] = await ethers.getSigners();
    
    // Deploy contract
    const ContractFactory = await ethers.getContractFactory("CackPassArcPayment");
    contract = await ContractFactory.deploy();
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct platform owner", async function () {
      expect(await contract.platformOwner()).to.equal(owner.address);
    });

    it("Should set the correct initial platform fee (2%)", async function () {
      expect(await contract.platformFeeBps()).to.equal(200);
    });
  });

  describe("Payment Initialization", function () {
    it("Should initialize a payment successfully", async function () {
      await contract.connect(payer).initializePayment(
        PAYMENT_ID,
        AMOUNT,
        REFERENCE,
        EVENT_ID,
        TICKET_QUANTITY
      );

      const payment = await contract.getPayment(PAYMENT_ID);
      expect(payment.payer).to.equal(payer.address);
      expect(payment.amount).to.equal(AMOUNT);
      expect(payment.reference).to.equal(REFERENCE);
      expect(payment.status).to.equal(0); // Pending
      expect(payment.ticketQuantity).to.equal(TICKET_QUANTITY);
    });

    it("Should emit PaymentInitiated event", async function () {
      await expect(contract.connect(payer).initializePayment(
        PAYMENT_ID,
        AMOUNT,
        REFERENCE,
        EVENT_ID,
        TICKET_QUANTITY
      ))
      .to.emit(contract, "PaymentInitiated")
      .withArgs(PAYMENT_ID, payer.address, AMOUNT, REFERENCE, anyValue);
    });

    it("Should reject duplicate payment IDs", async function () {
      await contract.connect(payer).initializePayment(
        PAYMENT_ID,
        AMOUNT,
        REFERENCE,
        EVENT_ID,
        TICKET_QUANTITY
      );

      await expect(contract.connect(payer).initializePayment(
        PAYMENT_ID,
        AMOUNT,
        REFERENCE,
        EVENT_ID,
        TICKET_QUANTITY
      )).to.be.revertedWith("Payment already exists");
    });

    it("Should reject zero amount payments", async function () {
      await expect(contract.connect(payer).initializePayment(
        PAYMENT_ID,
        0,
        REFERENCE,
        EVENT_ID,
        TICKET_QUANTITY
      )).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should track user payments", async function () {
      await contract.connect(payer).initializePayment(
        PAYMENT_ID,
        AMOUNT,
        REFERENCE,
        EVENT_ID,
        TICKET_QUANTITY
      );

      const userPayments = await contract.getUserPayments(payer.address);
      expect(userPayments[0]).to.equal(PAYMENT_ID);
    });
  });

  describe("Payment Confirmation", function () {
    beforeEach(async function () {
      await contract.connect(payer).initializePayment(
        PAYMENT_ID,
        AMOUNT,
        REFERENCE,
        EVENT_ID,
        TICKET_QUANTITY
      );
    });

    it("Should allow platform owner to confirm payment", async function () {
      await contract.confirmPayment(PAYMENT_ID);
      
      const payment = await contract.getPayment(PAYMENT_ID);
      expect(payment.status).to.equal(1); // Confirmed
      expect(payment.confirmedAt).to.be.gt(0);
    });

    it("Should emit PaymentConfirmed event", async function () {
      await expect(contract.confirmPayment(PAYMENT_ID))
        .to.emit(contract, "PaymentConfirmed")
        .withArgs(PAYMENT_ID, payer.address, AMOUNT, REFERENCE, anyValue);
    });

    it("Should prevent non-owners from confirming", async function () {
      await expect(contract.connect(otherUser).confirmPayment(PAYMENT_ID))
        .to.be.revertedWith("Only platform owner");
    });

    it("Should prevent confirming non-existent payments", async function () {
      const fakeId = ethers.id("fake");
      await expect(contract.confirmPayment(fakeId))
        .to.be.revertedWith("Payment does not exist");
    });

    it("Should prevent double confirmation", async function () {
      await contract.confirmPayment(PAYMENT_ID);
      await expect(contract.confirmPayment(PAYMENT_ID))
        .to.be.revertedWith("Invalid payment status");
    });
  });

  describe("Payment Failure", function () {
    const FAILURE_REASON = "Payment timeout";

    beforeEach(async function () {
      await contract.connect(payer).initializePayment(
        PAYMENT_ID,
        AMOUNT,
        REFERENCE,
        EVENT_ID,
        TICKET_QUANTITY
      );
    });

    it("Should allow platform owner to fail payment", async function () {
      await contract.failPayment(PAYMENT_ID, FAILURE_REASON);
      
      const payment = await contract.getPayment(PAYMENT_ID);
      expect(payment.status).to.equal(2); // Failed
    });

    it("Should emit PaymentFailed event", async function () {
      await expect(contract.failPayment(PAYMENT_ID, FAILURE_REASON))
        .to.emit(contract, "PaymentFailed")
        .withArgs(PAYMENT_ID, payer.address, FAILURE_REASON, anyValue);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update platform fee", async function () {
      const newFee = 300; // 3%
      await contract.updatePlatformFee(newFee);
      expect(await contract.platformFeeBps()).to.equal(newFee);
    });

    it("Should prevent non-owners from updating fee", async function () {
      await expect(contract.connect(otherUser).updatePlatformFee(300))
        .to.be.revertedWith("Only platform owner");
    });

    it("Should prevent setting fee above max", async function () {
      const tooHigh = 2000; // 20%
      await expect(contract.updatePlatformFee(tooHigh))
        .to.be.revertedWith("Fee exceeds maximum");
    });

    it("Should allow owner to transfer ownership", async function () {
      await contract.transferOwnership(otherUser.address);
      expect(await contract.platformOwner()).to.equal(otherUser.address);
    });
  });

  // Helper for event args
  function anyValue() { return true; }
});