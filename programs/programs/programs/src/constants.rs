use anchor_lang::prelude::*;

#[constant]
pub const SEED: &str = "anchor";

// --- Frais ---
// Frais de création de proposition en lamports (0.005 SOL)
pub const PROPOSAL_CREATION_FEE_LAMPORTS: u64 = 5_000_000;

// Frais de support en pourcentage (0.5%)
// SUPPORT_FEE_PERCENTAGE_NUMERATOR / SUPPORT_FEE_PERCENTAGE_DENOMINATOR
// Par exemple, 5 / 1000 = 0.005 (soit 0.5%)
pub const SUPPORT_FEE_PERCENTAGE_NUMERATOR: u64 = 5;
pub const SUPPORT_FEE_PERCENTAGE_DENOMINATOR: u64 = 1000;

// --- Pourcentages de Distribution de la Trésorerie (sur une base de 100) ---
// Doivent sommer à 100
pub const TREASURY_DISTRIBUTION_MARKETING_PERCENT: u8 = 10; // 10%
pub const TREASURY_DISTRIBUTION_TEAM_PERCENT: u8 = 40;       // 40%
pub const TREASURY_DISTRIBUTION_OPERATIONS_PERCENT: u8 = 5;  // 5%
pub const TREASURY_DISTRIBUTION_INVESTMENTS_PERCENT: u8 = 44; // 44%
pub const TREASURY_DISTRIBUTION_CRANK_PERCENT: u8 = 1;       // 1%

// Seed pour le PDA Treasury
pub const TREASURY_SEED: &[u8] = b"treasury";
