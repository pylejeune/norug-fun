// Instructions de gestion des rôles et administrateurs
pub mod manage_treasury_role;
pub use manage_treasury_role::*;

// Autres instructions principales
pub mod create_token_proposal;
pub mod end_epoch;
pub mod initialize;
pub mod initialize_program_config;
pub mod initialize_treasury;     // Notre nouvelle instruction
pub mod mark_epoch_processed;
pub mod reclaim_support;
pub mod start_epoch;
pub mod support_proposal;
pub mod update_proposal_status;
// NOTE: initialize_epoch, update_program_config n'existent pas en tant que fichiers séparés actuellement.

pub use create_token_proposal::*;
pub use end_epoch::*;
pub use initialize::*;
pub use initialize_program_config::*;
pub use initialize_treasury::*;
pub use mark_epoch_processed::*;
pub use reclaim_support::*;
pub use start_epoch::*;
pub use support_proposal::*;
pub use update_proposal_status::*;
