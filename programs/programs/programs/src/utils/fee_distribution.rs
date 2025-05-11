use anchor_lang::prelude::*;
use crate::state::Treasury;
use crate::constants::*;
use crate::error::ErrorCode;

// Énumération pour spécifier le type de frais à distribuer
pub enum FeeType {
    ProposalCreation, // Frais fixes de création de proposition
    ProposalSupport,  // Frais en pourcentage du support de proposition
    PoolCreation,     // (Futur) Frais de création de pool
}

// Fonction utilitaire pour distribuer les frais dans la trésorerie
pub fn distribute_fees_to_treasury(
    treasury: &mut Account<Treasury>,
    fee_amount: u64,
    fee_type: FeeType,
) -> Result<()> {
    match fee_type {
        FeeType::ProposalCreation => {
            // Pour les frais de création de proposition (faibles), 100% vont aux opérations
            treasury.operations.sol_balance = treasury.operations.sol_balance
                .checked_add(fee_amount)
                .ok_or(ErrorCode::CalculationOverflow)?;
            msg!("Proposal creation fee ({} lamports) allocated 100% to Operations treasury.", fee_amount);
        }
        FeeType::ProposalSupport | FeeType::PoolCreation => {
            // Pour les autres types de frais (potentiellement plus élevés), appliquer la distribution standard
            let marketing_share = fee_amount
                .checked_mul(TREASURY_DISTRIBUTION_MARKETING_PERCENT as u64)
                .ok_or(ErrorCode::CalculationOverflow)?
                .checked_div(100)
                .ok_or(ErrorCode::CalculationOverflow)?;

            let team_share = fee_amount
                .checked_mul(TREASURY_DISTRIBUTION_TEAM_PERCENT as u64)
                .ok_or(ErrorCode::CalculationOverflow)?
                .checked_div(100)
                .ok_or(ErrorCode::CalculationOverflow)?;

            let operations_share = fee_amount
                .checked_mul(TREASURY_DISTRIBUTION_OPERATIONS_PERCENT as u64)
                .ok_or(ErrorCode::CalculationOverflow)?
                .checked_div(100)
                .ok_or(ErrorCode::CalculationOverflow)?;

            let investments_share = fee_amount
                .checked_mul(TREASURY_DISTRIBUTION_INVESTMENTS_PERCENT as u64)
                .ok_or(ErrorCode::CalculationOverflow)?
                .checked_div(100)
                .ok_or(ErrorCode::CalculationOverflow)?;

            // Le reste va au crank pour éviter les poussières de lamports
            let mut crank_share = fee_amount;
            crank_share = crank_share.saturating_sub(marketing_share);
            crank_share = crank_share.saturating_sub(team_share);
            crank_share = crank_share.saturating_sub(operations_share);
            crank_share = crank_share.saturating_sub(investments_share);

            treasury.marketing.sol_balance = treasury.marketing.sol_balance
                .checked_add(marketing_share)
                .ok_or(ErrorCode::CalculationOverflow)?;
            
            treasury.team.sol_balance = treasury.team.sol_balance
                .checked_add(team_share)
                .ok_or(ErrorCode::CalculationOverflow)?;

            treasury.operations.sol_balance = treasury.operations.sol_balance
                .checked_add(operations_share) // Ajoute la part standard des opérations
                .ok_or(ErrorCode::CalculationOverflow)?;
            
            treasury.investments.sol_balance = treasury.investments.sol_balance
                .checked_add(investments_share)
                .ok_or(ErrorCode::CalculationOverflow)?;

            treasury.crank.sol_balance = treasury.crank.sol_balance
                .checked_add(crank_share)
                .ok_or(ErrorCode::CalculationOverflow)?;

            msg!("Fee ({} lamports) distributed to treasury: M:{} T:{} O:{} I:{} C:{}", 
                 fee_amount, marketing_share, team_share, operations_share, investments_share, crank_share);
        }
    }
    Ok(())
} 