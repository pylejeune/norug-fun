// Instruction pour initialiser la configuration globale du programme.
//
// Contexte de l'Autorité :
// Ce programme utilise un compte singleton `ProgramConfig` (créé via un PDA avec la seed "config")
// pour stocker une unique clé publique `admin_authority`.
// Cette clé est la SEULE autorité reconnue par le programme Solana pour exécuter
// des actions administratives sensibles (ex: `update_proposal_status`).
//
// Le programme Solana NE GÈRE PAS l'authentification ou l'autorisation de multiples
// administrateurs humains. C'est la responsabilité d'un service backend off-chain.
//
// Le service backend doit :
// 1. Détenir de manière SÉCURISÉE la clé privée correspondant à l'`admin_authority` définie ici.
// 2. Gérer l'authentification et les permissions de plusieurs administrateurs humains (off-chain).
// 3. Agir comme un proxy : lorsqu'un admin humain autorisé (via le backend) demande une action,
//    le backend utilise la clé privée `admin_authority` pour signer et envoyer la transaction
//    correspondante au programme Solana.
//
// Cette instruction `initialize_program_config` est conçue pour n'être appelée qu'UNE SEULE FOIS,
// typiquement par le déployeur du programme, pour définir l'`admin_authority` initiale.
// La structure `#[account(init, seeds = [b"config"], bump)]` empêche la réinitialisation.

use anchor_lang::prelude::*;
use crate::state::ProgramConfig;

#[derive(Accounts)]
pub struct InitializeProgramConfig<'info> {
    // Le compte ProgramConfig à initialiser.
    // Utilisation d'une seed fixe "config" pour en faire un singleton (ne peut être créé qu'une fois).
    #[account(
        init, 
        payer = authority, 
        space = 8 + ProgramConfig::INIT_SPACE, // 8 bytes pour le discriminateur Anchor
        seeds = [b"config"], 
        bump
    )]
    pub program_config: Account<'info, ProgramConfig>,

    // L'autorité qui initialise la configuration (typiquement le déployeur ou un admin initial).
    // Ce compte paiera aussi la rente pour le compte program_config.
    #[account(mut)]
    pub authority: Signer<'info>,

    // Requis pour l'initialisation du compte.
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeProgramConfig>, admin_authority: Pubkey) -> Result<()> {
    msg!("Initializing ProgramConfig...");
    
    let config = &mut ctx.accounts.program_config;
    config.admin_authority = admin_authority;

    msg!("ProgramConfig initialized with admin authority: {}", admin_authority);
    Ok(())
} 