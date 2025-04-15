use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::*;

#[derive(Accounts)]
#[instruction(epoch_id: u64)]
pub struct GetEpochState<'info> {
    // Nous n'avons pas besoin d'un signataire car c'est une instruction en lecture seule
    // Nous avons juste besoin de l'account de l'époque
    pub epoch_management: Account<'info, EpochManagement>,
} 