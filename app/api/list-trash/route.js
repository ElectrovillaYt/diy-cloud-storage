import fs from "fs";
import path from "path";

const TRASH_DIR = path.resolve(process.cwd(), "../drive/trash");
const DELETE_AFTER = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds

export async function GET() {
  try {
    const now = Date.now();

    const files = fs.readdirSync(TRASH_DIR)
      .filter(file => !file.endsWith(".meta.json"))  // just exclude metadata files
      .map(file => {
        const trashPath = path.join(TRASH_DIR, file);
        const stats = fs.lstatSync(trashPath);
        const isFolder = stats.isDirectory();

        const metadataPath = trashPath + ".meta.json";

        let deletedAt = now;

        if (fs.existsSync(metadataPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
            if (metadata.deletedAt) {
              deletedAt = new Date(metadata.deletedAt).getTime();
            }
          } catch (e) {
            console.warn(`Failed to read metadata for ${file}:`, e);
          }
        }

        const expiresIn = DELETE_AFTER - (now - deletedAt);

        return {
          name: file,
          expiresIn,
          url: `/trash/${file}`,
          type: isFolder ? "folder" : "file"  // <-- add type here
        };
      });

    return new Response(JSON.stringify({ trashFiles: files }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });

  } catch (error) {
    console.error("Error listing trash files:", error);
    return new Response(JSON.stringify({ error: "Failed to list trash files" }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    });
  }
}
