import fs from "fs";
import path from "path";

// Sauvegarde des fonctions originales
const originalConsoleLog = console.log;
const originalStdoutWrite = process.stdout.write;

// Configuration des logs
const ENABLE_FILE_LOGGING =
  process.env.NEXT_PUBLIC_ENABLE_FILE_LOGGING === "true";

// Chemin du dossier et du fichier de logs
const logsDir = path.join(process.cwd(), "logs");
const logFilePath = path.join(logsDir, "logs.txt");

// Créer le dossier logs si nécessaire et si les logs fichier sont activés
if (ENABLE_FILE_LOGGING) {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (error) {
    originalConsoleLog("Error creating logs directory:", error);
  }
}

// Variable pour stocker le dernier message
let lastMessage = "";
let lastTimestamp = 0;
const DUPLICATE_TIMEOUT = 1000; // 1 seconde entre les messages identiques

// Fonction pour ajouter un timestamp aux logs en format français
const getTimestamp = () => {
  const date = new Date();
  return date.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
};

// Fonction pour nettoyer les codes ANSI et autres formatages
const cleanMessage = (str: string): string => {
  return (
    str
      // Nettoie les codes ANSI (couleurs, styles, etc.)
      .replace(/\u001b\[\d+m|\u001b\[\d+;\d+m|\u001b\[\d+;\d+;\d+m/g, "")
      // Nettoie les codes de couleur [32m etc.
      .replace(/\[\d+m/g, "")
      // Enlève les guillemets simples colorés
      .replace(/\[32m'|'\[39m/g, "'")
      // Nettoie les espaces multiples
      .replace(/\s+/g, " ")
      // Nettoie les espaces en début et fin
      .trim()
  );
};

// Fonction pour normaliser un message pour la comparaison
const normalizeMessage = (message: string): string => {
  return (
    cleanMessage(message)
      // Enlève les timestamps variables
      .replace(/\d+ms|\d+\.\d+s/g, "")
      // Enlève les adresses variables
      .replace(/0x[a-fA-F0-9]+/g, "")
      // Enlève les nombres variables
      .replace(/\d+/g, "")
  );
};

// Fonction pour écrire dans le fichier de log
const writeToLog = (message: string) => {
  if (!ENABLE_FILE_LOGGING) return;

  const now = Date.now();
  const normalizedMessage = normalizeMessage(message);

  if (
    normalizedMessage === lastMessage &&
    now - lastTimestamp < DUPLICATE_TIMEOUT
  ) {
    return;
  }

  lastMessage = normalizedMessage;
  lastTimestamp = now;

  const cleanedMessage = cleanMessage(message);
  const logMessage = `[${getTimestamp()}] ${cleanedMessage}\n`;
  fs.appendFileSync(logFilePath, logMessage);
};

// Surcharge de console.log
console.log = (...args: any[]) => {
  try {
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
      )
      .join(" ");

    // Écriture dans le fichier si activé
    writeToLog(message);

    // Toujours afficher dans la console
    originalConsoleLog.apply(console, args);
  } catch (error) {
    originalConsoleLog("Error writing to log file:", error);
  }
};

// Surcharge de stdout.write pour les logs de Next.js
process.stdout.write = function (chunk: any) {
  try {
    const message = chunk.toString().trim();
    if (message) {
      writeToLog(message);
    }
  } catch (error) {
    originalConsoleLog("Error writing stdout to log file:", error);
  }
  return originalStdoutWrite.apply(process.stdout, arguments as any);
};
