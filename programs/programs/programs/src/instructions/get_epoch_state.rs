use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(epoch_id: u64)]
pub struct GetEpochState<'info> {
    // Nous n'avons pas besoin d'un signataire car c'est une instruction en lecture seule
    // Nous avons juste besoin de l'account de l'époque
    pub epoch_management: Account<'info, EpochManagement>,
}

pub fn handler(
    ctx: Context<GetEpochState>,
    epoch_id: u64,
) -> Result<()> {
    // Vérifier que l'ID de l'époque correspond
    require!(
        ctx.accounts.epoch_management.epoch_id == epoch_id,
        ErrorCode::EpochNotFound
    );

    // Aucune modification n'est nécessaire, nous retournons simplement Ok(())
    // Les informations de l'époque seront accessibles via ctx.accounts.epoch_management
    Ok(())
}