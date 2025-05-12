use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;
use crate::constants::*;
use crate::utils::{distribute_fees_to_treasury, FeeType};

#[derive(Accounts)]
#[instruction(
    token_name: String, 
    token_symbol: String, 
    total_supply: u64,
    creator_allocation: u8,
    lockup_period: i64,
)]
pub struct CreateTokenProposal<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    // Initialize the TokenProposal PDA
    #[account(
        init,
        payer = creator,
        space = 8 + TokenProposal::INIT_SPACE, // 8 bytes for discriminator
        seeds = [
            b"proposal", // Static seed prefix
            creator.key().as_ref(),
            epoch.epoch_id.to_le_bytes().as_ref(), 
            token_name.as_bytes()
        ],
        bump
    )]
    pub token_proposal: Account<'info, TokenProposal>,

    // We need the epoch account to check status and use its ID in seeds
    // Constraint example: ensure epoch is active
    // #[account(constraint = epoch.status == EpochStatus::Active @ CustomError::EpochNotActive)]
    pub epoch: Account<'info, EpochManagement>,

    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump
    )]
    pub treasury: Account<'info, Treasury>,

    pub system_program: Program<'info, System>,
}

// TODO: Implement handler logic in lib.rs
// pub fn handler(ctx: Context<CreateTokenProposal>, /* args */) -> Result<()> {
//     // Initialize token_proposal fields
//     // Check creator_allocation <= 10%
//     // Calculate supporter_allocation
//     Ok(())

// }

pub fn handler(
    ctx: Context<CreateTokenProposal>,
    token_name: String,
    token_symbol: String,
    description: String,
    image_url: Option<String>,
    total_supply: u64,
    creator_allocation: u8,
    lockup_period: i64,
) -> Result<()> {
    require!(
        creator_allocation <= 10,
        ErrorCode::CreatorAllocationTooHigh
    );
    require!(
        ctx.accounts.epoch.status == EpochStatus::Active,
        ErrorCode::EpochNotActive
    );

    // --- Gestion des Frais ---
    let creator_account_info = ctx.accounts.creator.to_account_info();
    let treasury_account_info = ctx.accounts.treasury.to_account_info();
    let system_program_account_info = ctx.accounts.system_program.to_account_info();

    // 1. Transférer les frais de création de proposition au compte Treasury
    let cpi_accounts_transfer = anchor_lang::system_program::Transfer {
        from: creator_account_info.clone(),
        to: treasury_account_info.clone(),
    };
    let cpi_context_transfer = anchor_lang::context::CpiContext::new(
        system_program_account_info.clone(), 
        cpi_accounts_transfer
    );
    anchor_lang::system_program::transfer(cpi_context_transfer, PROPOSAL_CREATION_FEE_LAMPORTS)?;

    // 2. Distribuer les frais perçus en utilisant la fonction utilitaire
    distribute_fees_to_treasury(
        &mut ctx.accounts.treasury,
        PROPOSAL_CREATION_FEE_LAMPORTS,
        FeeType::ProposalCreation
    )?;
    
    // --- Initialiser la proposition (logique existante) ---
    let proposal = &mut ctx.accounts.token_proposal;
    proposal.epoch_id = ctx.accounts.epoch.epoch_id;
    proposal.creator = ctx.accounts.creator.key();
    proposal.token_name = token_name;
    proposal.token_symbol = token_symbol;
    proposal.description = description;
    proposal.image_url = image_url;
    proposal.total_supply = total_supply;
    proposal.creator_allocation = creator_allocation;
    let remaining_allocation = 100u8.saturating_sub(creator_allocation);
    proposal.supporter_allocation = remaining_allocation.saturating_add(1) / 2;
    proposal.sol_raised = 0;
    proposal.total_contributions = 0;
    proposal.lockup_period = lockup_period;
    proposal.status = ProposalStatus::Active;

    Ok(())
}

