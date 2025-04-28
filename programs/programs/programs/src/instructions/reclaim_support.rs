use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::state::{UserProposalSupport, TokenProposal, ProposalStatus, EpochManagement, EpochStatus};
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
        // Contrainte clé : la proposition DOIT être "Rejected".
        constraint = token_proposal.status == ProposalStatus::Rejected @ ErrorCode::ProposalNotRejected, 
    )]
    pub token_proposal: Account<'info, TokenProposal>,

    // Le compte UserProposalSupport qui contient le montant à réclamer (amount).
    // Mutable car "amount" sera mis à 0 et il sera fermé.
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
        constraint = user_proposal_support.user == user.key() @ ErrorCode::InvalidAuthority, // Ou une erreur plus spécifique
        // Contrainte : doit être lié à cette proposition.
        constraint = user_proposal_support.proposal == token_proposal.key() @ ErrorCode::ProposalMismatch, // Nouvelle erreur ?
        // Contrainte : doit avoir un montant à réclamer.
        constraint = user_proposal_support.amount > 0 @ ErrorCode::NothingToReclaim, // Nouvelle erreur
        // Fermer le compte après l'instruction, la rente est remboursée au `user` (qui est le payer implicite de close).
        close = user 
    )]
    pub user_proposal_support: Account<'info, UserProposalSupport>,

    // Le compte EpochManagement pour vérifier que l'époque est "Processed" : traitée par le crank.
    #[account(
        seeds = [b"epoch", token_proposal.epoch_id.to_le_bytes().as_ref()],
        bump, // Anchor gère le bump pour la vérification
        // Contrainte : l'époque doit avoir été processed par le crank.
        constraint = epoch_management.processed == true @ ErrorCode::EpochNotProcessedYet, // Nouvelle erreur
    )]
    pub epoch_management: Account<'info, EpochManagement>,

    // Requis pour le transfert de SOL (CPI)
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ReclaimSupport>) -> Result<()> {
    let amount_to_reclaim = ctx.accounts.user_proposal_support.amount;

    // Vérifications déjà effectuées par les contraintes Anchor :
    // - token_proposal.status == ProposalStatus::Rejected
    // - user_proposal_support.user == user.key()
    // - user_proposal_support.proposal == token_proposal.key()
    // - user_proposal_support.amount > 0
    // - epoch_management.processed == true

    // Transfert des fonds depuis le compte de la proposition vers l'utilisateur.
    // Utilisation d'un CPI vers le System Program.

    // Préparer les infos des comptes pour le CPI
    let from_account = ctx.accounts.token_proposal.to_account_info();
    let to_account = ctx.accounts.user.to_account_info();
    let system_program_account = ctx.accounts.system_program.to_account_info();

    // S'assurer que le compte proposal a assez de fonds (sécurité additionnelle)
    // Normalement, les SOL sont dans le compte proposal, mais vérifions.
    if from_account.lamports() < amount_to_reclaim {
        return err!(ErrorCode::InsufficientProposalFunds); // Nouvelle erreur ? Ou utiliser un code générique
    }

    // Créer le contexte pour le CPI
    let cpi_context = CpiContext::new(
        system_program_account,
        system_program::Transfer {
            from: from_account,
            to: to_account,
        },
    );

    // Exécuter le transfert
    system_program::transfer(cpi_context, amount_to_reclaim)?;

    // Le compte user_proposal_support sera automatiquement vidé de ses données
    // et sa rente remboursée au compte `user` grâce à `close = user` dans la définition des comptes.
    // Il n'est pas nécessaire de mettre amount à 0 manuellement, car le compte sera fermé.

    msg!("User {} reclaimed {} lamports from rejected proposal {}", 
        ctx.accounts.user.key(), 
        amount_to_reclaim, 
        ctx.accounts.token_proposal.key()
    );

    Ok(())
} 