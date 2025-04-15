pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;


pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("89S48feUon6ffgtLzsnqoBVwdb1mxT4rmhRR5WnYefpA");

#[program]
pub mod programs {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(_ctx)
    }

    pub fn start_epoch(ctx: Context<StartEpoch>,
        epoch_id: u64,
        start_time: i64,
        end_time: i64,
    ) -> Result<()>{
        start_epoch::hanlder(ctx, epoch_id, start_time, end_time)
    }

    pub fn create_proposal(
        ctx: Context<CreateTokenProposal>,
        token_name: String,
        token_symbol: String,
        total_supply: u64,
        creator_allocation: u8,
        lockup_period: i64,
    ) -> Result<()> {
       create_token_proposal::handler(ctx, token_name, token_symbol, total_supply, creator_allocation, lockup_period)
    }

    pub fn get_epoch_state(
        ctx: Context<GetEpochState>,
        epoch_id: u64,
    ) -> Result<()> {
        get_epoch_state::handler(ctx, epoch_id)
    }
}
