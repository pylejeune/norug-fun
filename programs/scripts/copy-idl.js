// copy-idl.js

import fs from "fs";
import path from "path";

const sourcePath = path.resolve("../programs/target/idl/programs.json");
const destPath = path.resolve("../front/idl/programs.json");

fs.copyFile(sourcePath, destPath, (err) => {
  if (err) {
    console.error("❌ Erreur lors de la copie de l'IDL:", err);
  } else {
    console.log("✅ IDL copié dans le dossier frontend !");
  }
});
