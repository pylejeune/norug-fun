use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
// Importer les états et l'enum d'erreur global
use crate::state::{EpochManagement, TokenProposal, UserProposalSupport, EpochStatus, ProposalStatus}; 
use crate::error::ErrorCode; // Utiliser l'enum d'erreur global

// Définition des comptes requis par l'instruction
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct SupportProposal<'info> {
    // Le compte qui paie et signe la transaction (l'utilisateur qui supporte)
    #[account(mut)]
    pub user: Signer<'info>,

    // Le compte EpochManagement pour vérifier son statut
    #[account(
        // Contrainte : l'epoch doit être actif
        // Note : Cette contrainte suppose que l'on peut facilement charger le compte Epoch lié à la proposition.
        // Si EpochManagement n'est pas un PDA facilement dérivable ou si la vérification est plus complexe,
        // elle devra être faite dans le handler.
        constraint = epoch.status == EpochStatus::Active @ ErrorCode::EpochNotActive,
        // Contrainte : l'epoch chargé doit correspondre à celui de la proposition
        constraint = epoch.epoch_id == proposal.epoch_id @ ErrorCode::ProposalEpochMismatch
    )]
    pub epoch: Account<'info, EpochManagement>,

    // Le compte TokenProposal qui reçoit le support
    #[account(
        mut, // Mutable car on va augmenter sol_raised et recevoir des SOL
        // Contrainte : la proposition doit être active
        constraint = proposal.status == ProposalStatus::Active @ ErrorCode::ProposalNotActive
        // La contrainte `proposal.epoch_id == epoch.epoch_id` est déjà vérifiée ci-dessus
    )]
    pub proposal: Account<'info, TokenProposal>,

    // Le nouveau compte UserProposalSupport à créer (PDA)
    #[account(
        init,
        payer = user,
        space = 8 + UserProposalSupport::INIT_SPACE, // 8 bytes discriminateur + taille struct
        seeds = [
            b"support",
            proposal.epoch_id.to_le_bytes().as_ref(), // Seed par epoch_id de la proposition
            user.key().as_ref(),                      // Seed par clé de l'utilisateur
            proposal.key().as_ref()                   // Seed par clé de la proposition
        ],
        bump
    )]
    pub user_support: Account<'info, UserProposalSupport>,

    // Le programme système, requis pour créer des comptes (init) et transférer des SOL
    pub system_program: Program<'info, System>,
}

// Logique de l'instruction support_proposal
pub fn handler(ctx: Context<SupportProposal>, amount: u64) -> Result<()> {
    // Vérification de sécurité : s'assurer qu'un montant positif est envoyé
    require!(amount > 0, ErrorCode::AmountMustBeGreaterThanZero);

    // --- 1. Transférer les SOL de l'utilisateur vers le compte de la proposition ---
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user.to_account_info(),
            to: ctx.accounts.proposal.to_account_info(), // Envoyer directement au compte de la proposition
        },
    );
    transfer(cpi_context, amount)?;

    // --- 2. Mettre à jour les informations sur le compte TokenProposal ---
    let proposal = &mut ctx.accounts.proposal;
    // Utiliser checked_add pour éviter les overflows arithmétiques
    proposal.sol_raised = proposal.sol_raised.checked_add(amount)
        .ok_or_else(|| error!(ErrorCode::Overflow))?;
    proposal.total_contributions = proposal.total_contributions.checked_add(1)
        .ok_or_else(|| error!(ErrorCode::Overflow))?;

    // --- 3. Initialiser le nouveau compte UserProposalSupport ---
    let user_support = &mut ctx.accounts.user_support;
    user_support.epoch_id = proposal.epoch_id; // Utiliser l'epoch_id de la proposition liée
    user_support.user = ctx.accounts.user.key();
    user_support.proposal = proposal.key();
    user_support.amount = amount;
    // Le bump est automatiquement géré par Anchor lors de `init` pour les versions >= 0.28

    msg!("User {} supported proposal {} with {} lamports for epoch {}",
        user_support.user,
        user_support.proposal,
        user_support.amount,
        user_support.epoch_id
    );

    Ok(())
}

// L'enum local NosRugErrorCode est supprimé car nous utilisons maintenant ErrorCode de src/error.rs 