import { randomUUID } from "crypto";

export async function createScenario() {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🚀 Démarrage de la création du scénario...`);

  const results = {
    epochs: [] as any[],
    proposals: [] as any[],
  };

  try {
    // Récupérer le token d'authentification depuis les variables d'environnement
    const authToken = process.env.API_SECRET_KEY;
    if (!authToken) {
      throw new Error(
        "API_SECRET_KEY non défini dans les variables d'environnement"
      );
    }
    console.log(`[${requestId}] 🔑 Token d'authentification récupéré`);

    // Créer 10 époques
    for (let i = 0; i < 10; i++) {
      console.log(
        `\n[${requestId}] 📅 ====== Création de l'époque ${i + 1}/10 ======`
      );

      // Appel à l'endpoint de création d'époque
      console.log(
        `[${requestId}] 📤 Envoi de la requête de création d'époque...`
      );
      const epochResponse = await fetch(
        "http://localhost:3000/api/epoch/create",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!epochResponse.ok) {
        throw new Error(
          `Erreur lors de la création de l'époque ${i + 1}: ${epochResponse.statusText}`
        );
      }

      const epochResult = await epochResponse.json();
      console.log(`[${requestId}] 📥 Réponse reçue pour l'époque ${i + 1}:`, {
        success: epochResult.success,
        epochId: epochResult.epoch?.id,
        message: epochResult.message,
      });

      results.epochs.push(epochResult);

      // Vérifier si l'époque a été créée avec succès
      if (!epochResult.success || !epochResult.epoch?.id) {
        throw new Error(`L'époque ${i + 1} n'a pas été créée avec succès`);
      }

      // Créer 15 propositions pour chaque époque
      console.log(
        `[${requestId}] 📝 Création des propositions pour l'époque ${i + 1}...`
      );
      for (let j = 0; j < 15; j++) {
        console.log(
          `[${requestId}] 📤 Création de la proposition ${j + 1}/15...`
        );

        // Appel à l'endpoint de création de proposition
        const proposalResponse = await fetch(
          "http://localhost:3000/api/proposal/create",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              tokenName: `Token-${i}-${j}`,
              tokenSymbol: `T${i}${j}`,
              description: `Description pour la proposition ${j + 1} de l'époque ${i + 1}`,
              totalSupply: 1000000,
              creatorAllocation: 5,
              lockupPeriod: 86400,
              imageUrl: null,
              epochId: epochResult.epoch.id,
            }),
          }
        );

        if (!proposalResponse.ok) {
          throw new Error(
            `Erreur lors de la création de la proposition ${j + 1} pour l'époque ${i + 1}: ${proposalResponse.statusText}`
          );
        }

        const proposalResult = await proposalResponse.json();
        console.log(
          `[${requestId}] 📥 Proposition ${j + 1} créée avec succès:`,
          {
            success: proposalResult.success,
            tokenName: proposalResult.proposal?.tokenName,
            tokenSymbol: proposalResult.proposal?.tokenSymbol,
          }
        );

        results.proposals.push(proposalResult);
      }
      console.log(`[${requestId}] ✅ Époque ${i + 1} terminée avec succès\n`);
    }

    console.log(`[${requestId}] 🎉 Scénario créé avec succès!`);
    console.log(`[${requestId}] 📊 Résumé:`, {
      epochsCreated: results.epochs.length,
      proposalsCreated: results.proposals.length,
    });

    return {
      success: true,
      message: "Scénario créé avec succès",
      results,
    };
  } catch (error) {
    console.error(
      `[${requestId}] ❌ Erreur lors de la création du scénario:`,
      error
    );
    throw error;
  }
}
