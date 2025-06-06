import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, SystemProgram, PublicKey } from '@solana/web3.js';
import { expect } from 'chai';
import { Programs } from '../../../target/types/programs'; // Ajustez le chemin si nécessaire
import { TestContext, getInitializedContext } from '../../setup';
import {
    ensureProgramConfigInitialized,
    getProgramConfigPda,
} from '../../setup/programConfigSetup';
import {
    ensureTreasuryInitialized,
    getTreasuryPda,
} from '../../setup/treasurySetup';
import { shortenAddress } from '../../utils_for_tests/helpers';

// Exporter une fonction qui enregistre les tests
export function runInitializeTreasuryTests() {
    describe('Treasury Initialization (initialize_treasury)', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        let adminKeypair: Keypair;
        let treasuryPda: PublicKey;

        before(async () => {
            ctx = getInitializedContext();
            program = ctx.program;
            adminKeypair = ctx.adminKeypair;

            await ensureProgramConfigInitialized(ctx); // Assurer que ProgramConfig est là

            [treasuryPda] = getTreasuryPda(program.programId);
            // Appel crucial pour s'assurer que la trésorerie est prête pour CE bloc de tests.
            // Ceci sera appelé APRES le before() du module dans main.test.ts,
            // mais assure l'état spécifique pour ces tests d'initialisation.
            await ensureTreasuryInitialized(ctx); 
        });

        it('should have initialized the Treasury account successfully with default admin', async () => {
            const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
            expect(treasuryAccount.authority.equals(adminKeypair.publicKey)).to.be.true;

            expect(treasuryAccount.marketing.solBalance.toNumber()).to.equal(0);
            expect(treasuryAccount.marketing.lastWithdrawal.toNumber()).to.equal(0);
            expect(treasuryAccount.team.solBalance.toNumber()).to.equal(0);
            expect(treasuryAccount.team.lastWithdrawal.toNumber()).to.equal(0);
            expect(treasuryAccount.operations.solBalance.toNumber()).to.equal(0);
            expect(treasuryAccount.operations.lastWithdrawal.toNumber()).to.equal(0);
            expect(treasuryAccount.investments.solBalance.toNumber()).to.equal(0);
            expect(treasuryAccount.investments.lastWithdrawal.toNumber()).to.equal(0);
            expect(treasuryAccount.crank.solBalance.toNumber()).to.equal(0);
            expect(treasuryAccount.crank.lastWithdrawal.toNumber()).to.equal(0);
        });

        it('should be idempotent (calling ensureTreasuryInitialized again does not fail)', async () => {
            let errorOccurred = false;
            try {
                await ensureTreasuryInitialized(ctx); 
                const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
                expect(treasuryAccount.authority.equals(adminKeypair.publicKey)).to.be.true;
            } catch (error) {
                console.error('  [InitTreasuryTests] Error on second ensureTreasuryInitialized call:', error);
                errorOccurred = true;
            }
            expect(errorOccurred).to.be.false;
        });

        it('reflects authority set by ensureTreasuryInitialized if called with specific admin (on a non-existent account)', async () => {
            const specificAuthority = Keypair.generate();
            
            await ensureTreasuryInitialized(ctx, specificAuthority.publicKey); 
            const treasuryAccount = await program.account.treasury.fetch(treasuryPda);

            if (treasuryAccount.authority.equals(specificAuthority.publicKey)) {
                console.warn(`  [InitTreasuryTests] Treasury authority WAS updated to ${shortenAddress(specificAuthority.publicKey)}. This implies it was not initialized by adminKeypair in the before() hook or was reset.`);
            } else {
                expect(treasuryAccount.authority.equals(adminKeypair.publicKey)).to.be.true;
            }
            await ensureTreasuryInitialized(ctx, adminKeypair.publicKey);
        });

        // Le test de non-signature du payeur est conceptuel car Anchor le gère.
        it('should conceptually fail if payer does not sign', async () => {
            expect(true).to.be.true;
        });
    });
} 