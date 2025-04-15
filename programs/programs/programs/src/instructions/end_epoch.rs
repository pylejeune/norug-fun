use anchor_lang::prelude::*;

use crate::state::*;

use crate::error::ErrorCode;

pub fn handler(ctx: Context<EndEpoch>, epoch_id: u64) -> Result<()> {
    // Vérifier que l'époque existe
    let epoch = &mut ctx.accounts.epoch_management;
    
    // Vérifier que l'ID de l'époque correspond
    require!(
        epoch.epoch_id == epoch_id,
        ErrorCode::InvalidEpochId
    );
    
    // Vérifier que l'époque est actuellement active
    require!(
        matches!(epoch.status, EpochStatus::Active),
        ErrorCode::EpochAlreadyInactive
    );
    
    // Mettre à jour le statut de l'époque à inactive
    epoch.status = EpochStatus::Closed;
    
    // Émettre un événement pour la clôture de l'époque
    emit!(EpochEnded {
        epoch_id,
        ended_at: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(epoch_id: u64)]
pub struct EndEpoch<'info> {
    #[account(
        mut,
        seeds = [b"epoch", epoch_id.to_le_bytes().as_ref()],
        bump
    )]
    pub epoch_management: Account<'info, EpochManagement>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[event]
pub struct EpochEnded {
    pub epoch_id: u64,
    pub ended_at: i64,
} 