use anchor_lang::prelude::*;


use crate::state::{UserProposalSupport, TokenProposal, ProposalStatus, EpochManagement};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct ReclaimSupport<'info> {
    // L'utilisateur qui réclame ses fonds et qui paiera les frais de fermeture du compte support
    #[account(mut)]
    pub user: Signer<'info>,

    // Le compte TokenProposal pour vérifier son statut et d'où les fonds seront transférés.
    // Mutable car son solde va diminuer.
    #[account(
        mut,
        // Ajout des seeds et du bump pour vérification et accès au bump
        seeds = [
            b"proposal",
            token_proposal.creator.as_ref(), // Récupérer depuis le compte lui-même
            token_proposal.epoch_id.to_le_bytes().as_ref(), // Récupérer depuis le compte lui-même
            token_proposal.token_name.as_bytes(), // Récupérer depuis le compte lui-même
        ],
        bump, // <-- Demander le bump ici
        // Contrainte clé : la proposition DOIT être "Rejected".
        constraint = token_proposal.status == ProposalStatus::Rejected @ ErrorCode::ProposalNotRejected,
    )]
    pub token_proposal: Account<'info, TokenProposal>,

    // Le compte UserProposalSupport qui contient le montant à réclamer (amount).
    // Mutable car il sera fermé.
    // Doit correspondre à l'utilisateur et à la proposition.
    #[account(
        mut,
        seeds = [
            b"support",
            token_proposal.epoch_id.to_le_bytes().as_ref(), // Utiliser l'epoch_id de la proposition
            user.key().as_ref(),
            token_proposal.key().as_ref()
        ],
        bump, // Anchor gère le bump pour la vérification
        // Contrainte : doit appartenir à cet utilisateur.
        constraint = user_proposal_support.user == user.key() @ ErrorCode::InvalidAuthority,
        // Contrainte : doit être lié à cette proposition.
        constraint = user_proposal_support.proposal == token_proposal.key() @ ErrorCode::ProposalMismatch,
        // Contrainte : doit avoir un montant à réclamer.
        constraint = user_proposal_support.amount > 0 @ ErrorCode::NothingToReclaim,
        // Fermer le compte après l'instruction, la rente est remboursée au `user`.
        close = user
    )]
    pub user_proposal_support: Account<'info, UserProposalSupport>,

    // Le compte EpochManagement pour vérifier que l'époque est "Processed" : traitée par le crank.
    #[account(
        seeds = [b"epoch", token_proposal.epoch_id.to_le_bytes().as_ref()],
        bump, // Anchor gère le bump pour la vérification
        // Contrainte : l'époque doit avoir été processed par le crank.
        constraint = epoch_management.processed == true @ ErrorCode::EpochNotProcessedYet,
    )]
    pub epoch_management: Account<'info, EpochManagement>,

    // Requis pour le transfert de SOL (CPI)
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ReclaimSupport>) -> Result<()> {
    let amount_to_reclaim = ctx.accounts.user_proposal_support.amount;

    // Vérifications déjà effectuées par les contraintes Anchor

    // --- Transfert manuel des lamports ---

    // S'assurer que le compte proposal a assez de fonds (Toujours important!)
    let token_proposal_account_info = ctx.accounts.token_proposal.to_account_info();
    if token_proposal_account_info.lamports() < amount_to_reclaim {
        return err!(ErrorCode::InsufficientProposalFunds);
    }

    // Débiter le compte token_proposal
    **ctx.accounts.token_proposal.to_account_info().try_borrow_mut_lamports()? -= amount_to_reclaim;
    
    // Créditer le compte user
    **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += amount_to_reclaim;

    // Le compte user_proposal_support sera automatiquement fermé et sa rente
    // remboursée à `ctx.accounts.user` grâce à `close = user`.

    msg!("User {} reclaimed {} lamports from rejected proposal {} via direct transfer",
        ctx.accounts.user.key(),
        amount_to_reclaim,
        ctx.accounts.token_proposal.key()
    );

    Ok(())
} 