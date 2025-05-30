import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "../drive/uploads");
const TRASH_DIR = path.join(process.cwd(), "../drive/trash");
const TRASH_METADATA_FILE = path.join(TRASH_DIR, "trash_metadata.json");

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(TRASH_DIR)) {
    fs.mkdirSync(TRASH_DIR, { recursive: true });
}

// Initialize or load trash metadata
function getTrashMetadata() {
    try {
        if (fs.existsSync(TRASH_METADATA_FILE)) {
            return JSON.parse(fs.readFileSync(TRASH_METADATA_FILE, 'utf8'));
        }
        return {};
    } catch (error) {
        console.error("Error reading trash metadata:", error);
        return {};
    }
}

function saveTrashMetadata(metadata) {
    try {
        fs.writeFileSync(TRASH_METADATA_FILE, JSON.stringify(metadata, null, 2));
    } catch (error) {
        console.error("Error saving trash metadata:", error);
    }
}

export async function POST(req) {
    try {
        const { fileName } = await req.json();
        const filePath = path.join(UPLOAD_DIR, fileName);
        const trashPath = path.join(TRASH_DIR, fileName);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return Response.json({ error: "File not found" }, { status: 404 });
        }

        // Generate unique name if file exists in trash
        let finalTrashPath = trashPath;
        let finalTrashName = fileName;
        if (fs.existsSync(trashPath)) {
            const timestamp = Date.now();
            const ext = path.extname(fileName);
            const basename = path.basename(fileName, ext);
            finalTrashName = `${basename}_${timestamp}${ext}`;
            finalTrashPath = path.join(TRASH_DIR, finalTrashName);
        }

        try {
            // Move file to trash
            fs.renameSync(filePath, finalTrashPath);

            // Update trash metadata
            const trashMetadata = getTrashMetadata();
            trashMetadata[finalTrashName] = {
                originalName: fileName,
                originalPath: filePath,
                deletedAt: new Date().toISOString(),
                size: fs.statSync(finalTrashPath).size,
                type: path.extname(fileName) || 'unknown'
            };
            saveTrashMetadata(trashMetadata);

            return Response.json({ 
                message: "File moved to trash",
                trashPath: finalTrashPath 
            });
        } catch (moveError) {
            console.error("Error during file move:", moveError);
            return Response.json({ 
                error: "Failed to move file to trash" 
            }, { status: 500 });
        }

    } catch (error) {
        console.error("Error processing delete request:", error);
        return Response.json({ 
            error: "Failed to process delete request" 
        }, { status: 500 });
    }
}

// Add restore function
export async function PUT(req) {
    try {
        const { fileName } = await req.json();
        const trashPath = path.join(TRASH_DIR, fileName);
        const metadata = getTrashMetadata();
        
        if (!metadata[fileName]) {
            return Response.json({ error: "File not found in trash" }, { status: 404 });
        }

        const originalPath = metadata[fileName].originalPath;
        
        // Restore file
        fs.renameSync(trashPath, originalPath);
        
        // Remove from metadata
        delete metadata[fileName];
        saveTrashMetadata(metadata);

        return Response.json({ message: "File restored successfully" });
    } catch (error) {
        console.error("Error restoring file:", error);
        return Response.json({ error: "Failed to restore file" }, { status: 500 });
    }
}
