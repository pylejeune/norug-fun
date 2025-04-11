use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct EpochManagement {
    pub epoch_id: u64,                // Unique identifier for the epoch
    pub start_time: i64,              // Epoch start timestamp
    pub end_time: i64,                // Epoch end timestamp
    pub status: EpochStatus,          // Enum indicating the epoch status
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum EpochStatus {
    Active,
    Pending,
    Closed,
}

#[account]
#[derive(InitSpace)]
pub struct TokenProposal {
    pub epoch_id: u64,                // Unique identifier for the epoch
    pub creator: Pubkey,              // Owner of the proposal
    #[max_len(32)]
    pub token_name: String,           // Token name
    #[max_len(8)]
    pub token_symbol: String,         // Token symbol
    pub total_supply: u64,            // Total token supply
    pub creator_allocation: u8,       // % of supply for the creator (max 10%)
    pub supporter_allocation: u8,     // % of supply for supporters (calculated by norug)
    pub sol_raised: u64,              // SOL raised via UserProposalSupport
    pub total_contributions: u64,     // Number of supporters
    pub lockup_period: i64,           // Lock-up period in seconds during which the creator cannot sell
    pub status: ProposalStatus,       // Enum indicating the proposal status
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ProposalStatus {
    Active,
    Validated,
    Rejected,
}

#[account]
#[derive(InitSpace)]
pub struct UserProposalSupport {
    pub epoch_id: u64,                // Unique identifier for the epoch
    pub user: Pubkey,                 // The user who contributed
    pub proposal: Pubkey,             // The targeted TokenProposal
    pub amount: u64,                  // SOL invested
}

#[account]
#[derive(InitSpace)]
pub struct Treasury {
    pub authority: Pubkey,     // Public key authorized to manage the treasury
    pub platform_fees: u64,    // Total platform fees collected in lamports
}
