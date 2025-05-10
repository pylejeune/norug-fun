use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct EpochManagement {
    pub epoch_id: u64,                // Unique identifier for the epoch
    pub start_time: i64,              // Epoch start timestamp
    pub end_time: i64,                // Epoch end timestamp
    pub status: EpochStatus,          // Enum indicating the epoch status
    pub processed: bool,              // Indicates if the epoch has been processed
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace, Debug)]
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
    pub token_symbol: String,  
    #[max_len(512)]
    pub description : String,       // Token symbol
    #[max_len(256)]
    pub image_url: Option<String>,    // URL d'une image illustrative (optionnel)
    pub total_supply: u64,            // Total token supply
    pub creator_allocation: u8,       // % of supply for the creator (max 10%)
    pub supporter_allocation: u8,     // % for supporters = ceil((100 - creator_allocation) / 2)
    pub sol_raised: u64,              // SOL raised via UserProposalSupport
    pub total_contributions: u64,     // Number of supporters
    pub lockup_period: i64,           // Lock-up period in seconds during which the creator cannot sell
    pub status: ProposalStatus,       // Enum indicating the proposal status
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace, Debug)] // Added Debug to allow logging the status using msg! with {:?}
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

// --- Catégories de la Trésorerie ---
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace, Debug)]
pub enum TreasuryCategory {
    Marketing,
    Team,
    Operations,
    Investments,
    Crank,
}

// --- Sous-compte de Trésorerie ---
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, Debug)]
pub struct TreasurySubAccount {
    pub sol_balance: u64,           // SOL détenu dans ce sous-compte
    pub last_withdrawal: i64,       // Timestamp du dernier retrait
}

// --- Nouvelle structure Treasury avec sous-comptes ---
#[account]
#[derive(InitSpace)]
pub struct Treasury {
    pub authority: Pubkey,          // Public key autorisée à gérer la trésorerie globale
    pub marketing: TreasurySubAccount,
    pub team: TreasurySubAccount,
    pub operations: TreasurySubAccount,
    pub investments: TreasurySubAccount,
    pub crank: TreasurySubAccount,
}

// --- Types de rôles pour la gestion ---
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace, Debug)]
pub enum RoleType {
    Admin,
    CategoryManager(TreasuryCategory),
    Withdrawer(TreasuryCategory),
}

// --- Structure d'un rôle ---
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, Debug)]
pub struct TreasuryRole {
    pub role_type: RoleType,
    pub pubkey: Pubkey,             // Détenteur du rôle
    pub withdrawal_limit: Option<u64>, // Limite de retrait (optionnelle)
    pub withdrawal_period: Option<i64>, // Période de retrait (optionnelle)
}

// --- Mapping des rôles ---
#[account]
#[derive(InitSpace)]
pub struct TreasuryRoles {
    pub authority: Pubkey,          // Admin des rôles
    #[max_len(16)]
    pub roles: Vec<TreasuryRole>,   // Liste des rôles attribués
}

// --- Nouveau compte de configuration globale ---
#[account]
#[derive(InitSpace)]
pub struct ProgramConfig {
    // Clé publique de l'autorité autorisée à exécuter certaines instructions (ex: update_proposal_status)
    pub admin_authority: Pubkey,
    // On pourrait ajouter d'autres paramètres globaux ici si nécessaire
}
