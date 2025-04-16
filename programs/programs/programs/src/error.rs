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

    #[msg("Invalid epoch ID")]
    InvalidEpochId,

    #[msg("Epoch already inactive")]
    EpochAlreadyInactive,

    #[msg("Le créateur n'est pas autorisé à effectuer cette action")]
    UnauthorizedCreator,

    #[msg("La proposition n'est pas active")]
    ProposalNotActive,
}

