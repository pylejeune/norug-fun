use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use anchor_lang::solana_program;
// Imports directs depuis la racine du crate
use solana_unified_scheduler_pool::{
    SchedulerPool, ScheduledTask, TaskSettings, TaskTrigger, ID as SCHEDULER_ID
};
use crate::state::*;
use crate::error::ErrorCode;

// Structure de compte pour l'instruction create_epoch_task
#[derive(Accounts)]
#[instruction(epoch_id: u64, task_id: String)]
pub struct CreateEpochTask<'info> {
    // Compte de l'autorité qui initie la création de la tâche
    #[account(mut)]
    pub authority: Signer<'info>,
    
    // Le compte de gestion d'époque associé
    #[account(
        mut,
        seeds = [b"epoch", epoch_id.to_le_bytes().as_ref()],
        bump,
        constraint = epoch_management.status == EpochStatus::Active @ ErrorCode::EpochAlreadyInactive
    )]
    pub epoch_management: Account<'info, EpochManagement>,
    
    // Compte PDA qui sera le propriétaire de la tâche planifiée
    #[account(
        seeds = [b"task_authority", epoch_id.to_le_bytes().as_ref()],
        bump
    )]
    /// CHECK: Ce compte est un PDA dérivé de notre programme
    pub task_authority: UncheckedAccount<'info>,
    
    // Le compte de la tâche planifiée à créer
    #[account(
        init,
        payer = authority,
        space = 8 + ScheduledTask::SIZE, // Utiliser la taille définie par le scheduler
        seeds = [b"scheduled_task", epoch_id.to_le_bytes().as_ref(), task_id.as_bytes()],
        bump
    )]
    pub scheduled_task: Account<'info, ScheduledTask>,
    
    // Le pool de planification qui gérera la tâche
    #[account(mut)]
    pub scheduler_pool: Account<'info, SchedulerPool>,
    
    // Le programme unified scheduler 
    /// CHECK: Adresse du programme Unified Scheduler
    #[account(address = SCHEDULER_ID)] // Utiliser la constante renommée
    pub scheduler_program: UncheckedAccount<'info>,
    
    // Programme système Solana
    pub system_program: Program<'info, System>,
}

// Gestionnaire de l'instruction
pub fn handler(
    ctx: Context<CreateEpochTask>,
    epoch_id: u64,
    task_id: String,
    schedule: String, // Par exemple "*/5 * * * *" pour toutes les 5 minutes
) -> Result<()> {
    msg!("Création d'une tâche planifiée pour l'époque {}", epoch_id);
    
    // Calcul du bump pour l'autorité de la tâche
    // Utiliser try_get pour éviter le panic si le bump n'est pas trouvé
    let bump = *ctx.bumps.get("task_authority").ok_or(ErrorCode::CustomError)?;
    let seeds = &[b"task_authority", epoch_id.to_le_bytes().as_ref(), &[bump]];
    let signer_seeds = &[&seeds[..]];
    
    // Construction de l'instruction pour vérifier l'époque
    // Cette instruction sera exécutée selon le calendrier défini
    let target_ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: crate::ID,
        accounts: vec![
            anchor_lang::solana_program::instruction::AccountMeta::new(ctx.accounts.epoch_management.key(), false),
            anchor_lang::solana_program::instruction::AccountMeta::new(ctx.accounts.scheduled_task.key(), true),
            anchor_lang::solana_program::instruction::AccountMeta::new(ctx.accounts.scheduler_program.key(), false),
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(system_program::ID, false),
        ],
        // Utiliser la fonction data() d'Anchor 0.30+ sur la structure dédiée
        data: crate::CheckEpochEndInstruction{}.data(), 
    };

    // Création de la tâche planifiée
    let settings = TaskSettings {
        authority: ctx.accounts.task_authority.key(),
        instruction: target_ix,
        trigger: TaskTrigger::Cron {
            schedule: schedule.clone(),
            skippable: true,
        },
        max_fee: None,  // Utiliser les frais par défaut
    };

    // Enregistrer la tâche dans le pool de planification via CPI
    solana_unified_scheduler_pool::instruction::register_task(
        CpiContext::new_with_signer(
            ctx.accounts.scheduler_program.to_account_info(),
            solana_unified_scheduler_pool::instruction::RegisterTask {
                authority: ctx.accounts.task_authority.to_account_info(),
                payer: ctx.accounts.authority.to_account_info(),
                task: ctx.accounts.scheduled_task.to_account_info(),
                pool: ctx.accounts.scheduler_pool.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
            signer_seeds,
        ),
        settings,
    )?;
    
    // Émettre un événement pour la création de la tâche
    emit!(TaskCreatedEvent {
        epoch_id,
        task_id: task_id.clone(),
        schedule: schedule.clone(),
        created_at: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

// Événement émis lors de la création d'une tâche
#[event]
pub struct TaskCreatedEvent {
    pub epoch_id: u64,
    pub task_id: String,
    pub schedule: String,
    pub created_at: i64,
} 