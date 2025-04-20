use anchor_lang::prelude::*;
use crate::state::{EpochManagement, EpochStatus, TokenProposal, ProposalStatus, ProgramConfig};
// Placeholder pour un compte de configuration global - à définir dans state/mod.rs
// use crate::state::ProgramConfig;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct UpdateProposalStatus<'info> {
    // L'autorité doit signer et correspondre à l'autorité configurée dans ProgramConfig
    #[account(constraint = authority.key() == program_config.admin_authority @ ErrorCode::InvalidAuthority)]
    pub authority: Signer<'info>,
    // Le compte contenant la configuration globale (et l'autorité admin)
    pub program_config: Account<'info, ProgramConfig>,

    // L'époque doit être fermée
    #[account(
        constraint = epoch_management.status == EpochStatus::Closed @ ErrorCode::EpochNotClosed
    )]
    pub epoch_management: Account<'info, EpochManagement>,

    // La proposition doit appartenir à cette époque fermée
    #[account(
        mut, // Nécessite d'être mutable pour changer le statut
        constraint = proposal.epoch_id == epoch_management.epoch_id @ ErrorCode::ProposalNotInEpoch
    )]
    pub proposal: Account<'info, TokenProposal>,

    // On a besoin de system_program pour la création potentielle de comptes PDA,
    // même s'il n'est pas directement utilisé ici, il est souvent nécessaire
    // pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<UpdateProposalStatus>, new_status: ProposalStatus) -> Result<()> {
    // Vérifier que la proposition est actuellement active avant de la finaliser
    require!(ctx.accounts.proposal.status == ProposalStatus::Active, ErrorCode::ProposalAlreadyFinalized);

    // La vérification de l'autorité est gérée par la contrainte.
    // La vérification que new_status est Validated ou Rejected pourrait être ajoutée ici si nécessaire,
    // mais on suppose que le service off-chain envoie une valeur correcte.

    msg!("Updating proposal {} status from {:?} to {:?}", 
         ctx.accounts.proposal.key(), 
         ctx.accounts.proposal.status, // Log l'ancien statut (devrait être Active)
         new_status);
    ctx.accounts.proposal.status = new_status;

    Ok(())
} 