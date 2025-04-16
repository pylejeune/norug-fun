use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct GetProposalDetails<'info> {
    #[account(mut)]
    pub proposal: Account<'info, TokenProposal>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct ProposalDetailsRetrieved {
    pub epoch_id: u64,
    pub creator: Pubkey,
    pub token_name: String,
    pub token_symbol: String,
    pub total_supply: u64,
    pub creator_allocation: u8,
    pub supporter_allocation: u8,
    pub sol_raised: u64,
    pub total_contributions: u64,
    pub lockup_period: i64,
    pub status: ProposalStatus,
}


pub fn handler(ctx: Context<GetProposalDetails>, proposal_id: u64) -> Result<()> {
    let proposal = &ctx.accounts.proposal;
    
    // Vérifier que la proposition existe
    require!(proposal.epoch_id == proposal_id, ErrorCode::EpochNotFound);
    
    // Émettre un événement avec les détails de la proposition
    emit!(ProposalDetailsRetrieved {
        epoch_id: proposal.epoch_id,
        creator: proposal.creator,
        token_name: proposal.token_name.clone(),
        token_symbol: proposal.token_symbol.clone(),
        total_supply: proposal.total_supply,
        creator_allocation: proposal.creator_allocation,
        supporter_allocation: proposal.supporter_allocation,
        sol_raised: proposal.sol_raised,
        total_contributions: proposal.total_contributions,
        lockup_period: proposal.lockup_period,
        status: proposal.status.clone(),
    });
    
    Ok(())
}