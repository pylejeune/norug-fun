use anchor_lang::prelude::*;
use crate::state::{EpochManagement, ProgramConfig};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct MarkEpochProcessed<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump
    )]
    pub program_config: Account<'info, ProgramConfig>,

    // Le compte EpochManagement à mettre à jour
    // Doit être mutable car nous changeons son état (processed = true)
    #[account(mut)] 
    pub epoch_management: Account<'info, EpochManagement>,
}

pub fn handler(ctx: Context<MarkEpochProcessed>) -> Result<()> {
    // Vérifier que l'autorité signataire est bien l'admin défini dans ProgramConfig
    require!(
        ctx.accounts.authority.key() == ctx.accounts.program_config.admin_authority,
        ErrorCode::Unauthorized // Définir cette erreur dans error.rs si elle n'existe pas
    );

    // Vérifier que l'époque est bien fermée avant de la marquer comme traitée
    // Bien que le crank ne devrait appeler ceci que pour les époques fermées, 
    // une vérification on-chain est plus sûre.
    // Note: La façon de vérifier l'enum dépend de sa définition exacte (struct enum ou C-like)
    // En supposant une struct enum comme dans l'exemple:
    match ctx.accounts.epoch_management.status {
        crate::state::EpochStatus::Closed => {}, // C'est l'état attendu
        _ => return err!(ErrorCode::EpochNotClosed), // Définir cette erreur
    }

    // Vérifier qu'elle n'est pas déjà marquée comme traitée
    require!(
        !ctx.accounts.epoch_management.processed,
        ErrorCode::EpochAlreadyProcessed // Définir cette erreur
    );

    // Mettre à jour le statut
    ctx.accounts.epoch_management.processed = true;

    msg!("Epoch {} marked as processed.", ctx.accounts.epoch_management.epoch_id);
    Ok(())
} 