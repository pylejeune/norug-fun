import * as anchor from '@coral-xyz/anchor';
import { expect } from 'chai';
import { TestContext, getInitializedContext } from '../../setup'; // Importer getInitializedContext
import { ensureProgramConfigInitialized } from '../../setup/programConfigSetup';

/**
 * Exécute les tests d'initialisation pour ProgramConfig.
 */
export function runInitializeProgramConfigTests() { // Supprimer le paramètre getTestContext
    describe('ProgramConfig Initialization', () => {
        let ctx: TestContext;

        before(async () => {
            ctx = getInitializedContext(); // Utiliser getInitializedContext
            await ensureProgramConfigInitialized(ctx);
            expect(ctx.programConfigAddress).to.exist;
        });

        it('should have initialized ProgramConfig with the correct admin', async () => {
            const configAccount = await ctx.program.account.programConfig.fetch(ctx.programConfigAddress!);
            expect(configAccount.adminAuthority.equals(ctx.adminKeypair.publicKey)).to.be.true;
            console.log(`  [InitProgConfigTests] ProgramConfig initialized with admin: ${configAccount.adminAuthority.toBase58()}`);
        });

        it('should verify idempotency of ProgramConfig initialization', async () => {
            const initialAdmin = ctx.adminKeypair.publicKey;
            await ensureProgramConfigInitialized(ctx, initialAdmin);
            const configAccount = await ctx.program.account.programConfig.fetch(ctx.programConfigAddress!);
            expect(configAccount.adminAuthority.equals(initialAdmin)).to.be.true;
            console.log(`  [InitProgConfigTests] ProgramConfig re-checked, admin still: ${configAccount.adminAuthority.toBase58()}`);
        });

        // TODO:
        // Test: Échec de l'initialisation si appelé par un non-admin (si l'instruction le permettrait).
        // Actuellement, initializeProgramConfig est signé par ctx.adminKeypair, donc un test avec un autre signataire
        // échouerait au niveau de la signature de la transaction avant même d'atteindre la logique de l'instruction.
        // Si initializeProgramConfig avait une logique interne pour vérifier `authority == attendu` (ce qui n'est pas typique pour une init),
        // alors ce test serait pertinent.

    });
} 