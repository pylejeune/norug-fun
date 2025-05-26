use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Generic error")]
    GenericError,
    #[msg("The epoch ID does not match")]
    EpochMismatch,
    #[msg("The token name is too long")]
    TokenNameTooLong,
    #[msg("The token symbol is too long")]
    TokenSymbolTooLong,
    #[msg("Creator allocation cannot exceed 10%")]
    CreatorAllocationTooHigh,
    #[msg("Lockup period cannot be negative")]
    NegativeLockupPeriod,
    #[msg("Proposal is not active and cannot be supported")]
    ProposalNotActive,
    #[msg("Epoch is not active")]
    EpochNotActive,
    #[msg("Epoch has not ended yet")]
    EpochNotEnded,
    #[msg("Only the admin authority can perform this action")]
    InvalidAuthority,

    #[msg("Invalid epoch time range.")]
    InvalidEpochTimeRange,
    
    #[msg("L'époque n'a pas été trouvée")]
    EpochNotFound,
    
    #[msg("Erreur personnalisée")]
    CustomError,

    #[msg("ID d'époque invalide")]
    InvalidEpochId,

    #[msg("Epoch is already inactive.")]
    EpochAlreadyInactive,

    #[msg("La proposition n'appartient pas à l'époque spécifiée")]
    ProposalEpochMismatch,

    #[msg("Le montant doit être supérieur à zéro")]
    AmountMustBeGreaterThanZero,

    #[msg("Dépassement de capacité lors du calcul")]
    Overflow,

    // --- Codes pour update_proposal_status & mark_epoch_processed --- 
    #[msg("Epoch must be closed to perform this action.")]
    EpochNotClosed,

    #[msg("La proposition n'appartient pas à l'époque fournie")]
    ProposalNotInEpoch,

    #[msg("Mise à jour du statut de la proposition invalide")]
    InvalidProposalStatusUpdate,

    #[msg("La proposition a déjà un statut final (Validée ou Rejetée)")]
    ProposalAlreadyFinalized,

    #[msg("Epoch has already been processed.")]
    EpochAlreadyProcessed,

    #[msg("Unauthorized: Only the admin can perform this action.")]
    Unauthorized,

    // --- Codes pour reclaim_support ---
    #[msg("La proposition doit être rejetée pour pouvoir réclamer les fonds.")]
    ProposalNotRejected,
    
    #[msg("Le compte de support ne correspond pas à la proposition fournie.")]
    ProposalMismatch,

    #[msg("Il n'y a aucun montant à réclamer dans ce compte de support.")]
    NothingToReclaim,

    #[msg("Insufficient funds in the proposal account to make the refund.")]
    InsufficientProposalFunds,

    #[msg("Could not retrieve bump seed.")]
    CouldNotRetrieveBump,

    #[msg("Ce rôle existe déjà pour ce wallet.")]
    RoleAlreadyExists,

    #[msg("The maximum number of roles has been reached.")]
    RolesCapacityExceeded,

    #[msg("A calculation resulted in an overflow.")]
    CalculationOverflow,

    #[msg("The support amount is insufficient to cover fees.")]
    AmountTooLowToCoverFees,

    #[msg("The calculated fee amount cannot be zero.")]
    FeeCannotBeZero,

    #[msg("Epoch has not yet been marked as processed by the crank.")]
    EpochNotProcessedYet,
}

