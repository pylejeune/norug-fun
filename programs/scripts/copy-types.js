// copy-types.js

import fs from "fs";
import path from "path";

const sourcePath = path.resolve("../programs/target/types/programs.ts");

const destPath = path.resolve("../front/context/types/programs.ts");

fs.copyFile(sourcePath, destPath, (err) => {
  if (err) {
    console.error("❌ Erreur lors de la copie du typage de programs.ts:", err);
  } else {
    console.log("✅ Typage programs.ts copié dans le dossier frontend !");
  }
});
