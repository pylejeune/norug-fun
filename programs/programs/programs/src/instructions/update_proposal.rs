use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct UpdateProposal<'info> {
    #[account(mut)]
    pub proposal: Account<'info, TokenProposal>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(mut)]
    pub epoch: Account<'info, EpochManagement>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<UpdateProposal>,
    token_name: Option<String>,
    token_symbol: Option<String>,
    total_supply: Option<u64>,
    creator_allocation: Option<u8>,
    lockup_period: Option<i64>,
) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;

    // Vérifier que le créateur est bien le créateur de la proposition
    require!(
        proposal.creator == ctx.accounts.creator.key(),
        ErrorCode::UnauthorizedCreator
    );

    // Vérifier que l'époque est active
    require!(
        ctx.accounts.epoch.status == EpochStatus::Active,
        ErrorCode::EpochNotActive
    );

    // Vérifier que la proposition est active
    require!(
        proposal.status == ProposalStatus::Active,
        ErrorCode::ProposalNotActive
    );

    // Mettre à jour les champs si fournis
    if let Some(name) = token_name {
        proposal.token_name = name;
    }

    if let Some(symbol) = token_symbol {
        proposal.token_symbol = symbol;
    }

    if let Some(supply) = total_supply {
        proposal.total_supply = supply;
    }

    if let Some(allocation) = creator_allocation {
        // Vérifier que l'allocation du créateur ne dépasse pas 10%
        require!(
            allocation <= 10,
            ErrorCode::CreatorAllocationTooHigh
        );

        proposal.creator_allocation = allocation;
        proposal.supporter_allocation = 100 - allocation;
    }

    if let Some(period) = lockup_period {
        proposal.lockup_period = period;
    }

    // Émettre un événement
    emit!(ProposalUpdated {
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

#[event]
pub struct ProposalUpdated {
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
