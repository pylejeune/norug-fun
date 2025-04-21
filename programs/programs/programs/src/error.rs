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

    // --- Nouveaux codes pour update_proposal_status --- 
    #[msg("L'époque doit être fermée pour mettre à jour le statut de la proposition")]
    EpochNotClosed,

    #[msg("La proposition n'appartient pas à l'époque fournie")]
    ProposalNotInEpoch,

    #[msg("Le signataire n'est pas l'autorité autorisée")]
    InvalidAuthority,

    #[msg("Mise à jour du statut de la proposition invalide")]
    InvalidProposalStatusUpdate,

    #[msg("La proposition a déjà un statut final (Validée ou Rejetée)")]
    ProposalAlreadyFinalized,
    
    // --- Nouveaux codes pour le scheduler ---
    #[msg("Autorité de la tâche planifiée invalide")]
    InvalidTaskAuthority,
}

