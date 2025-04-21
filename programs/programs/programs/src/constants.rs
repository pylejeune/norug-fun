use anchor_lang::prelude::*;

#[constant]
pub const SEED: &str = "anchor";

// Constantes pour le scheduler d'époques
pub const EPOCH_CHECK_INTERVAL: i64 = 300; // 5 minutes en secondes
pub const MAX_EPOCHS_PER_CHECK: usize = 10; // Nombre maximum d'époques à vérifier par appel
pub const EPOCH_GRACE_PERIOD: i64 = 60; // 1 minute de grâce après la fin théorique
