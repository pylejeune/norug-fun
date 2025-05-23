import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { assert, expect } from 'chai';
import { Programs } from '../target/types/programs';
import { AnchorError } from '@coral-xyz/anchor';

describe('TreasuryRoles (multi-admin & roles management)', () => {
  // Variables de test
  let provider: anchor.AnchorProvider;
  let program: Program<Programs>; // À typer si IDL générée
  let admin1: Keypair;
  let admin2: Keypair;
  let admin3: Keypair;
  let notAdmin: Keypair;
  let withdrawer: Keypair;
  let categoryManager: Keypair;
  let treasuryRolesPda: PublicKey;
  let treasuryRolesBump: number;

  before(async () => {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    // program = anchor.workspace.NorugFun as Program<NorugFun>; // À adapter
    program = anchor.workspace.Programs as Program<Programs>; 
    admin1 = Keypair.generate();
    admin2 = Keypair.generate();
    admin3 = Keypair.generate();
    notAdmin = Keypair.generate();
    withdrawer = Keypair.generate();
    categoryManager = Keypair.generate();
    // Trouver le PDA TreasuryRoles (adapter seeds)
    [treasuryRolesPda, treasuryRolesBump] = await PublicKey.findProgramAddressSync([
      Buffer.from('treasury_roles'),
    ], program.programId);
    // Airdrop pour tous les wallets utilisés
    for (const kp of [admin1, admin2, admin3, notAdmin, withdrawer, categoryManager]) {
      const sig = await provider.connection.requestAirdrop(kp.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(sig, "confirmed");
    }
  });

  it('should initialize the TreasuryRoles account with a single admin', async () => {
    await program.methods
      .initializeTreasuryRoles([admin1.publicKey])
      .accounts({
        treasuryRoles: treasuryRolesPda,
        payer: admin1.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([admin1])
      .rpc();
    const acc = await program.account.treasuryRoles.fetch(treasuryRolesPda);
    expect(acc.authorities.length).to.equal(1);
    expect(acc.authorities[0].toBase58()).to.equal(admin1.publicKey.toBase58());
  });

  it('should allow an admin to add a second admin (up to 3)', async () => {
    await program.methods
      .addAdmin(admin2.publicKey)
      .accounts({
        treasuryRoles: treasuryRolesPda,
        authority: admin1.publicKey,
      })
      .signers([admin1])
      .rpc();
    const acc = await program.account.treasuryRoles.fetch(treasuryRolesPda);
    expect(acc.authorities.map((a: PublicKey) => a.toBase58())).to.include(admin2.publicKey.toBase58());
  });

  it('should not allow adding the same admin twice', async () => {
    try {
      await program.methods
        .addAdmin(admin2.publicKey)
        .accounts({
          treasuryRoles: treasuryRolesPda,
          authority: admin1.publicKey,
        })
        .signers([admin1])
        .rpc();
      assert.fail('Should not allow duplicate admin');
    } catch (e) {
      expect(e.message).to.match(/RoleAlreadyExists|custom program error/);
    }
  });

  it('should not allow more than 3 admins', async () => {
    await program.methods
      .addAdmin(admin3.publicKey)
      .accounts({
        treasuryRoles: treasuryRolesPda,
        authority: admin1.publicKey,
      })
      .signers([admin1])
      .rpc();
    const fakeAdmin = Keypair.generate();
    try {
      await program.methods
        .addAdmin(fakeAdmin.publicKey)
        .accounts({
          treasuryRoles: treasuryRolesPda,
          authority: admin1.publicKey,
        })
        .signers([admin1])
        .rpc();
      assert.fail('Should not allow more than 3 admins');
    } catch (e) {
      expect(e.message).to.match(/CustomError|custom program error/);
    }
  });

  it('should allow an admin to remove another admin (if at least 1 remains)', async () => {
    await program.methods
      .removeAdmin(admin2.publicKey)
      .accounts({
        treasuryRoles: treasuryRolesPda,
        authority: admin1.publicKey,
      })
      .signers([admin1])
      .rpc();
    const acc = await program.account.treasuryRoles.fetch(treasuryRolesPda);
    expect(acc.authorities.map((a: PublicKey) => a.toBase58())).to.not.include(admin2.publicKey.toBase58());
    expect(acc.authorities.length).to.be.gte(1);
  });

  it('should not allow removing the last remaining admin', async () => {
    // On retire admin3 pour n'avoir plus qu'admin1
    await program.methods
      .removeAdmin(admin3.publicKey)
      .accounts({
        treasuryRoles: treasuryRolesPda,
        authority: admin1.publicKey,
      })
      .signers([admin1])
      .rpc();
    try {
      await program.methods
        .removeAdmin(admin1.publicKey)
        .accounts({
          treasuryRoles: treasuryRolesPda,
          authority: admin1.publicKey,
        })
        .signers([admin1])
        .rpc();
      assert.fail('Should not allow removing last admin');
    } catch (e) {
      expect(e.message).to.match(/CustomError|custom program error/);
    }
  });

  it('should fail if a non-admin tries to add or remove an admin', async () => {
    try {
      await program.methods
        .addAdmin(notAdmin.publicKey)
        .accounts({
          treasuryRoles: treasuryRolesPda,
          authority: notAdmin.publicKey,
        })
        .signers([notAdmin])
        .rpc();
      assert.fail('Non-admin should not add admin');
    } catch (e) {
      expect(e.message).to.match(/Unauthorized|custom program error/);
    }
    try {
      await program.methods
        .removeAdmin(admin1.publicKey)
        .accounts({
          treasuryRoles: treasuryRolesPda,
          authority: notAdmin.publicKey,
        })
        .signers([notAdmin])
        .rpc();
      assert.fail('Non-admin should not remove admin');
    } catch (e) {
      expect(e.message).to.match(/Unauthorized|custom program error/);
    }
  });

  it('should allow an admin to add a Withdrawer role for a category', async () => {
    await program.methods
      .addTreasuryRole({ withdrawer: [{ marketing: {} }] }, withdrawer.publicKey, new anchor.BN(1000), new anchor.BN(3600))
      .accounts({
        treasuryRoles: treasuryRolesPda,
        authority: admin1.publicKey,
      })
      .signers([admin1])
      .rpc();
    const acc = await program.account.treasuryRoles.fetch(treasuryRolesPda);
    expect(acc.roles.some((r: any) => r.pubkey.toBase58() === withdrawer.publicKey.toBase58())).to.be.true;
  });

  it('should allow an admin to add a CategoryManager role for a category', async () => {
    await program.methods
      .addTreasuryRole({ categoryManager: [{ team: {} }] }, categoryManager.publicKey, null, null)
      .accounts({
        treasuryRoles: treasuryRolesPda,
        authority: admin1.publicKey,
      })
      .signers([admin1])
      .rpc();
    const acc = await program.account.treasuryRoles.fetch(treasuryRolesPda);
    expect(acc.roles.some((r: any) => r.pubkey.toBase58() === categoryManager.publicKey.toBase58())).to.be.true;
  });

  it('should not allow adding the same role twice for the same address and category', async () => {
    try {
      await program.methods
        .addTreasuryRole({ withdrawer: [{ marketing: {} }] }, withdrawer.publicKey, new anchor.BN(1000), new anchor.BN(3600))
        .accounts({
          treasuryRoles: treasuryRolesPda,
          authority: admin1.publicKey,
        })
        .signers([admin1])
        .rpc();
      assert.fail('Should not allow duplicate role');
    } catch (e) {
      expect(e.message).to.match(/RoleAlreadyExists|custom program error/);
    }
  });

  it('should fail if a non-admin tries to add a role', async () => {
    try {
      await program.methods
        .addTreasuryRole({ withdrawer: [{ marketing: {} }] }, notAdmin.publicKey, new anchor.BN(1000), new anchor.BN(3600))
        .accounts({
          treasuryRoles: treasuryRolesPda,
          authority: notAdmin.publicKey,
        })
        .signers([notAdmin])
        .rpc();
      assert.fail('Non-admin should not add role');
    } catch (e) {
      expect(e.message).to.match(/Unauthorized|custom program error/);
    }
  });

  it('should allow an admin to remove an existing role', async () => {
    await program.methods
      .removeTreasuryRole({ withdrawer: [{ marketing: {} }] }, withdrawer.publicKey)
      .accounts({
        treasuryRoles: treasuryRolesPda,
        authority: admin1.publicKey,
      })
      .signers([admin1])
      .rpc();
    const acc = await program.account.treasuryRoles.fetch(treasuryRolesPda);
    expect(acc.roles.some((r: any) => r.pubkey.toBase58() === withdrawer.publicKey.toBase58())).to.be.false;
  });

  it('should not fail if trying to remove a non-existent role (idempotent)', async () => {
    await program.methods
      .removeTreasuryRole({ withdrawer: [{ marketing: {} }] }, withdrawer.publicKey)
      .accounts({
        treasuryRoles: treasuryRolesPda,
        authority: admin1.publicKey,
      })
      .signers([admin1])
      .rpc();
    // Pas d'assertion, juste pas d'erreur
  });

  it('should fail if a non-admin tries to remove a role', async () => {
    try {
      await program.methods
        .removeTreasuryRole({ categoryManager: [{ team: {} }] }, categoryManager.publicKey)
        .accounts({
          treasuryRoles: treasuryRolesPda,
          authority: notAdmin.publicKey,
        })
        .signers([notAdmin])
        .rpc();
      assert.fail('Non-admin should not remove role');
    } catch (e) {
      expect(e.message).to.match(/Unauthorized|custom program error/);
    }
  });

  it('should allow an admin to update withdrawal limit and period for an existing role', async () => {
    await program.methods
      .updateTreasuryRole({ categoryManager: [{ team: {} }] }, categoryManager.publicKey, new anchor.BN(5000), new anchor.BN(7200))
      .accounts({
        treasuryRoles: treasuryRolesPda,
        authority: admin1.publicKey,
      })
      .signers([admin1])
      .rpc();
    const acc = await program.account.treasuryRoles.fetch(treasuryRolesPda);
    const role = acc.roles.find((r: any) => r.pubkey.toBase58() === categoryManager.publicKey.toBase58());
    expect(role.withdrawalLimit.toNumber()).to.equal(5000);
    expect(role.withdrawalPeriod.toNumber()).to.equal(7200);
  });

  it('should fail if trying to update a non-existent role', async () => {
    try {
      await program.methods
        .updateTreasuryRole({ withdrawer: [{ operations: {} }] }, withdrawer.publicKey, new anchor.BN(1234), new anchor.BN(5678))
        .accounts({
          treasuryRoles: treasuryRolesPda,
          authority: admin1.publicKey,
        })
        .signers([admin1])
        .rpc();
      assert.fail('Should not update non-existent role');
    } catch (e) {
      expect(e.message).to.match(/CustomError|custom program error/);
    }
  });

  it('should fail if a non-admin tries to update a role', async () => {
    try {
      await program.methods
        .updateTreasuryRole({ categoryManager: [{ team: {} }] }, categoryManager.publicKey, new anchor.BN(1111), new anchor.BN(2222))
        .accounts({
          treasuryRoles: treasuryRolesPda,
          authority: notAdmin.publicKey,
        })
        .signers([notAdmin])
        .rpc();
      assert.fail('Non-admin should not update role');
    } catch (e) {
      expect(e.message).to.match(/Unauthorized|custom program error/);
    }
  });

}); 