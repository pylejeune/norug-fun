use anchor_lang::prelude::*;

use crate::state::{EpochManagement, EpochStatus, ProgramConfig};
use crate::error::ErrorCode;

pub fn handler(ctx: Context<EndEpoch>, epoch_id: u64) -> Result<()> {
    require!(
        ctx.accounts.authority.key() == ctx.accounts.program_config.admin_authority,
        ErrorCode::Unauthorized
    );

    let epoch = &mut ctx.accounts.epoch_management;
    
    require!(
        epoch.epoch_id == epoch_id,
        ErrorCode::InvalidEpochId
    );
    
    require!(
        matches!(epoch.status, EpochStatus::Active),
        ErrorCode::EpochAlreadyInactive
    );
    
    let current_time = Clock::get()?.unix_timestamp;
    
    epoch.status = EpochStatus::Closed;
    epoch.end_time = current_time;

    println!("Epoch: {:?}", epoch.status);
    
    emit!(EpochEnded {
        epoch_id,
        ended_at: current_time,
    });
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(epoch_id: u64)]
pub struct EndEpoch<'info> {
    #[account(
        seeds = [b"config"],
        bump
    )]
    pub program_config: Account<'info, ProgramConfig>,

    #[account(
        mut,
        seeds = [b"epoch", epoch_id.to_le_bytes().as_ref()],
        bump
    )]
    pub epoch_management: Account<'info, EpochManagement>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[event]
pub struct EpochEnded {
    pub epoch_id: u64,
    pub ended_at: i64,
} 