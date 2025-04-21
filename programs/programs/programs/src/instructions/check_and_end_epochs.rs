use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;
use crate::constants::*;
use crate::instructions::end_epoch::EpochEnded;

#[derive(Accounts)]
pub struct CheckAndEndEpochs<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump
    )]
    pub program_config: Account<'info, ProgramConfig>,

    /// CHECK: This is the PDA for the epoch we want to check
    #[account(mut)]
    pub epoch_management: Account<'info, EpochManagement>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CheckAndEndEpochs>) -> Result<()> {
    // Vérifier que l'autorité est bien l'admin
    require!(
        ctx.accounts.authority.key() == ctx.accounts.program_config.admin_authority,
        ErrorCode::InvalidAuthority
    );

    // Récupérer l'heure actuelle
    let current_time = Clock::get()?.unix_timestamp;

    // Vérifier si l'époque doit être terminée
    let epoch = &mut ctx.accounts.epoch_management;
    
    if matches!(epoch.status, EpochStatus::Active) && current_time >= epoch.end_time {
        // L'époque doit être terminée
        epoch.status = EpochStatus::Closed;
        epoch.end_time = current_time;

        // Émettre un événement pour la clôture de l'époque
        emit!(EpochEnded {
            epoch_id: epoch.epoch_id,
            ended_at: current_time,
        });

        msg!("Epoch {} automatically ended at {}", epoch.epoch_id, current_time);
    }

    Ok(())
} 