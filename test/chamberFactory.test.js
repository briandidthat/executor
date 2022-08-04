const { expect } = require("chai");
const { ethers } = require("hardhat");
const { chamberFactoryFixture } = require("./utils");

describe("ChamberFactory", () => {
  let accounts, dev;
  let chamber, chamberFactory;

  beforeEach(async () => {
    [dev, user, ...accounts] = await ethers.getSigners();
    chamberFactory = await chamberFactoryFixture();

    let tx = await chamberFactory.connect(user).deployChamber();
    let receipt = await tx.wait();

    // get the chamber we just deployed using the address from logs
    chamber = await ethers.getContractAt(
      "IChamber",
      receipt.events[1].args.instance
    );
  });
  // ========================= DEPLOY =============================

  it("deploy: Owner - Should deploy chamber with user as owner", async () => {
    const owner = await chamber.getOwner();
    expect(owner).to.equal(user.address);
  });

  // ========================= DEPLOY CHAMBER =============================

  it("deployChamber: Event - Should emit a NewChamber event on deployment", async () => {
    await expect(chamberFactory.connect(dev).deployChamber()).to.emit(
      chamberFactory,
      "NewChamber"
    );
  });

  it("deployChamber: Should return the users existing chamber", async () => {
    let tx = await chamberFactory.connect(user).deployChamber();
    let logs = await tx.wait();
    const existing = logs.events[0].args.instance;
    expect(existing).to.be.equal(chamber.address);
  });

  // ========================= GET CHAMBER =============================

  it("getChamber: Should return the correct chamber by user", async () => {
    const details = await chamberFactory.getChamber(user.address);
    expect(details.owner).to.equal(user.address);
    expect(details.instance).to.equal(chamber.address);
  });

  it("getChamber: Should revert due to no existing chamber for owner", async () => {
    await expect(chamberFactory.getChamber(dev.address)).to.be.revertedWith(
      "No chamber for that address"
    );
  });

  // ========================= GET INSTANCE COUNT =============================

  it("getInstanceCount: Should return 1 as count since we deployed 1 chamber", async () => {
    const instances = await chamberFactory.getInstanceCount();
    expect(instances).to.equal(1);
  });
});
