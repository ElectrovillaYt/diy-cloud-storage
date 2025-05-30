// import { NextResponse } from "next/server";
// import fs from "fs/promises"; // async fs
// import path from "path";

// const uploadsDir = path.resolve(process.cwd(), "../drive/uploads");

// // **Async function to get files & folders recursively**
// const getFilesRecursively = async (directory) => {
//     try {
//         const dirents = await fs.readdir(directory, { withFileTypes: true }); // Read dir asynchronously
//         const files = await Promise.all(
//             dirents.map(async (dirent) => {
//                 const fullPath = path.join(directory, dirent.name);
//                 const relativePath = path.relative(uploadsDir, fullPath); // Secure relative path

//                 if (dirent.isDirectory()) {
//                     return { name: dirent.name, path: relativePath, type: "folder", children: await getFilesRecursively(fullPath) };
//                 } else {
//                     return { name: dirent.name, path: relativePath, type: "file" };
//                 }
//             })
//         );

//         return files;
//     } catch (error) {
//         console.error("Error reading directory:", error);
//         return [];
//     }
// };

// export async function GET() {
//     try {
//         await fs.mkdir(uploadsDir, { recursive: true }); // Ensure directory exists
//         const files = await getFilesRecursively(uploadsDir);
//         return NextResponse.json(files);
//     } catch (error) {
//         console.error("Error reading directory:", error);
//         return NextResponse.json({ error: "Failed to load files" }, { status: 500 });
//     }
// }


import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Base uploads directory (outside project root)
const uploadsDir = path.resolve(process.cwd(), "../drive/uploads");

// Safely resolve the path inside uploadsDir
const getSafeAbsolutePath = (relativePath = "") => {
  const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, "");
  return path.join(uploadsDir, safePath);
};

// Async function to read files & folders in a directory
const getFilesRecursively = async (directory) => {
  try {
    const dirents = await fs.readdir(directory, { withFileTypes: true });

    const files = await Promise.all(
      dirents.map(async (dirent) => {
        const fullPath = path.join(directory, dirent.name);
        const relativePath = path.relative(uploadsDir, fullPath);

        if (dirent.isDirectory()) {
          return {
            name: dirent.name,
            path: relativePath,
            type: "folder",
            // You can include children here if you want recursive listing
            // children: await getFilesRecursively(fullPath),
          };
        } else {
          return {
            name: dirent.name,
            path: relativePath,
            type: "file",
          };
        }
      })
    );

    return files;
  } catch (error) {
    console.error("Error reading directory:", error);
    return [];
  }
};

// Route handler
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedPath = searchParams.get("path") || "";
    const safeFullPath = getSafeAbsolutePath(requestedPath);

    await fs.mkdir(safeFullPath, { recursive: true });

    const files = await getFilesRecursively(safeFullPath);
    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error reading path:", error);
    return NextResponse.json({ error: "Failed to load files" }, { status: 500 });
  }
}
