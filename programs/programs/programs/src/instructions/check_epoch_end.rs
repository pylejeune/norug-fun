use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;
use clockwork_sdk::state::{Thread, ThreadResponse};

#[derive(Accounts)]
pub struct CheckEpochEnd<'info> {
    // Le compte EpochManagement à vérifier
    #[account(mut)]
    pub epoch_management: Account<'info, EpochManagement>,
    
    // Le thread Clockwork qui exécute cette vérification
    #[account(
        mut,
        constraint = thread.pda == thread.key()
    )]
    pub thread: Account<'info, Thread>,
    
    // Le programme système
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CheckEpochEnd>) -> Result<ThreadResponse> {
    // Récupérer l'époque à vérifier
    let epoch = &mut ctx.accounts.epoch_management;
    
    // Vérifier que l'époque est active
    require!(
        matches!(epoch.status, EpochStatus::Active),
        ErrorCode::EpochAlreadyInactive
    );
    
    // Récupérer l'heure actuelle
    let current_time = Clock::get()?.unix_timestamp;
    
    // Vérifier si l'époque est terminée
    if current_time >= epoch.end_time {
        // Mettre à jour le statut de l'époque à closed
        epoch.status = EpochStatus::Closed;
        
        // Émettre un événement pour la clôture automatique de l'époque
        emit!(EpochAutoEnded {
            epoch_id: epoch.epoch_id,
            ended_at: current_time,
        });

        // Arrêter le thread Clockwork car l'époque est terminée
        return Ok(ThreadResponse::Stop);
    }
    
    // Continuer à exécuter le thread
    Ok(ThreadResponse::Continue)
}

#[event]
pub struct EpochAutoEnded {
    pub epoch_id: u64,
    pub ended_at: i64,
} 