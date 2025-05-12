use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
// Importer les états et l'enum d'erreur global
use crate::state::{EpochManagement, TokenProposal, UserProposalSupport, EpochStatus, ProposalStatus, Treasury}; 
use crate::error::ErrorCode; // Utiliser l'enum d'erreur global
use crate::constants::{SUPPORT_FEE_PERCENTAGE_NUMERATOR, SUPPORT_FEE_PERCENTAGE_DENOMINATOR, TREASURY_SEED};
use crate::utils::fee_distribution::{distribute_fees_to_treasury, FeeType};

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

    // Le compte UserProposalSupport à créer ou mettre à jour (PDA)
    #[account(
        init_if_needed, // Utiliser init_if_needed pour créer ou charger le compte existant
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

    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump
    )]
    pub treasury: Account<'info, Treasury>,

    // Le programme système, requis pour créer des comptes et transférer des SOL
    pub system_program: Program<'info, System>,
}

// Logique de l'instruction support_proposal
pub fn handler(ctx: Context<SupportProposal>, amount: u64) -> Result<()> {
    // Vérification de sécurité : s'assurer qu'un montant positif est envoyé
    require!(amount > 0, ErrorCode::AmountMustBeGreaterThanZero);

    // Calculer le montant des frais
    // Le numérateur est le pourcentage (ex: 5 pour 0.5%), le dénominateur est 1000 pour 0.x% ou 100 pour x%
    let fee_amount = amount
        .checked_mul(SUPPORT_FEE_PERCENTAGE_NUMERATOR)
        .ok_or_else(|| error!(ErrorCode::CalculationOverflow))?
        .checked_div(SUPPORT_FEE_PERCENTAGE_DENOMINATOR)
        .ok_or_else(|| error!(ErrorCode::CalculationOverflow))?;

    // S'assurer que les frais ne sont pas nuls (ce qui arriverait si `amount` est trop petit)
    require!(fee_amount > 0, ErrorCode::FeeCannotBeZero); 
    // S'assurer que le montant du support couvre au moins les frais et qu'il reste quelque chose pour la proposition
    require!(amount > fee_amount, ErrorCode::AmountTooLowToCoverFees); 
    
    let net_support_amount = amount.checked_sub(fee_amount)
        .ok_or_else(|| error!(ErrorCode::CalculationOverflow))?;
    // Cette vérification est techniquement redondante si amount > fee_amount et fee_amount > 0, 
    // mais la garder assure que net_support_amount est positif.
    require!(net_support_amount > 0, ErrorCode::AmountMustBeGreaterThanZero);

    // Récupérer les comptes pour plus de clarté
    let proposal = &mut ctx.accounts.proposal;
    let user_support = &mut ctx.accounts.user_support;
    let user = &ctx.accounts.user;

    // Vérifier si c'est le premier soutien de cet utilisateur pour cette proposition dans cet epoch
    // On le détermine en vérifiant si le montant actuel dans user_support est 0.
    // Anchor initialise les champs à 0 lors de `init_if_needed` si le compte est nouveau.
    let is_new_supporter = user_support.amount == 0;

    // --- 1. Transférer les SOL de l'utilisateur --- 

    // --- 1.a Transférer le montant net du support vers le compte de la proposition ---
    let cpi_context_support = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: user.to_account_info(),
            to: proposal.to_account_info(), 
        },
    );
    transfer(cpi_context_support, net_support_amount)?;

    // --- 1.b Transférer les frais vers la trésorerie ---
    let cpi_accounts_fee_transfer = Transfer {
        from: user.to_account_info(),
        to: ctx.accounts.treasury.to_account_info(),
    };
    let cpi_program_fee_transfer = ctx.accounts.system_program.to_account_info();
    let cpi_context_fee_transfer = CpiContext::new(cpi_program_fee_transfer, cpi_accounts_fee_transfer);
    transfer(cpi_context_fee_transfer, fee_amount)?;

    // --- 1.c Distribuer les frais au sein de la trésorerie ---
    distribute_fees_to_treasury(
        &mut ctx.accounts.treasury,
        fee_amount,
        FeeType::ProposalSupport,
    )?;

    // --- 2. Mettre à jour les informations sur le compte TokenProposal ---
    // Utiliser net_support_amount
    proposal.sol_raised = proposal.sol_raised.checked_add(net_support_amount)
        .ok_or_else(|| error!(ErrorCode::Overflow))?;

    // Incrémenter le nombre total de supporters *uniquement* si c'est un nouveau supporter
    if is_new_supporter {
        proposal.total_contributions = proposal.total_contributions.checked_add(1)
            .ok_or_else(|| error!(ErrorCode::Overflow))?;
        
        // Initialiser les champs fixes SEULEMENT si le compte est nouveau
        // (car user_support.amount était 0, et `init_if_needed` ne les initialise pas)
        user_support.epoch_id = proposal.epoch_id;
        user_support.user = user.key();
        user_support.proposal = proposal.key();
    }

    // --- 3. Mettre à jour le montant cumulé dans UserProposalSupport ---
    // Mettre à jour (cumuler) le montant total supporté par cet utilisateur (montant net)
    user_support.amount = user_support.amount.checked_add(net_support_amount)
        .ok_or_else(|| error!(ErrorCode::Overflow))?;

    msg!("User {} supported proposal {} with additional {} lamports (net), fee {} lamports. Total user support for this proposal: {} lamports. Epoch: {}",
        user_support.user,
        user_support.proposal,
        net_support_amount, // Montant net de cette transaction
        fee_amount,         // Montant des frais
        user_support.amount, // Montant total net cumulé par l'utilisateur pour cette proposition
        user_support.epoch_id
    );

    Ok(())
}

// L'enum local NosRugErrorCode est supprimé car nous utilisons maintenant ErrorCode de src/error.rs 