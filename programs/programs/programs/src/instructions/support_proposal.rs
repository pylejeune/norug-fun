use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction};
use anchor_lang::Discriminator;
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

    // Prepare signer seeds for CPI
    let signer_seeds = &[
        b"support".as_ref(),
        epoch_id_bytes.as_ref(),
        user_key.as_ref(),
        proposal_key.as_ref(),
        &[bump_seed]
    ];

    // Check if user_support_info account exists and has data
    let account_info_data = user_support_info.data.borrow();
    let mut user_support_data: UserProposalSupport;

    // Check if account is initialized (has lamports and owner is the program)
    if user_support_info.lamports() > 0 && user_support_info.owner == ctx.program_id {
        // Account exists, attempt to deserialize
        msg!("Account exists, deserializing data.");
        // Check if data is empty or not initialized correctly (discriminator check)
        if account_info_data.len() < UserProposalSupport::discriminator().len() || account_info_data[..UserProposalSupport::discriminator().len()] != UserProposalSupport::discriminator() {
            msg!("Account data is invalid or not initialized.");
            return err!(ErrorCode::CustomError); // Or a more specific error
        }
        let mut data_slice: &[u8] = &account_info_data;
        user_support_data = UserProposalSupport::try_deserialize(&mut data_slice)
            .map_err(|_| ErrorCode::CustomError)?; // Use existing ErrorCode::CustomError
    } else {
        // Account does not exist or is not owned by the program, create it
        msg!("Account does not exist or is not initialized. Creating...");
        let space = 8 + UserProposalSupport::INIT_SPACE; // Discriminator + data space
        let lamports_required = Rent::get()?.minimum_balance(space);

        invoke_signed(
            &system_instruction::create_account(
                user.key,                           // From
                user_support_info.key,              // To
                lamports_required,                  // Lamports
                space as u64,                       // Space
                ctx.program_id,                     // Owner
            ),
            &[
                user.to_account_info(),
                user_support_info.to_account_info(),
                system_program.to_account_info(),
            ],
            &[signer_seeds],
        )?;
        msg!("Account created successfully.");

        // Initialize the new account data
        user_support_data = UserProposalSupport {
            user: *user.key,
            proposal: proposal.key(),
            amount: 0, // Initialize with 0, will be updated later
            epoch_id,
        };

        // Need to re-borrow data mutably after potential creation
        drop(account_info_data); // Drop the previous immutable borrow
        let mut data = user_support_info.data.borrow_mut();
        // Pass a mutable slice directly to Cursor::new
        let mut cursor = std::io::Cursor::new(&mut data[..]);
        user_support_data.try_serialize(&mut cursor)?;
        // Account data is now initialized
    }

    // If we reach here, the account exists and user_support_data holds its state (either loaded or newly initialized)

    // Transfer SOL from user to proposal
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

    // Update proposal state
    proposal.sol_raised = proposal.sol_raised.checked_add(amount).ok_or(ErrorCode::Overflow)?;
    proposal.total_contributions = proposal.total_contributions.checked_add(1).ok_or(ErrorCode::Overflow)?;
    msg!("Proposal SOL raised: {}", proposal.sol_raised);
    msg!("Proposal total contributions: {}", proposal.total_contributions);

    // Update user support state
    user_support_data.amount = user_support_data.amount.checked_add(amount).ok_or(ErrorCode::Overflow)?;
    msg!("User total support for this proposal: {}", user_support_data.amount);

    // Serialize updated user support data back to the account
    // Need mutable borrow again if account was just created
    let data_len = { // Read len before mutable borrow
        let data_ref = user_support_info.data.borrow();
        data_ref.len()
    };
    let mut data = user_support_info.data.borrow_mut(); // This re-borrows if needed
    // Pass a mutable slice directly to Cursor::new
    let mut cursor = std::io::Cursor::new(&mut data[..]);
    // Skip the discriminator bytes if account existed
    // Use the pre-read length here
    if user_support_info.lamports() > 0 && user_support_info.owner == ctx.program_id && data_len >= 8 {
        cursor.set_position(8);
    }
    user_support_data.try_serialize(&mut cursor)?;
    msg!("User support data updated successfully.");

    Ok(())
}

// L'enum local NosRugErrorCode est supprimé car nous utilisons maintenant ErrorCode de src/error.rs 