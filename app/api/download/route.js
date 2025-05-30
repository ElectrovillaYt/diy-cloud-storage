import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import archiver from "archiver";

const uploadsDir = path.join(process.cwd(), "../drive/uploads");

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("file");
    const folderPath = searchParams.get("folder");
    if (!filePath && !folderPath) {
      return NextResponse.json({ error: "No file specified" }, { status: 400 });
    }
    if (filePath) {
      const fullPath = path.join(uploadsDir, filePath);

      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      // **Use streaming to handle large files efficiently**
      const stream = fs.createReadStream(fullPath);
      const fileName = path.basename(fullPath);

      return new Response(stream, {
        headers: {
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Type": "application/octet-stream",
        },
      });
    }
    const fullPath = path.join( uploadsDir, folderPath); // Server folder
    const folderName = path.basename(fullPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    const stream = new ReadableStream({
      start(controller) {
        archive.directory(fullPath, false);
        archive.on("data", (chunk) => controller.enqueue(chunk));
        archive.on("end", () => controller.close());
        archive.on("error", (err) => {
          console.error("Archiver error:", err);
          controller.error(err);
        });

        archive.finalize();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${folderName}.zip"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}
