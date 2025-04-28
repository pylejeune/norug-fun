/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/programs.json`.
 */
export type Programs = {
  "address": "3HBzNutk8DrRfffCS74S55adJAjgY8NHrWXgRtABaSbF",
  "metadata": {
    "name": "programs",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createProposal",
      "discriminator": [
        132,
        116,
        68,
        174,
        216,
        160,
        198,
        22
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "epoch.epoch_id",
                "account": "epochManagement"
              },
              {
                "kind": "arg",
                "path": "tokenName"
              }
            ]
          }
        },
        {
          "name": "epoch"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "tokenName",
          "type": "string"
        },
        {
          "name": "tokenSymbol",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "imageUrl",
          "type": {
            "option": "string"
          }
        },
        {
          "name": "totalSupply",
          "type": "u64"
        },
        {
          "name": "creatorAllocation",
          "type": "u8"
        },
        {
          "name": "lockupPeriod",
          "type": "i64"
        }
      ]
    },
    {
      "name": "endEpoch",
      "discriminator": [
        195,
        166,
        17,
        226,
        105,
        210,
        96,
        216
      ],
      "accounts": [
        {
          "name": "epochManagement",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  112,
                  111,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "epochId"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "epochId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "getEpochState",
      "discriminator": [
        143,
        2,
        34,
        250,
        77,
        45,
        31,
        154
      ],
      "accounts": [
        {
          "name": "epochManagement"
        }
      ],
      "args": [
        {
          "name": "epochId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "getProposalDetails",
      "discriminator": [
        236,
        135,
        27,
        97,
        207,
        192,
        173,
        128
      ],
      "accounts": [
        {
          "name": "proposal",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "proposalId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [],
      "args": []
    },
    {
      "name": "initializeProgramConfig",
      "discriminator": [
        6,
        131,
        61,
        237,
        40,
        110,
        83,
        124
      ],
      "accounts": [
        {
          "name": "programConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "adminAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "markEpochProcessed",
      "discriminator": [
        210,
        48,
        251,
        209,
        224,
        55,
        71,
        59
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "programConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "epochManagement",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "startEpoch",
      "discriminator": [
        204,
        248,
        232,
        82,
        251,
        45,
        164,
        113
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "epochManagement",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  112,
                  111,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "epochId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "epochId",
          "type": "u64"
        },
        {
          "name": "startTime",
          "type": "i64"
        },
        {
          "name": "endTime",
          "type": "i64"
        }
      ]
    },
    {
      "name": "supportProposal",
      "discriminator": [
        95,
        239,
        233,
        199,
        201,
        62,
        90,
        27
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "epoch"
        },
        {
          "name": "proposal",
          "writable": true
        },
        {
          "name": "userSupport",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  112,
                  112,
                  111,
                  114,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "proposal.epoch_id",
                "account": "tokenProposal"
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "proposal"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateProposalStatus",
      "discriminator": [
        9,
        171,
        178,
        233,
        228,
        50,
        167,
        206
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "programConfig"
        },
        {
          "name": "epochManagement"
        },
        {
          "name": "proposal",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "newStatus",
          "type": {
            "defined": {
              "name": "proposalStatus"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "epochManagement",
      "discriminator": [
        182,
        45,
        141,
        215,
        61,
        70,
        49,
        206
      ]
    },
    {
      "name": "programConfig",
      "discriminator": [
        196,
        210,
        90,
        231,
        144,
        149,
        140,
        63
      ]
    },
    {
      "name": "tokenProposal",
      "discriminator": [
        192,
        42,
        4,
        79,
        215,
        17,
        144,
        39
      ]
    },
    {
      "name": "userProposalSupport",
      "discriminator": [
        255,
        187,
        213,
        25,
        93,
        16,
        197,
        155
      ]
    }
  ],
  "events": [
    {
      "name": "epochEnded",
      "discriminator": [
        111,
        40,
        102,
        241,
        173,
        233,
        164,
        252
      ]
    },
    {
      "name": "proposalDetailsRetrieved",
      "discriminator": [
        81,
        200,
        254,
        55,
        73,
        7,
        79,
        217
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "genericError",
      "msg": "Generic error"
    },
    {
      "code": 6001,
      "name": "epochMismatch",
      "msg": "The epoch ID does not match"
    },
    {
      "code": 6002,
      "name": "tokenNameTooLong",
      "msg": "The token name is too long"
    },
    {
      "code": 6003,
      "name": "tokenSymbolTooLong",
      "msg": "The token symbol is too long"
    },
    {
      "code": 6004,
      "name": "creatorAllocationTooHigh",
      "msg": "Creator allocation cannot exceed 10%"
    },
    {
      "code": 6005,
      "name": "negativeLockupPeriod",
      "msg": "Lockup period cannot be negative"
    },
    {
      "code": 6006,
      "name": "proposalNotActive",
      "msg": "Proposal is not active and cannot be supported"
    },
    {
      "code": 6007,
      "name": "epochNotActive",
      "msg": "Epoch is not active"
    },
    {
      "code": 6008,
      "name": "epochNotEnded",
      "msg": "Epoch has not ended yet"
    },
    {
      "code": 6009,
      "name": "invalidAuthority",
      "msg": "Only the admin authority can perform this action"
    },
    {
      "code": 6010,
      "name": "invalidEpochTimeRange",
      "msg": "La plage de temps de l'époque est invalide"
    },
    {
      "code": 6011,
      "name": "epochNotFound",
      "msg": "L'époque n'a pas été trouvée"
    },
    {
      "code": 6012,
      "name": "customError",
      "msg": "Erreur personnalisée"
    },
    {
      "code": 6013,
      "name": "invalidEpochId",
      "msg": "ID d'époque invalide"
    },
    {
      "code": 6014,
      "name": "epochAlreadyInactive",
      "msg": "L'époque est déjà inactive"
    },
    {
      "code": 6015,
      "name": "proposalEpochMismatch",
      "msg": "La proposition n'appartient pas à l'époque spécifiée"
    },
    {
      "code": 6016,
      "name": "amountMustBeGreaterThanZero",
      "msg": "Le montant doit être supérieur à zéro"
    },
    {
      "code": 6017,
      "name": "overflow",
      "msg": "Dépassement de capacité lors du calcul"
    },
    {
      "code": 6018,
      "name": "epochNotClosed",
      "msg": "L'époque doit être fermée pour mettre à jour le statut de la proposition"
    },
    {
      "code": 6019,
      "name": "proposalNotInEpoch",
      "msg": "La proposition n'appartient pas à l'époque fournie"
    },
    {
      "code": 6020,
      "name": "invalidProposalStatusUpdate",
      "msg": "Mise à jour du statut de la proposition invalide"
    },
    {
      "code": 6021,
      "name": "proposalAlreadyFinalized",
      "msg": "La proposition a déjà un statut final (Validée ou Rejetée)"
    },
    {
      "code": 6022,
      "name": "epochAlreadyProcessed",
      "msg": "L'époque a déjà été marquée comme traitée par le crank"
    },
    {
      "code": 6023,
      "name": "unauthorized",
      "msg": "Unauthorized: Only the admin can perform this action."
    }
  ],
  "types": [
    {
      "name": "epochEnded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "epochId",
            "type": "u64"
          },
          {
            "name": "endedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "epochManagement",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "epochId",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "epochStatus"
              }
            }
          },
          {
            "name": "processed",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "epochStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "pending"
          },
          {
            "name": "closed"
          }
        ]
      }
    },
    {
      "name": "programConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "adminAuthority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "proposalDetailsRetrieved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "epochId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "tokenName",
            "type": "string"
          },
          {
            "name": "tokenSymbol",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "imageUrl",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "totalSupply",
            "type": "u64"
          },
          {
            "name": "creatorAllocation",
            "type": "u8"
          },
          {
            "name": "supporterAllocation",
            "type": "u8"
          },
          {
            "name": "solRaised",
            "type": "u64"
          },
          {
            "name": "totalContributions",
            "type": "u64"
          },
          {
            "name": "lockupPeriod",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "proposalStatus"
              }
            }
          }
        ]
      }
    },
    {
      "name": "proposalStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "validated"
          },
          {
            "name": "rejected"
          }
        ]
      }
    },
    {
      "name": "tokenProposal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "epochId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "tokenName",
            "type": "string"
          },
          {
            "name": "tokenSymbol",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "imageUrl",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "totalSupply",
            "type": "u64"
          },
          {
            "name": "creatorAllocation",
            "type": "u8"
          },
          {
            "name": "supporterAllocation",
            "type": "u8"
          },
          {
            "name": "solRaised",
            "type": "u64"
          },
          {
            "name": "totalContributions",
            "type": "u64"
          },
          {
            "name": "lockupPeriod",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "proposalStatus"
              }
            }
          }
        ]
      }
    },
    {
      "name": "userProposalSupport",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "epochId",
            "type": "u64"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "proposal",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "seed",
      "type": "string",
      "value": "\"anchor\""
    }
  ]
};
