use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::*;

#[derive(Accounts)]
#[instruction(epoch_id: u64)] // If epoch_id is needed for PDA seeds
pub struct StartEpoch<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,
    // Initialize a new epoch account using PDA
    #[account(
        init,
        payer = authority,
        space = 8 + EpochManagement::INIT_SPACE, // 8 bytes for discriminator
        seeds = [b"epoch", epoch_id.to_le_bytes().as_ref()],
        bump
    )]
    pub epoch_management: Account<'info, EpochManagement>, // Here we use our EpochManagement struct

    pub system_program: Program<'info, System>,
}

// TODO: Implement handler logic in lib.rs
// pub fn handler(ctx: Context<StartEpoch>, epoch_id: u64, start_time: i64, end_time: i64) -> Result<()> {
//     // Set epoch_management fields (epoch_id, start_time, end_time, status = Active)
//     Ok(())
// } 