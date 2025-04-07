use anchor_lang::prelude::*;

declare_id!("4gUNTDbioBPSZhdaxmGmMnnf1XUJxxc8kCYyPCo1uiso");

#[program]
pub mod norug_fun {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
