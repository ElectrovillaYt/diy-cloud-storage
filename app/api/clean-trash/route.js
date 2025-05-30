export async function GET() {
    try {
        const now = Date.now();
        const files = fs.readdirSync(TRASH_DIR);

        files.forEach(file => {
            const trashPath = path.join(TRASH_DIR, file);
            const metadataPath = trashPath + ".meta.json";

            if (!fs.existsSync(metadataPath)) return;

            const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
            if (now - metadata.deletedAt >= DELETE_AFTER) {
                fs.unlinkSync(trashPath);
                fs.unlinkSync(metadataPath);
                console.log(`Deleted expired trash file: ${file}`);
            }
        });

        return Response.json({ message: "Trash cleaned up" });
    } catch (error) {
        console.error("Error cleaning trash:", error);
        return Response.json({ error: "Failed to clean trash" }, { status: 500 });
    }
}
