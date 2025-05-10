// Treasury role management instructions for the norug.fun protocol
// This file provides Anchor instructions to add and remove roles (Admin, CategoryManager, Withdrawer)
// to specific addresses for treasury sub-accounts. Only the authority can manage roles.

use anchor_lang::prelude::*;
use crate::state::{TreasuryRoles, TreasuryRole, RoleType};
use crate::error::ErrorCode;

/// Accounts required to add a new treasury role.
#[derive(Accounts)]
pub struct AddTreasuryRole<'info> {
    /// The TreasuryRoles account (must be mutable and owned by authority)
    #[account(mut, has_one = authority)]
    pub treasury_roles: Account<'info, TreasuryRoles>,
    /// The authority allowed to manage roles
    pub authority: Signer<'info>,
}

/// Adds a new role to a given address for a treasury category.
pub fn add_treasury_role(
    ctx: Context<AddTreasuryRole>,
    role_type: RoleType,
    pubkey: Pubkey,
    withdrawal_limit: Option<u64>,
    withdrawal_period: Option<i64>,
) -> Result<()> {
    let treasury_roles = &mut ctx.accounts.treasury_roles;
    // Prevent duplicate roles for the same address and type
    require!(
        !treasury_roles.roles.iter().any(|r| r.pubkey == pubkey && r.role_type == role_type),
        ErrorCode::RoleAlreadyExists
    );
    let new_role = TreasuryRole {
        role_type,
        pubkey,
        withdrawal_limit,
        withdrawal_period,
    };
    treasury_roles.roles.push(new_role);
    Ok(())
}

/// Accounts required to remove a treasury role.
#[derive(Accounts)]
pub struct RemoveTreasuryRole<'info> {
    /// The TreasuryRoles account (must be mutable and owned by authority)
    #[account(mut, has_one = authority)]
    pub treasury_roles: Account<'info, TreasuryRoles>,
    /// The authority allowed to manage roles
    pub authority: Signer<'info>,
}

/// Removes a role from a given address for a treasury category.
pub fn remove_treasury_role(
    ctx: Context<RemoveTreasuryRole>,
    role_type: RoleType,
    pubkey: Pubkey,
) -> Result<()> {
    let treasury_roles = &mut ctx.accounts.treasury_roles;
    let original_len = treasury_roles.roles.len();
    treasury_roles.roles.retain(|r| !(r.pubkey == pubkey && r.role_type == role_type));
    require!(
        treasury_roles.roles.len() < original_len,
        ErrorCode::CustomError // Could define a specific error if needed
    );
    Ok(())
} 