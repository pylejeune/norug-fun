use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;
// Imports directs depuis la racine des crates
use solana_unified_scheduler_pool::{ScheduledTask, ID as SCHEDULER_ID};
use solana_unified_scheduler_logic::TaskResponse;

// Structure de compte pour l'instruction check_epoch_end
#[derive(Accounts)]
pub struct CheckEpochEnd<'info> {
    // Le compte EpochManagement à vérifier
    #[account(mut)]
    pub epoch_management: Account<'info, EpochManagement>,
    
    // La tâche planifiée qui exécute cette vérification
    #[account(mut)]
    pub scheduled_task: Account<'info, ScheduledTask>,
    
    // Le programme scheduler
    /// CHECK: C'est le programme Unified Scheduler
    #[account(address = SCHEDULER_ID)] // Utiliser la constante renommée
    pub scheduler_program: UncheckedAccount<'info>,
    
    // Le programme système
    pub system_program: Program<'info, System>,
}

// Gestionnaire de l'instruction
pub fn handler(ctx: Context<CheckEpochEnd>) -> Result<TaskResponse> {
    // Récupérer l'époque à vérifier
    let epoch = &mut ctx.accounts.epoch_management;
    
    // Vérifier que l'époque est active
    if !matches!(epoch.status, EpochStatus::Active) {
        msg!("L'époque {} n'est plus active, arrêt de la tâche planifiée", epoch.epoch_id);
        return Ok(TaskResponse::Complete);
    }
    
    // Récupérer l'heure actuelle
    let current_time = Clock::get()?.unix_timestamp;
    msg!("Vérification de l'époque {}. Heure actuelle: {}, Fin prévue: {}", 
         epoch.epoch_id, current_time, epoch.end_time);
    
    // Vérifier si l'époque est terminée
    if current_time >= epoch.end_time {
        msg!("L'époque {} est terminée! Fermeture automatique...", epoch.epoch_id);
        
        // Mettre à jour le statut de l'époque à Closed
        epoch.status = EpochStatus::Closed;
        epoch.end_time = current_time;
        
        // Émettre un événement pour la clôture automatique de l'époque
        emit!(EpochAutoEnded {
            epoch_id: epoch.epoch_id,
            ended_at: current_time,
        });
        
        // La tâche peut s'arrêter maintenant que l'époque est fermée
        msg!("Époque {} clôturée avec succès, arrêt de la tâche planifiée", epoch.epoch_id);
        
        // Marquer la tâche comme terminée via CPI
        solana_unified_scheduler_pool::instruction::complete_task(
            CpiContext::new(
                ctx.accounts.scheduler_program.to_account_info(),
                solana_unified_scheduler_pool::instruction::CompleteTask {
                    task: ctx.accounts.scheduled_task.to_account_info(),
                },
            )
        )?;
        
        return Ok(TaskResponse::Complete);
    }
    
    // L'époque n'est pas encore terminée, continuer à vérifier
    msg!("L'époque {} est toujours active. Prochaine vérification selon le calendrier défini.", epoch.epoch_id);
    Ok(TaskResponse::Continue)
}

// Événement émis lors de la clôture automatique d'une époque
#[event]
pub struct EpochAutoEnded {
    pub epoch_id: u64,
    pub ended_at: i64,
} 