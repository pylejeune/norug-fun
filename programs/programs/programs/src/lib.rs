pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use anchor_lang::InstructionData;
use solana_unified_scheduler_logic::TaskResponse;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("89S48feUon6ffgtLzsnqoBVwdb1mxT4rmhRR5WnYefpA");

// Définir la structure de données pour l'instruction sans arguments
// afin que .data() fonctionne
#[derive(InstructionData)]
pub struct CheckEpochEndInstruction { }

#[program]
pub mod programs {
    use super::*;

    // --- Instruction d'initialisation de la config globale --- 
    pub fn initialize_program_config(
        ctx: Context<InitializeProgramConfig>,
        admin_authority: Pubkey,
    ) -> Result<()> {
        initialize_program_config::handler(ctx, admin_authority)
    }

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(_ctx)
    }

    pub fn start_epoch(
        ctx: Context<StartEpoch>,
        epoch_id: u64,
        start_time: i64,
        end_time: i64,
    ) -> Result<()>{
        start_epoch::hanlder(ctx, epoch_id, start_time, end_time)
    }

    pub fn create_proposal(
        ctx: Context<CreateTokenProposal>,
        token_name: String,
        token_symbol: String,
        total_supply: u64,
        creator_allocation: u8,
        lockup_period: i64,
    ) -> Result<()> {
       create_token_proposal::handler(ctx, token_name, token_symbol, total_supply, creator_allocation, lockup_period)
    }

    pub fn support_proposal(ctx: Context<SupportProposal>, amount: u64) -> Result<()> {
        instructions::support_proposal::handler(ctx, amount)
    }

    pub fn get_epoch_state(
        ctx: Context<GetEpochState>,
        epoch_id: u64,
    ) -> Result<()> {
        get_epoch_state::handler(ctx, epoch_id)
    }

    pub fn end_epoch(
        ctx: Context<EndEpoch>,
        epoch_id: u64,
    ) -> Result<()> {
        // Vérifier que l'époque existe
        end_epoch::handler(ctx, epoch_id)
    }

    pub fn get_proposal_details(
        ctx: Context<GetProposalDetails>,
        proposal_id: u64,
    ) -> Result<()> {
        get_proposal_details::handler(ctx, proposal_id)
    }

    pub fn update_proposal_status(
        ctx: Context<UpdateProposalStatus>,
        new_status: ProposalStatus,
    ) -> Result<()> {
        update_proposal_status::handler(ctx, new_status)
    }
    
    // --- Nouvelles instructions pour la planification automatique --- 
    
    /// Créer une tâche planifiée qui vérifiera automatiquement si une époque est terminée
    pub fn create_epoch_task(
        ctx: Context<CreateEpochTask>,
        epoch_id: u64,
        task_id: String,
        schedule: String,
    ) -> Result<()> {
        create_epoch_task::handler(ctx, epoch_id, task_id, schedule)
    }
    
    /// Vérifier si une époque est terminée (appelé automatiquement par le scheduler)
    pub fn check_epoch_end(
        ctx: Context<CheckEpochEnd>,
    ) -> Result<TaskResponse> {
        check_epoch_end::handler(ctx)
    }
}
