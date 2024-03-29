const { expect } = require("chai");
const { ethers } = require("hardhat");
const { EVENTS, getEventObject, storageFacilityFixture, vaultFactoryFixture } = require("./utils");

describe("StorageFacility", () => {
    let dev, user, rando;
    let vault, vaultFactory, storageFacility;
    const vaultFee = ethers.utils.parseEther("0.05"); // 0.5 ETH

    beforeEach(async () => {
        [dev, user, rando] = await ethers.getSigners();
        storageFacility = await storageFacilityFixture();
        vaultFactory = await vaultFactoryFixture(storageFacility.address);
        await storageFacility.connect(dev).setFactoryAddress(vaultFactory.address);

        const receipt = await vaultFactory
            .connect(user)
            .deployVault({ value: vaultFee })
            .then((tx) => tx.wait());
        const event = getEventObject(
            EVENTS.vaultFactory.NEW_VAULT,
            receipt.events
        );

        // get the vault we just deployed using the address from logs
        vault = await ethers.getContractAt("IVault", event.args.instance);
    });

    // ========================= GET VAULT OWNER =============================

    it("getVaultOwner: Should return the vault owners details", async () => {
        const details = await storageFacility.getVaultOwner(user.address);

        expect(details.owner).to.be.equal(user.address);
        expect(details.count).to.be.equal(1);
    });

    it("getVaultOwner: Revert - Should revert due to no existing vault for owner", async () => {
        await expect(storageFacility.getVaultOwner(dev.address)).to.be.revertedWith(
            "No vaults present for that address"
        );
    });

    // ========================= GET VAULTS =============================

    it("getVaults: Should return the correct vault by user", async () => {
        const details = await storageFacility.getVaults(user.address);
        expect(details.length).to.equal(1);
        expect(details[0].owner).to.be.equal(user.address);
        expect(details[0].instance).to.equal(vault.address);
    });

    it("getVaults: Revert - Should revert due to no existing vault for owner", async () => {
        await expect(storageFacility.getVaults(dev.address)).to.be.revertedWith(
            "No vaults present for that address"
        );
    });

    // ========================= STORE VAULT =============================

    it("storeVault: Should store a vault in the storage facility upon deployment of vault", async () => {
        // deploy another vault bringing our current total to 2
        const receipt = await vaultFactory
            .connect(user)
            .deployVault({ value: vaultFee })
            .then((tx) => tx.wait());

        const newVaultEvent = getEventObject(EVENTS.vaultFactory.NEW_VAULT, receipt.events);
        // grab all nested events since the above event only provides the top level events
        const allEvents = await ethers.provider.getTransactionReceipt(receipt.transactionHash);

        // define the event abi for the event we are looking for
        const abi = ["event StoreVault(address indexed instance, address indexed owner, uint256 count)"];
        // new interface using the event abi we defined above
        const iface = new ethers.utils.Interface(abi);
        // find the event log that we are looking for
        const log = allEvents.logs.find((x) => x.address === storageFacility.address);
        // parse the logs using the interface we definced
        const event = iface.parseLog(log);
        const { instance, owner, count } = event.args; // extract the values we want from the logs

        expect(instance).to.be.equal(newVaultEvent.args.instance);
        expect(owner).to.be.equal(user.address);
        expect(count).to.be.equal(2);
    });

    it("storeVault: Revert - Should revert due to being called by somebody other than factory", async () => {
        await expect(storageFacility.connect(dev).storeVault(rando.address, dev.address)).to.be.revertedWith(
            "This function can only be called by the factory contract"
        );
    })

    it("storeVault: Revert - Should revert due to the factory not being set.", async () => {
        // create new storage facility and not set the factory address
        storageFacility = await storageFacilityFixture();
        await expect(storageFacility.connect(dev).storeVault(rando.address, dev.address)).to.be.revertedWith(
            "Factory has not been set yet"
        );
    })

    // ========================= SET FACTORY ADDRESS =============================

    it("setFactoryAddress: Should set new vault factory address", async () => {
        storageFacility = await storageFacilityFixture();
        vaultFactory = await vaultFactoryFixture(storageFacility.address);
        const receipt = await storageFacility.connect(dev).setFactoryAddress(vaultFactory.address).then((tx) => tx.wait());

        const event = getEventObject(EVENTS.storageFacility.NEW_FACTORY, receipt.events);
        const factoryAddress = await storageFacility.getFactoryAddress();

        expect(event.args.oldFactory).to.be.equal(ethers.constants.AddressZero);
        expect(event.args.newFactory).to.be.equal(vaultFactory.address);
        expect(factoryAddress).to.be.equal(vaultFactory.address);
    })

    it("setFactoryAddress: Revert - Should revert due to not being called by the owner", async () => {
        await expect(storageFacility.connect(user).setFactoryAddress(rando.address)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
    });

})