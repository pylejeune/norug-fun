use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("L'allocation du créateur ne peut pas dépasser 10%")]
    CreatorAllocationTooHigh,
    
    #[msg("L'époque n'est pas active")]
    EpochNotActive,
    
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

    #[msg("La proposition n'est pas active")]
    ProposalNotActive,

    #[msg("La proposition n'appartient pas à l'époque spécifiée")]
    ProposalEpochMismatch,

    #[msg("Le montant doit être supérieur à zéro")]
    AmountMustBeGreaterThanZero,

    #[msg("Dépassement de capacité lors du calcul")]
    Overflow,
}

