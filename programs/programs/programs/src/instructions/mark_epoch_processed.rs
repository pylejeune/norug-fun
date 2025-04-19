use anchor_lang::prelude::*;
use crate::state::{EpochManagement, EpochStatus, ProgramConfig};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct MarkEpochProcessed<'info> {
    // L'autorité doit être l'admin configuré
    #[account(constraint = authority.key() == program_config.admin_authority @ ErrorCode::InvalidAuthority)]
    pub authority: Signer<'info>,
    pub program_config: Account<'info, ProgramConfig>,

    // L'époque à marquer comme traitée
    #[account(
        mut, // Nécessite d'être mutable pour changer le flag
        constraint = epoch_management.status == EpochStatus::Closed @ ErrorCode::EpochNotClosed, // Doit être fermée
        constraint = !epoch_management.processed @ ErrorCode::EpochAlreadyProcessed // Ne doit pas être déjà traitée
    )]
    pub epoch_management: Account<'info, EpochManagement>,
}

pub fn handler(ctx: Context<MarkEpochProcessed>) -> Result<()> {
    // Les contraintes vérifient déjà l'autorité, le statut Closed, et processed == false.
    ctx.accounts.epoch_management.processed = true;
    msg!("Epoch {} marked as processed.", ctx.accounts.epoch_management.epoch_id);
    Ok(())
} 