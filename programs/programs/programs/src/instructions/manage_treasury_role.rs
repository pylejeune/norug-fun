// Treasury role management instructions for the norug.fun protocol
// This file provides Anchor instructions to add, remove, and update roles (Admin, CategoryManager, Withdrawer)
// to specific addresses for treasury sub-accounts. Only an admin (present in authorities) can manage roles and admins.

use anchor_lang::prelude::*;
use crate::state::{TreasuryRoles, TreasuryRole, RoleType};
use crate::error::ErrorCode;

/// Only an admin (present in authorities) of the TreasuryRoles account can call this instruction.
#[derive(Accounts)]
pub struct AddTreasuryRole<'info> {
    /// The TreasuryRoles account (must be mutable)
    #[account(mut)]
    pub treasury_roles: Account<'info, TreasuryRoles>,
    /// The admin authority (must be present in authorities)
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
    // Check that the signer is an admin
    require!(
        treasury_roles.authorities.contains(ctx.accounts.authority.key),
        ErrorCode::Unauthorized
    );
    // Prevent duplicate roles for the same address and type
    require!(
        !treasury_roles.roles.iter().any(|r| r.pubkey == pubkey && r.role_type == role_type),
        ErrorCode::RoleAlreadyExists
    );
    // Check if the maximum number of roles has been reached
    require!(
        treasury_roles.roles.len() < 5, // Max 5 roles
        ErrorCode::RolesCapacityExceeded
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

/// Only an admin (present in authorities) of the TreasuryRoles account can call this instruction.
#[derive(Accounts)]
pub struct RemoveTreasuryRole<'info> {
    /// The TreasuryRoles account (must be mutable)
    #[account(mut)]
    pub treasury_roles: Account<'info, TreasuryRoles>,
    /// The admin authority (must be present in authorities)
    pub authority: Signer<'info>,
}

/// Removes a role from a given address for a treasury category.
pub fn remove_treasury_role(
    ctx: Context<RemoveTreasuryRole>,
    role_type: RoleType,
    pubkey: Pubkey,
) -> Result<()> {
    let treasury_roles = &mut ctx.accounts.treasury_roles;
    // Check that the signer is an admin
    require!(
        treasury_roles.authorities.contains(ctx.accounts.authority.key),
        ErrorCode::Unauthorized
    );
    // Retain roles that do not match the one to be removed.
    // This makes the operation idempotent: if the role doesn't exist, the vector remains unchanged.
    treasury_roles.roles.retain(|r| !(r.pubkey == pubkey && r.role_type == role_type));
    Ok(())
}

/// Only an admin (present in authorities) of the TreasuryRoles account can call this instruction.
#[derive(Accounts)]
pub struct UpdateTreasuryRole<'info> {
    /// The TreasuryRoles account (must be mutable)
    #[account(mut)]
    pub treasury_roles: Account<'info, TreasuryRoles>,
    /// The admin authority (must be present in authorities)
    pub authority: Signer<'info>,
}

/// Updates the withdrawal limit and/or period for a given role.
pub fn update_treasury_role(
    ctx: Context<UpdateTreasuryRole>,
    role_type: RoleType,
    pubkey: Pubkey,
    withdrawal_limit: Option<u64>,
    withdrawal_period: Option<i64>,
) -> Result<()> {
    let treasury_roles = &mut ctx.accounts.treasury_roles;
    // Check that the signer is an admin
    require!(
        treasury_roles.authorities.contains(ctx.accounts.authority.key),
        ErrorCode::Unauthorized
    );
    let role = treasury_roles
        .roles
        .iter_mut()
        .find(|r| r.pubkey == pubkey && r.role_type == role_type)
        .ok_or(ErrorCode::CustomError)?; // Could define a specific error if needed
    role.withdrawal_limit = withdrawal_limit;
    role.withdrawal_period = withdrawal_period;
    Ok(())
}

/// Only an admin (present in authorities) of the TreasuryRoles account can call this instruction.
#[derive(Accounts)]
pub struct AddAdmin<'info> {
    #[account(mut)]
    pub treasury_roles: Account<'info, TreasuryRoles>,
    pub authority: Signer<'info>,
}

/// Adds a new admin to the authorities list (max 3 admins).
pub fn add_admin(
    ctx: Context<AddAdmin>,
    new_admin: Pubkey,
) -> Result<()> {
    let treasury_roles = &mut ctx.accounts.treasury_roles;
    // Check that the signer is an admin
    require!(
        treasury_roles.authorities.contains(ctx.accounts.authority.key),
        ErrorCode::Unauthorized
    );
    // Prevent duplicates
    require!(
        !treasury_roles.authorities.contains(&new_admin),
        ErrorCode::RoleAlreadyExists // Could define a specific error if needed
    );
    // Max 3 admins
    require!(
        treasury_roles.authorities.len() < 3,
        ErrorCode::CustomError // Could define a specific error if needed
    );
    treasury_roles.authorities.push(new_admin);
    Ok(())
}

/// Only an admin (present in authorities) of the TreasuryRoles account can call this instruction.
#[derive(Accounts)]
pub struct RemoveAdmin<'info> {
    #[account(mut)]
    pub treasury_roles: Account<'info, TreasuryRoles>,
    pub authority: Signer<'info>,
}

/// Removes an admin from the authorities list (must always have at least 1 admin).
pub fn remove_admin(
    ctx: Context<RemoveAdmin>,
    admin_to_remove: Pubkey,
) -> Result<()> {
    let treasury_roles = &mut ctx.accounts.treasury_roles;
    // Check that the signer is an admin
    require!(
        treasury_roles.authorities.contains(ctx.accounts.authority.key),
        ErrorCode::Unauthorized
    );
    // Must always have at least 1 admin
    require!(
        treasury_roles.authorities.len() > 1,
        ErrorCode::CustomError // Could define a specific error if needed
    );
    let original_len = treasury_roles.authorities.len();
    treasury_roles.authorities.retain(|a| *a != admin_to_remove);
    require!(
        treasury_roles.authorities.len() < original_len,
        ErrorCode::CustomError // Could define a specific error if needed
    );
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeTreasuryRoles<'info> {
    #[account(init, payer = payer, space = 8 + 32 * 3 + 4 + (32 + 1 + 8 + 8 + 1) * 16, seeds = [b"treasury_roles"], bump)]
    pub treasury_roles: Account<'info, TreasuryRoles>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_treasury_roles(
    ctx: Context<InitializeTreasuryRoles>,
    authorities: Vec<Pubkey>,
) -> Result<()> {
    require!(authorities.len() >= 1 && authorities.len() <= 3, ErrorCode::CustomError);
    let treasury_roles = &mut ctx.accounts.treasury_roles;
    treasury_roles.authorities = authorities;
    treasury_roles.roles = Vec::new();
    Ok(())
} 