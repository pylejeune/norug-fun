use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;

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
    total_supply: u64,
    creator_allocation: u8,
    lockup_period: i64,
) -> Result<()> {
    // Vérifier que l'allocation du créateur ne dépasse pas 10%
    require!(
        creator_allocation <= 10,
        ErrorCode::CreatorAllocationTooHigh
    );

    // Vérifier que l'époque est active
    require!(
        ctx.accounts.epoch.status == EpochStatus::Active,
        ErrorCode::EpochNotActive
    );


    // Initialiser la proposition
    let proposal = &mut ctx.accounts.token_proposal;
    proposal.epoch_id = ctx.accounts.epoch.epoch_id;
    proposal.creator = ctx.accounts.creator.key();
    proposal.token_name = token_name;
    proposal.token_symbol = token_symbol;
    proposal.total_supply = total_supply;
    proposal.creator_allocation = creator_allocation;
    // Calculer la part restante et l'allocation des supporters (arrondi supérieur)
    let remaining_allocation = 100u8.saturating_sub(creator_allocation);
    proposal.supporter_allocation = remaining_allocation.saturating_add(1) / 2;
    proposal.sol_raised = 0;
    proposal.total_contributions = 0;
    proposal.lockup_period = lockup_period;
    proposal.status = ProposalStatus::Active;

    Ok(())
}

