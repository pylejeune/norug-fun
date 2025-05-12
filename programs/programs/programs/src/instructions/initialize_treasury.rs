use anchor_lang::prelude::*;
use crate::state::{Treasury, TreasurySubAccount};

#[derive(Accounts)]
pub struct InitializeTreasury<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Treasury::INIT_SPACE, // 8 pour le discriminateur + espace de la structure
        seeds = [b"treasury".as_ref()],
        bump
    )]
    pub treasury: Account<'info, Treasury>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_treasury(ctx: Context<InitializeTreasury>, initial_authority: Pubkey) -> Result<()> {
    let treasury = &mut ctx.accounts.treasury;
    treasury.authority = initial_authority;
    treasury.marketing = TreasurySubAccount {
        sol_balance: 0,
        last_withdrawal: 0,
    };
    treasury.team = TreasurySubAccount {
        sol_balance: 0,
        last_withdrawal: 0,
    };
    treasury.operations = TreasurySubAccount {
        sol_balance: 0,
        last_withdrawal: 0,
    };
    treasury.investments = TreasurySubAccount {
        sol_balance: 0,
        last_withdrawal: 0,
    };
    treasury.crank = TreasurySubAccount {
        sol_balance: 0,
        last_withdrawal: 0,
    };
    msg!("Treasury account initialized with authority: {}", initial_authority);
    Ok(())
} 