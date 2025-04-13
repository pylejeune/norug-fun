use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::*;

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