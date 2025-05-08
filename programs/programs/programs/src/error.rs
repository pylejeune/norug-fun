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

    #[msg("La plage de temps de l'époque est invalide")]
    InvalidEpochTimeRange,
    
    #[msg("L'époque n'a pas été trouvée")]
    EpochNotFound,
    
    #[msg("Erreur personnalisée")]
    CustomError,

    #[msg("ID d'époque invalide")]
    InvalidEpochId,

    #[msg("L'époque est déjà inactive")]
    EpochAlreadyInactive,

    #[msg("La proposition n'appartient pas à l'époque spécifiée")]
    ProposalEpochMismatch,

    #[msg("Le montant doit être supérieur à zéro")]
    AmountMustBeGreaterThanZero,

    #[msg("Dépassement de capacité lors du calcul")]
    Overflow,

    // --- Codes pour update_proposal_status & mark_epoch_processed --- 
    #[msg("L'époque doit être fermée pour mettre à jour le statut de la proposition")]
    EpochNotClosed,

    #[msg("La proposition n'appartient pas à l'époque fournie")]
    ProposalNotInEpoch,

    #[msg("Mise à jour du statut de la proposition invalide")]
    InvalidProposalStatusUpdate,

    #[msg("La proposition a déjà un statut final (Validée ou Rejetée)")]
    ProposalAlreadyFinalized,

    #[msg("L'époque a déjà été marquée comme traitée par le crank")]
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

    #[msg("Fonds insuffisants dans le compte de la proposition pour effectuer le remboursement.")]
    InsufficientProposalFunds,

    #[msg("L'époque n'a pas encore été marquée comme traitée par le crank.")]
    EpochNotProcessedYet,

    #[msg("Could not retrieve bump seed.")]
    CouldNotRetrieveBump,
}

