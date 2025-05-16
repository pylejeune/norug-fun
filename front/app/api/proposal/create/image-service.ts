import lighthouse from '@lighthouse-web3/sdk';
import { createReadStream } from 'fs';
import { writeFile } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { generateRandomImageUrl } from '../../../../lib/utils';

// Clé API Lighthouse stockée dans les variables d'environnement
const LIGHTHOUSE_API_KEY = process.env.LIGHTHOUSE_API_KEY || process.env.NEXT_PUBLIC_LIGHTHOUSE_KEY;

if (!LIGHTHOUSE_API_KEY) {
  console.warn("⚠️ LIGHTHOUSE_API_KEY n'est pas défini dans les variables d'environnement");
}

/**
 * Télécharge une image depuis une URL
 */
async function downloadImage(url: string): Promise<Buffer> {
  try {
    console.log(`🔍 Téléchargement de l'image depuis ${url}...`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("❌ Erreur lors du téléchargement de l'image:", error);
    throw new Error(`Erreur lors du téléchargement de l'image: ${error}`);
  }
}

/**
 * Génère un nom de fichier unique pour l'image
 */
function generateUniqueImageName(): string {
  return `token_image_${randomUUID()}.jpg`;
}

/**
 * Télécharge une image aléatoire et l'upload sur IPFS
 * @param maxRetries Nombre maximal de tentatives en cas d'échec
 */
export async function generateAndUploadRandomImage(maxRetries = 3): Promise<string> {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    attempts++;
    
    try {
      if (!LIGHTHOUSE_API_KEY) {
        throw new Error("LIGHTHOUSE_API_KEY n'est pas défini");
      }
      
      // Générer une URL d'image aléatoire
      const imageUrl = generateRandomImageUrl();
      console.log(`🖼️ [Tentative ${attempts}/${maxRetries}] Image aléatoire générée: ${imageUrl}`);
      
      // Télécharger l'image
      const imageBuffer = await downloadImage(imageUrl);
      console.log(`✅ Image téléchargée avec succès (${imageBuffer.length} octets)`);
      
      // Enregistrer temporairement le fichier
      const tempDir = os.tmpdir();
      const fileName = generateUniqueImageName();
      const filePath = path.join(tempDir, fileName);
      
      await writeFile(filePath, imageBuffer);
      console.log(`📁 Image temporairement sauvegardée: ${filePath}`);
      
      // Upload sur IPFS via Lighthouse
      console.log(`🚀 Upload de l'image ${fileName} vers IPFS...`);
      const result = await lighthouse.upload(
        filePath,
        LIGHTHOUSE_API_KEY
      );
      
      // Récupérer le CID
      const cid = result.data.Hash;
      console.log(`✅ Upload réussi! CID: ${cid}`);
      
      // Retourner l'URL IPFS
      const ipfsUrl = `ipfs://${cid}`;
      return ipfsUrl;
      
    } catch (error) {
      console.error(`❌ [Tentative ${attempts}/${maxRetries}] Erreur lors de la génération et de l'upload de l'image:`, error);
      
      // Si dernière tentative, propager l'erreur
      if (attempts >= maxRetries) {
        throw new Error(`Impossible de générer et uploader l'image après ${maxRetries} tentatives: ${error}`);
      }
      
      // Sinon, attendre avant de réessayer
      console.log(`⏳ Nouvelle tentative dans 1 seconde...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Cas improbable où la boucle se termine sans retour ou erreur
  throw new Error("Impossible de générer et uploader l'image: erreur inconnue");
}

/**
 * Convertit une URL IPFS en URL HTTP
 */
export function ipfsToHttp(ipfsUrl: string): string {
  if (!ipfsUrl) return "";
  if (ipfsUrl.startsWith("ipfs://")) {
    const cid = ipfsUrl.replace("ipfs://", "");
    return `https://gateway.lighthouse.storage/ipfs/${cid}`;
  }
  return ipfsUrl;
}

/**
 * Récupère une URL HTTP pour une URL d'image donnée, qu'elle soit IPFS ou HTTP
 * @param imageUrl URL de l'image (IPFS ou HTTP)
 */
export function getAccessibleImageUrl(imageUrl: string | null): string {
  if (!imageUrl) return "";
  return ipfsToHttp(imageUrl);
} 