use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction};
use anchor_lang::Discriminator;
use std::io::Write; // Import the Write trait
// Importer les états et l'enum d'erreur global
use crate::state::{EpochManagement, TokenProposal, UserProposalSupport, EpochStatus, ProposalStatus}; 
use crate::error::ErrorCode; // Utiliser l'enum d'erreur global

// Définition des comptes requis par l'instruction (version CPI manuelle)
#[derive(Accounts)]
#[instruction(epoch_id: u64)]
pub struct SupportProposal<'info> {
    // Le compte qui paie et signe la transaction (l'utilisateur qui supporte)
    #[account(mut)]
    pub user: Signer<'info>,

    // Le compte EpochManagement pour vérifier son statut
    #[account(
        // Contrainte : l'epoch doit être actif
        // Note : Cette contrainte suppose que l'on peut facilement charger le compte Epoch lié à la proposition.
        // Si EpochManagement n'est pas un PDA facilement dérivable ou si la vérification est plus complexe,
        // elle devra être faite dans le handler.
        constraint = epoch.status == EpochStatus::Active @ ErrorCode::EpochNotActive,
        // Contrainte : l'epoch chargé doit correspondre à celui de la proposition
        constraint = epoch.epoch_id == proposal.epoch_id @ ErrorCode::ProposalEpochMismatch
    )]
    pub epoch: Account<'info, EpochManagement>,

    // Le compte TokenProposal qui reçoit le support
    #[account(
        mut, // Mutable car on va augmenter sol_raised et recevoir des SOL
        // Contrainte : la proposition doit être active
        constraint = proposal.status == ProposalStatus::Active @ ErrorCode::ProposalNotActive
        // La contrainte `proposal.epoch_id == epoch.epoch_id` est déjà vérifiée ci-dessus
    )]
    pub proposal: Account<'info, TokenProposal>,

    /// CHECK: This account's data is manually handled and verified.
    #[account(mut, seeds = [b"support", epoch_id.to_le_bytes().as_ref(), user.key().as_ref(), proposal.key().as_ref()], bump)]
    pub user_support_info: AccountInfo<'info>,

    // Le programme système, requis pour créer des comptes (init) et transférer des SOL
    pub system_program: Program<'info, System>,
}

// Logique de l'instruction support_proposal (version CPI manuelle)
pub fn handler(ctx: Context<SupportProposal>, epoch_id: u64, amount: u64) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let user = &ctx.accounts.user;
    let user_support_info = &mut ctx.accounts.user_support_info;
    let system_program = &ctx.accounts.system_program;

    msg!("Proposal ID: {}", proposal.key());
    msg!("User: {}", user.key());
    msg!("Epoch ID: {}", epoch_id);
    msg!("Support Amount: {}", amount);

    // Bind keys to variables to avoid temporary value drop issues
    let user_key = user.key();
    let proposal_key = proposal.key();

    // Verify PDA for user_support_info
    let epoch_id_bytes = epoch_id.to_le_bytes();
    let seeds = &[
        b"support".as_ref(),
        epoch_id_bytes.as_ref(),
        user_key.as_ref(),
        proposal_key.as_ref()
    ];
    let (expected_pda, bump_seed) = Pubkey::find_program_address(seeds, ctx.program_id);

    require_keys_eq!(user_support_info.key(), expected_pda, ErrorCode::InvalidAuthority);

    // Prepare signer seeds for CPI (only needed for creation)
    let signer_seeds = &[
        b"support".as_ref(),
        epoch_id_bytes.as_ref(),
        user_key.as_ref(),
        proposal_key.as_ref(),
        &[bump_seed]
    ];

    // --- Check account status ONCE at the beginning --- 
    let account_existed_before = user_support_info.lamports() > 0 && user_support_info.owner == ctx.program_id;
    let mut user_support_data: UserProposalSupport;

    // --- Scope the deserialization / creation + initial serialization --- 
    {
        if account_existed_before {
            // Account exists, deserialize
            msg!("Account exists, deserializing data.");
            let account_info_data = user_support_info.data.borrow(); // Borrow (1) starts
            // Check discriminator
            if account_info_data.len() < UserProposalSupport::discriminator().len() || account_info_data[..UserProposalSupport::discriminator().len()] != UserProposalSupport::discriminator() {
                msg!("Account data is invalid or not initialized.");
                return err!(ErrorCode::CustomError); // Or a more specific error
            }
            let mut data_slice: &[u8] = &account_info_data;
            user_support_data = UserProposalSupport::try_deserialize(&mut data_slice)
                .map_err(|_| ErrorCode::CustomError)?;
            // Borrow (1) ends when account_info_data goes out of scope here
        } else {
            // Account does not exist, create it and serialize initial state
            msg!("Account does not exist or is not initialized. Creating...");
            let space = 8 + UserProposalSupport::INIT_SPACE; // Discriminator + data space
            let lamports_required = Rent::get()?.minimum_balance(space);

            invoke_signed(
                &system_instruction::create_account(
                    user.key,              // From
                    user_support_info.key, // To
                    lamports_required,     // Lamports
                    space as u64,          // Space
                    ctx.program_id,        // Owner
                ),
                &[
                    user.to_account_info(),
                    user_support_info.to_account_info(),
                    system_program.to_account_info(),
                ],
                &[signer_seeds],
            )?;
            msg!("Account created successfully.");

            // Initialize the new account data structure
            user_support_data = UserProposalSupport {
                user: *user.key,
                proposal: proposal.key(),
                amount: 0, // Initialize with 0, will be updated just before final serialization
                epoch_id,
            };
        }
    } // Scoped block ends, all borrows (1 or 2) from inside are released

    // --- Perform SOL Transfer --- 
    msg!("Transferring {} lamports from user to proposal...", amount);
    let transfer_instruction = system_instruction::transfer(
        user.key,
        &proposal.key(),
        amount
    );
    // Import invoke for the CPI call
    use anchor_lang::solana_program::program::invoke;
    invoke(
        &transfer_instruction,
        &[
            user.to_account_info(),
            proposal.to_account_info(),
            system_program.to_account_info(),
        ],
    )?;
    msg!("Transfer successful.");

    // --- Update proposal state --- 
    proposal.sol_raised = proposal.sol_raised.checked_add(amount).ok_or(ErrorCode::Overflow)?;
    if !account_existed_before { // Increment contributions only if it's the first time this user supports this proposal in this epoch
         proposal.total_contributions = proposal.total_contributions.checked_add(1).ok_or(ErrorCode::Overflow)?;
    }
    msg!("Proposal SOL raised: {}", proposal.sol_raised);
    msg!("Proposal total contributions: {}", proposal.total_contributions);

    // --- Update user support state (in memory) --- 
    user_support_data.amount = user_support_data.amount.checked_add(amount).ok_or(ErrorCode::Overflow)?;
    msg!("User total support for this proposal: {}", user_support_data.amount);

    // --- Serialize final user support data back to the account --- 
    let data_len = { // Read len before mutable borrow for final serialization
        let data_ref = user_support_info.data.borrow();
        data_ref.len()
    };
    let mut data = user_support_info.data.borrow_mut(); // Borrow (3) starts
    let mut cursor = std::io::Cursor::new(&mut data[..]);

    if !account_existed_before {
        // Write discriminator for new accounts
        cursor.write_all(&UserProposalSupport::discriminator())?;
    } else {
        // Skip discriminator for existing accounts
        if data_len >= 8 { 
            cursor.set_position(8);
        } else {
            msg!("Error: Account existed but data length is too short to skip discriminator.");
            return err!(ErrorCode::CustomError);
        }
    }
    // Serialize the rest of the data (without discriminator)
    user_support_data.try_serialize(&mut cursor)?;
    msg!("User support data updated successfully.");

    Ok(())
}

// L'enum local NosRugErrorCode est supprimé car nous utilisons maintenant ErrorCode de src/error.rs 