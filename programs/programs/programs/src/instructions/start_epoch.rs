use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;
use clockwork_sdk::state::{Thread, ThreadResponse};

#[derive(Accounts)]
#[instruction(epoch_id: u64)] // If epoch_id is needed for PDA seeds
pub struct StartEpoch<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,
    // Initialize a new epoch account using PDA
    #[account(
        init,
        payer = authority,
        space = 8 + EpochManagement::INIT_SPACE, // 8 bytes for discriminator
        seeds = [b"epoch", epoch_id.to_le_bytes().as_ref()],
        bump
    )]
    pub epoch_management: Account<'info, EpochManagement>, // Here we use our EpochManagement struct

    // Le thread Clockwork pour la vérification automatique
    #[account(
        init,
        payer = authority,
        space = 8 + Thread::INIT_SPACE,
        seeds = [b"thread", epoch_management.key().as_ref()],
        bump
    )]
    pub thread: Account<'info, Thread>,

    pub system_program: Program<'info, System>,
}

// TODO: Implement handler logic in lib.rs
// pub fn handler(ctx: Context<StartEpoch>, epoch_id: u64, start_time: i64, end_time: i64) -> Result<()> {
//     // Set epoch_management fields (epoch_id, start_time, end_time, status = Active)
//     Ok(())

// }

pub fn handler(
    ctx: Context<StartEpoch>,
    epoch_id: u64,
    start_time: i64,
    end_time: i64,
) -> Result<()> {
    // Vérifier que start_time est inférieur à end_time
    require!(
        start_time < end_time,
        ErrorCode::InvalidEpochTimeRange
    );

    // Initialiser l'époque
    let epoch = &mut ctx.accounts.epoch_management;
    epoch.epoch_id = epoch_id;
    epoch.start_time = start_time;
    epoch.end_time = end_time;
    epoch.status = EpochStatus::Active;

    // Configurer le thread Clockwork
    let thread = &mut ctx.accounts.thread;
    thread.pda = thread.key();
    thread.program_id = ctx.program_id;
    thread.trigger = clockwork_sdk::state::Trigger::Cron {
        schedule: "*/5 * * * *".to_string(), // Vérifier toutes les 5 minutes
    };
    thread.instructions = vec![
        // Instruction pour vérifier l'époque
        clockwork_sdk::state::Instruction {
            program_id: ctx.program_id,
            accounts: vec![
                clockwork_sdk::state::AccountMeta {
                    pubkey: epoch.key(),
                    is_signer: false,
                    is_writable: true,
                },
                clockwork_sdk::state::AccountMeta {
                    pubkey: thread.key(),
                    is_signer: false,
                    is_writable: true,
                },
                clockwork_sdk::state::AccountMeta {
                    pubkey: ctx.accounts.system_program.key(),
                    is_signer: false,
                    is_writable: false,
                },
            ],
            data: vec![], // Les données seront encodées par le programme
        },
    ];

    Ok(())
}