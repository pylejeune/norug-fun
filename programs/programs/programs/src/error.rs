use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("L'allocation du créateur ne peut pas dépasser 10%")]
    CreatorAllocationTooHigh,
    
    #[msg("L'époque n'est pas active")]
    EpochNotActive,
    
    #[msg("La plage de temps de l'époque est invalide")]
    InvalidEpochTimeRange,
    
    #[msg("Erreur personnalisée")]
    CustomError,
}
