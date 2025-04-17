/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/programs.json`.
 */
export type Programs = {
  "address": "4ExYLppEEnLNgcV7xRwJKAKnCBSDpdF9DpphxS63kHJs",
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
      "name": "creatorAllocationTooHigh",
      "msg": "L'allocation du créateur ne peut pas dépasser 10%"
    },
    {
      "code": 6001,
      "name": "epochNotActive",
      "msg": "L'époque n'est pas active"
    },
    {
      "code": 6002,
      "name": "invalidEpochTimeRange",
      "msg": "La plage de temps de l'époque est invalide"
    },
    {
      "code": 6003,
      "name": "epochNotFound",
      "msg": "L'époque n'a pas été trouvée"
    },
    {
      "code": 6004,
      "name": "customError",
      "msg": "Erreur personnalisée"
    },
    {
      "code": 6005,
      "name": "invalidEpochId",
      "msg": "Invalid epoch ID"
    },
    {
      "code": 6006,
      "name": "epochAlreadyInactive",
      "msg": "Epoch already inactive"
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
