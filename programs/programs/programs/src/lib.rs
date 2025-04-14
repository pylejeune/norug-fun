pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use crate::error::ErrorCode;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("6YpGMWKrqbbsspCbUgXFH1x7RiSnoaXuS3FsG4GWfTdf");

#[program]
pub mod programs {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(_ctx)
    }

    pub fn start_epoch(
        ctx: Context<StartEpoch>,
        epoch_id: u64,
        start_time: i64,
        end_time: i64,
    ) -> Result<()> {
        // Vérifier que start_time est inférieur à end_time
        require!(
            start_time < end_time,
            ErrorCode::InvalidEpochTimeRange
        );

        // Initialiser l'époque
        let epoch = &mut ctx.accounts.epoch_management;
        epoch.epoch_id = epoch_id;
        epoch.start_time = start_time;
        epoch.end_time = end_time;
        epoch.status = EpochStatus::Active;

        Ok(())
    }

    pub fn create_proposal(
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
        proposal.supporter_allocation = 90 - creator_allocation; // Le reste va aux supporters
        proposal.sol_raised = 0;
        proposal.total_contributions = 0;
        proposal.lockup_period = lockup_period;
        proposal.status = ProposalStatus::Active;

        Ok(())
    }
}
