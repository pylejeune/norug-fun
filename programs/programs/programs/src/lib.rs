pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("AShDD8HM1XMh3T2ynMrZvwGUBSbuWe6oAEcucrZswU4G");


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

    pub fn support_proposal(ctx: Context<SupportProposal>, amount: u64) -> Result<()> {
        instructions::support_proposal::handler(ctx, amount)
    }

    pub fn get_epoch_state(
        ctx: Context<GetEpochState>,
        epoch_id: u64,
    ) -> Result<()> {
        get_epoch_state::handler(ctx, epoch_id)
    }

    pub fn end_epoch(
        ctx: Context<EndEpoch>,
        epoch_id: u64,
    ) -> Result<()> {
        // Vérifier que l'époque existe
        end_epoch::handler(ctx, epoch_id)
    }

    pub fn get_proposal_details(
        ctx: Context<GetProposalDetails>,
        proposal_id: u64,
    ) -> Result<()> {
        get_proposal_details::handler(ctx, proposal_id)
    }

    pub fn check_epoch_end(
        ctx: Context<CheckEpochEnd>,
    ) -> Result<()> {
        check_epoch_end::handler(ctx)
    }
}
