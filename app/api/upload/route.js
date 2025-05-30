import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "../drive/uploads");

export async function POST(req) {
    try {
        const formData = await req.formData();
        const chunk = formData.get("file");
        const fileName = formData.get("fileName");
        const relativePath = formData.get("relativePath");
        const chunkIndex = parseInt(formData.get("chunkIndex"), 10);
        const totalChunks = parseInt(formData.get("totalChunks"), 10);

        if (!chunk || !fileName || !relativePath) {
            return NextResponse.json({ error: "Missing file or relative path" }, { status: 400 });
        }

        const filePath = path.join(UPLOAD_DIR, relativePath);
        const chunkPath = `${filePath}.part${chunkIndex}`;

        // Ensure directory exists
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

        // Save the chunk asynchronously
        const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
        await fs.promises.writeFile(chunkPath, chunkBuffer);
        console.log(`Chunk ${chunkIndex + 1}/${totalChunks} saved: ${chunkPath}`);

        // If last chunk, merge all chunks
        if (chunkIndex === totalChunks - 1) {
            console.log(`Merging file: ${filePath}`);
            await mergeChunks(filePath, totalChunks);
            console.log(`File successfully uploaded: ${filePath}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json({ error: "File Upload Failed" }, { status: 500 });
    }
}

async function mergeChunks(filePath, totalChunks) {
    try {
        const writeStream = fs.createWriteStream(filePath, { flags: "w" });

        for (let i = 0; i < totalChunks; i++) {
            const partPath = `${filePath}.part${i}`;

            if (!fs.existsSync(partPath)) {
                throw new Error(`Missing chunk ${i}`);
            }

            // Read chunk as buffer 
            const chunkBuffer = await fs.promises.readFile(partPath);
            writeStream.write(chunkBuffer);

            // Delete chunk after writing
            await fs.promises.unlink(partPath);
        }

        writeStream.end();
    } catch (error) {
        console.error("Error merging chunks:", error);
        throw error;
    }
}
