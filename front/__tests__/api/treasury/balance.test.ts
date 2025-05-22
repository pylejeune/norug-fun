import { NextRequest } from 'next/server';
import { GET } from '@/app/api/treasury/balance/route';
import { 
  verifyAuthToken, 
  getAdminKeypair, 
  createAnchorWallet, 
  getProgram, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/utils';

// Mocks pour toutes les dépendances externes
jest.mock('@/lib/utils', () => ({
  verifyAuthToken: jest.fn(),
  getAdminKeypair: jest.fn(),
  createAnchorWallet: jest.fn(),
  getProgram: jest.fn(),
  createErrorResponse: jest.fn(),
  createSuccessResponse: jest.fn(),
  RPC_ENDPOINT: 'https://api.devnet.solana.com',
}));

// Mocks manuels pour @solana/web3.js pour éviter les problèmes avec les modules ESM
jest.mock('@solana/web3.js', () => {
  return {
    Connection: jest.fn(),
    PublicKey: class MockPublicKey {
      constructor(value: string) {
        // Stub constructor
      }
      static findProgramAddressSync = jest.fn().mockReturnValue([
        { toString: () => 'mock-treasury-pda' },
      ]);
      toString() {
        return 'mock-public-key';
      }
    },
  };
});

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('test-uuid'),
}));

// Déclaration de type pour TypeScript
type PublicKeyMock = {
  findProgramAddressSync: jest.Mock;
  toString: () => string;
};

// Type Connection mock
type ConnectionMock = ReturnType<typeof jest.fn>;

describe('API Treasury Balance Endpoint', () => {
  // Setup des mocks avant chaque test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock pour verifyAuthToken
    (verifyAuthToken as jest.Mock).mockReturnValue(true);
    
    // Mock pour les fonctions de keypair et wallet
    const mockKeypair = { publicKey: { toString: () => 'mock-public-key' } };
    (getAdminKeypair as jest.Mock).mockReturnValue(mockKeypair);
    (createAnchorWallet as jest.Mock).mockReturnValue({
      publicKey: 'mock-wallet-public-key',
    });
    
    // Mock pour Connection
    (jest.requireMock('@solana/web3.js').Connection as jest.Mock).mockImplementation(() => ({
      getBalance: jest.fn().mockResolvedValue(5_000_000_000), // 5 SOL
    }));
    
    // Mock pour createSuccessResponse
    (createSuccessResponse as jest.Mock).mockImplementation(
      (requestId, data) => {
        return {
          status: 200,
          body: JSON.stringify({ ...data, requestId }),
        };
      }
    );
    
    // Mock pour createErrorResponse
    (createErrorResponse as jest.Mock).mockImplementation(
      (requestId, error, status = 500) => {
        return {
          status,
          body: JSON.stringify({ error, requestId }),
        };
      }
    );
  });

  it('devrait retourner une erreur 401 lorsque l\'authentification échoue', async () => {
    // Configuration pour ce test spécifique
    (verifyAuthToken as jest.Mock).mockReturnValue(false);
    
    // Création d'une requête mockée
    const mockRequest = {
      headers: new Headers({
        'authorization': 'Bearer invalid-token',
      }),
    } as NextRequest;
    
    // Appel à la fonction à tester
    const response = await GET(mockRequest);
    
    // Vérification que createErrorResponse a été appelé avec les bons arguments
    expect(verifyAuthToken).toHaveBeenCalledWith(mockRequest);
    expect(createErrorResponse).toHaveBeenCalledWith(
      'test-uuid',
      {
        message: 'Non autorisé',
        name: 'AuthenticationError',
      },
      401
    );
    expect(response).toBeDefined();
  });

  it('devrait retourner un message d\'erreur lorsque la treasury n\'est pas initialisée', async () => {
    // Mock pour getProgram
    const mockProgram = {
      programId: 'mock-program-id',
      account: {
        treasury: {
          fetchNullable: jest.fn().mockResolvedValue(null),
        },
      },
    };
    (getProgram as jest.Mock).mockReturnValue(mockProgram);
    
    // Création d'une requête mockée
    const mockRequest = {
      headers: new Headers({
        'authorization': 'Bearer valid-token',
      }),
    } as NextRequest;
    
    // Appel à la fonction à tester
    const response = await GET(mockRequest);
    
    // Vérifications
    expect(getProgram).toHaveBeenCalled();
    expect(mockProgram.account.treasury.fetchNullable).toHaveBeenCalled();
    expect(createErrorResponse).toHaveBeenCalledWith(
      'test-uuid',
      {
        message: 'La treasury n\'est pas initialisée.',
      },
      404
    );
  });

  it('devrait retourner les balances de la treasury avec succès', async () => {
    // Mock pour getProgram avec des données de treasury
    const mockTreasuryAccount = {
      authority: {
        toString: () => 'mock-authority',
      },
      marketing: {
        solBalance: {
          toNumber: () => 1_000_000_000, // 1 SOL
        },
      },
      team: {
        solBalance: {
          toNumber: () => 1_000_000_000, // 1 SOL
        },
      },
      operations: {
        solBalance: {
          toNumber: () => 1_000_000_000, // 1 SOL
        },
      },
      investments: {
        solBalance: {
          toNumber: () => 1_000_000_000, // 1 SOL
        },
      },
      crank: {
        solBalance: {
          toNumber: () => 1_000_000_000, // 1 SOL
        },
      },
    };
    
    const mockProgram = {
      programId: 'mock-program-id',
      account: {
        treasury: {
          fetchNullable: jest.fn().mockResolvedValue(mockTreasuryAccount),
        },
      },
    };
    (getProgram as jest.Mock).mockReturnValue(mockProgram);
    
    // Création d'une requête mockée
    const mockRequest = {
      headers: new Headers({
        'authorization': 'Bearer valid-token',
      }),
    } as NextRequest;
    
    // Appel à la fonction à tester
    const response = await GET(mockRequest);
    
    // Vérifications
    expect(getProgram).toHaveBeenCalled();
    expect(mockProgram.account.treasury.fetchNullable).toHaveBeenCalled();
    expect(createSuccessResponse).toHaveBeenCalledWith(
      'test-uuid',
      expect.objectContaining({
        message: 'Treasury existante et accessible',
        treasuryPdaBalance: 5, // 5 SOL car le mock de getBalance renvoie 5_000_000_000
        subAccounts: {
          marketing: 1,
          team: 1,
          operations: 1,
          investments: 1,
          crank: 1,
          total: 5,
        },
        address: 'mock-treasury-pda',
        authority: 'mock-authority',
      })
    );
  });

  it('devrait gérer le cas où un format alternatif de solde est utilisé', async () => {
    // Mock pour getProgram avec format alternatif de données de treasury (sol_balance au lieu de solBalance)
    const mockTreasuryAccount = {
      authority: {
        toString: () => 'mock-authority',
      },
      marketing: {
        sol_balance: 1_000_000_000, // 1 SOL
      },
      team: {
        sol_balance: 1_000_000_000, // 1 SOL
      },
      operations: {
        sol_balance: 1_000_000_000, // 1 SOL
      },
      investments: {
        sol_balance: 1_000_000_000, // 1 SOL
      },
      crank: {
        sol_balance: 1_000_000_000, // 1 SOL
      },
    };
    
    const mockProgram = {
      programId: 'mock-program-id',
      account: {
        treasury: {
          fetchNullable: jest.fn().mockResolvedValue(mockTreasuryAccount),
        },
      },
    };
    (getProgram as jest.Mock).mockReturnValue(mockProgram);
    
    // Création d'une requête mockée
    const mockRequest = {
      headers: new Headers({
        'authorization': 'Bearer valid-token',
      }),
    } as NextRequest;
    
    // Appel à la fonction à tester
    const response = await GET(mockRequest);
    
    // Vérifications
    expect(createSuccessResponse).toHaveBeenCalledWith(
      'test-uuid',
      expect.objectContaining({
        subAccounts: {
          marketing: 1,
          team: 1,
          operations: 1,
          investments: 1,
          crank: 1,
          total: 5,
        },
      })
    );
  });

  it('devrait gérer les erreurs génériques et les retourner', async () => {
    // Simuler une erreur lors de la récupération du programme
    const testError = new Error('Test error');
    (getProgram as jest.Mock).mockImplementation(() => {
      throw testError;
    });
    
    // Création d'une requête mockée
    const mockRequest = {
      headers: new Headers({
        'authorization': 'Bearer valid-token',
      }),
    } as NextRequest;
    
    // Appel à la fonction à tester
    const response = await GET(mockRequest);
    
    // Vérifications
    expect(createErrorResponse).toHaveBeenCalledWith(
      'test-uuid',
      testError
    );
  });
}); 