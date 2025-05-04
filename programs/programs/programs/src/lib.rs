#![allow(unexpected_cfgs)]
#![allow(ambiguous_glob_reexports)]

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("3HBzNutk8DrRfffCS74S55adJAjgY8NHrWXgRtABaSbF");


#[program]
pub mod programs {
    use super::*;

    // --- Global program configuration initialization instruction --- 
    pub fn initialize_program_config(
        ctx: Context<InitializeProgramConfig>,
        admin_authority: Pubkey,
    ) -> Result<()> {
        initialize_program_config::handler(ctx, admin_authority)
    }

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(_ctx)
    }

    pub fn start_epoch(
        ctx: Context<StartEpoch>,
        epoch_id: u64,
        start_time: i64,
        end_time: i64,
    ) -> Result<()>{
        start_epoch::handler(ctx, epoch_id, start_time, end_time)
    }

    pub fn create_proposal(
        ctx: Context<CreateTokenProposal>,
        token_name: String,
        token_symbol: String,
        description: String,
        image_url: Option<String>,
        total_supply: u64,
        creator_allocation: u8,
        lockup_period: i64,
    ) -> Result<()> {
       create_token_proposal::handler(ctx, token_name, token_symbol, description, image_url, total_supply, creator_allocation, lockup_period)
    }

    pub fn support_proposal(ctx: Context<SupportProposal>, amount: u64) -> Result<()> {
        support_proposal::handler(ctx, amount)
    }

    pub fn end_epoch(
        ctx: Context<EndEpoch>,
        epoch_id: u64,
    ) -> Result<()> {
        // Verify that the epoch exists
        end_epoch::handler(ctx, epoch_id)
    }

    pub fn update_proposal_status(
        ctx: Context<UpdateProposalStatus>,
        new_status: ProposalStatus,
    ) -> Result<()> {
        update_proposal_status::handler(ctx, new_status)
    }

    // --- New instruction to mark an epoch as processed ---
    pub fn mark_epoch_processed(
        ctx: Context<MarkEpochProcessed>
    ) -> Result<()> {
        mark_epoch_processed::handler(ctx)
    }
}
