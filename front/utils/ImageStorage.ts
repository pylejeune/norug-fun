import lighthouse from "@lighthouse-web3/sdk";

const LIGHTHOUSE_API_KEY = process.env.NEXT_PUBLIC_LIGHTHOUSE_KEY as string;

if (!LIGHTHOUSE_API_KEY) {
  throw new Error("LIGHTHOUSE_API_KEY is not defined in environment variables");
}

// Fonction pour compresser une image
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        } else if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error("Failed to compress image"));
            }
          },
          "image/jpeg",
          0.7
        );
      };
    };
    reader.onerror = (error) => reject(error);
  });
}

// Upload vers Lighthouse
export async function uploadImageToIPFS(file: File): Promise<string> {
  try {
    console.log("Starting compression...");
    const compressedFile = await compressImage(file);
    console.log(
      "Original size:",
      file.size,
      "Compressed size:",
      compressedFile.size
    );

    // ✅ Passer un tableau à lighthouse.upload
    const result = await lighthouse.upload(
      [compressedFile],
      LIGHTHOUSE_API_KEY
    );
    const cid = result.data.Hash;
    console.log("Upload successful, CID:", cid);

    return `ipfs://${cid}`;
  } catch (error) {
    console.error("Upload error:", error);
    throw new Error("Failed to upload image to IPFS");
  }
}

// IPFS → HTTP
export function ipfsToHttp(ipfsUrl: string): string {
  if (!ipfsUrl) return "";
  if (ipfsUrl.startsWith("ipfs://")) {
    const cid = ipfsUrl.replace("ipfs://", "");
    return `https://gateway.lighthouse.storage/ipfs/${cid}`;
  }
  return ipfsUrl;
}
