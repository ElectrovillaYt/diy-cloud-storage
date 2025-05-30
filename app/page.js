"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  Search,
  CloudUploadIcon,
  Folder,
  Plus,
  File,
  Trash,
  HardDrive,
  X,
  Upload,
  Grid,
  List,
  Download,
} from "lucide-react";
import Footer from "@/components/Footer";
import logo from "../app/assets/logo/logo.png";

export default function Home() {
  // const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk
  const [currentPath, setCurrentPath] = useState("/");
  const [uploadProgressVisibility, setUploadBarVisible] = useState(false);
  const [uploadProgress, setUploadPercentage] = useState(0);
  const [isUploadBtnClicked, setUploadBtnState] = useState(false);
  const [fileName, setFileName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [files, setFiles] = useState([]);
  const [Trashfiles, setTrashFiles] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const popupRef = useRef(null);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [activeUploads, setActiveUploads] = useState(0);
  const [totalFilesUploading, setTotalFilesUploading] = useState(0);
  const [completedFiles, setCompletedFiles] = useState(0);
  const [isPopup, setPopup] = useState(false);
  const [isMyFiles, setFileView] = useState(true);
  const [isTrash, setTrashView] = useState(false);
  const [searchVal, searchQuery] = useState("");
  const MAX_CONCURRENT_UPLOADS = 1;

  // Fetch files when path changes
  useEffect(() => {
    fetch(`/api/list-files?path=${encodeURIComponent(currentPath)}`)
      .then((res) => res.json())
      .then((data) => setFiles(Array.isArray(data.files) ? data.files : []))
      .catch((err) => console.error("Error loading files:", err));
  }, [isMyFiles, currentPath]);

  useEffect(() => {
    fetch(`/api/list-trash?path=${encodeURIComponent(currentPath)}`)
      .then((res) => res.json())
      .then((data) => setTrashFiles(Array.isArray(data.files) ? data.files : []))
      .catch((err) => console.error("Error loading files:", err));
  }, [isTrash, currentPath]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setPopup(false);
        setUploadBtnState(false);
      }
    }

    if (isUploadBtnClicked) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUploadBtnClicked]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setPopup(false);
      }
    }

    if (isPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPopup]);

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/list-files");
      if (!response.ok) throw new Error("Failed to fetch files");
      const data = await response.json();
      if (Array.isArray(data.files)) {
        setFiles(data.files);
      } else {
        console.error("Invalid files structure:", data.files);
        setFiles([]);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      setFiles([]);
    }
  };


  const fetchTrashFiles = async () => {
    try {
      const response = await fetch("/api/list-trash");
      if (!response.ok) throw new Error("Failed to fetch trash files");
      const data = await response.json();
      if (Array.isArray(data.trashFiles)) {
        setTrashFiles(data.trashFiles);
      } else {
        console.error("Invalid files structure:", data.trashFiles);
        setTrashFiles([]);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      setTrashFiles([]);
    }
  }

  const ShowTrash = async () => {
    setTrashView(true);
    fetchTrashFiles();
    setFileView(false);
  }

  const ShowMyfiles = async () => {
    setFileView(true);
    fetchFiles();
    setTrashView(false);
  }

  useEffect(() => {// Fetch file list on mount
    fetchFiles();
    fetchTrashFiles();
  }, []);


  const filteredFiles = (files || []).filter(file =>
    file.name.toLowerCase().includes(searchVal.toLowerCase())
  );

  const filteredTrashFiles = (Trashfiles || []).filter(file =>
    file.name.toLowerCase().includes(searchVal.toLowerCase())
  );

  const uploadFileInChunks = async (file, relativePath) => {
    try {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let uploadedChunks = 0;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append("file", chunk);
        formData.append("fileName", file.name);
        formData.append("chunkIndex", i.toString());
        formData.append("totalChunks", totalChunks.toString());
        formData.append("relativePath", relativePath);

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/upload", true);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const fileProgress = Math.round(
                ((uploadedChunks + event.loaded / event.total) / totalChunks) *
                100
              );
              const overallProgress = Math.round(
                (completedFiles * 100 + fileProgress) / totalFilesUploading
              );
              setUploadPercentage(overallProgress);
            }
          };

          xhr.onload = () => {
            if (xhr.status === 200) {
              uploadedChunks++;
              resolve();
            } else {
              reject(new Error(xhr.responseText));
            }
          };

          xhr.onerror = () => reject(new Error("Network error"));
          xhr.send(formData);
        });

        // Small delay between chunks to prevent overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      await fetchFiles();
      return true;
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error);
      throw error;
    }
  };

  const processQueue = async () => {
    if (activeUploads >= MAX_CONCURRENT_UPLOADS || uploadQueue.length === 0)
      return;

    try {
      setActiveUploads((prev) => prev + 1);
      const currentQueue = [...uploadQueue];
      const { file, relativePath } = currentQueue.shift();
      setUploadQueue(currentQueue);

      setFileName(file.name);
      await uploadFileInChunks(file, relativePath);

      setCompletedFiles((prev) => prev + 1);
      setActiveUploads((prev) => prev - 1);

      // Process next file if any
      if (currentQueue.length > 0) {
        processQueue();
      } else {
        setTimeout(() => {
          setUploadBarVisible(false);
          setFileName("");
          setUploadPercentage(0);
          setCompletedFiles(0);
          setTotalFilesUploading(0);
        }, 1000);
      }
    } catch (error) {
      console.error("Error processing queue:", error);
      setActiveUploads((prev) => prev - 1);
      processQueue(); // Try next file
    }
  };

  useEffect(() => {
    if (uploadQueue.length > 0 && activeUploads < MAX_CONCURRENT_UPLOADS) {
      processQueue();
    }
  }, [uploadQueue, activeUploads]);

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    setTotalFilesUploading((prev) => prev + files.length);
    setUploadBarVisible(true);

    const newQueue = files.map((file) => ({
      file,
      relativePath: file.webkitRelativePath || file.name,
    }));

    setUploadQueue((prev) => [...prev, ...newQueue]);

    // // Start processing if not already active
    // if (activeUploads === 0) {
    //   processQueue();
    // }
  };

  const CreateFolder = () => {
    setPopup(true);
  };

  const updateGlobalProgress = () => {
    if (totalFilesUploading === 0) return;

    const progress = Math.round((completedFiles / totalFilesUploading) * 100);
    setUploadPercentage(progress);
  };

  // const handleFolderClick = (folder) => {
  //   setCurrentPath((prevPath) => (prevPath ? `${prevPath}/${folder}` : folder));
  //   //   const files = Array.from(folder.files).map((file) => ({
  //   //     setFiles(file || []);
  //   // }));
  // };

  const handleFolderClick = (folderName) => {
    setCurrentPath(prevPath => {
      if (prevPath === "/") {
        return `/${folderName}`;
      } else {
        return `${prevPath}/${folderName}`;
      }
    });
  };


  const handleBackClick = () => {
    setCurrentPath((prevPath) => {
      if (prevPath === "/") return "/";

      const parts = prevPath.split("/").filter(Boolean); // removes empty strings
      parts.pop(); // remove last folder

      return parts.length ? `/${parts.join("/")}` : "/";
    });
  };

  const moveToTrash = async (fileName) => {
    try {
      const response = await fetch("/api/delete-files", {
        method: "POST",
        body: JSON.stringify({ fileName }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to delete file");

      await fetchFiles(); // Refresh file list
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const downloadElement = async (itemType, fileName) => {
    window.location.href = `/api/download?${itemType}=${encodeURIComponent(
      fileName
    )}`;
  };

  return (
    <div className="content">
      {isPopup && (
        <>
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 1 }} ref={popupRef} className="fixed top-0 left-0 right-0 z-90 flex justify-center pt-4">
            <div className="h-fit w-fit flex flex-col gap-2 justify-center bg-gradient-to-r from-[#4ca6f5] to-[#6c63ff] py-4 px-9 rounded-md text-white shadow-sm poppins-regular">
              <p className="flex justify-center">Enter Folder Name!</p>
              <input type="text" name="folderName" id="folderName" className="bg-transparent border border-purple-200 rounded-md p-1 outline-none" />
            </div>
          </motion.div>
        </>
      )}
      <aside className="fixed shadow-md left-0">
        <div className="h-screen w-fit py-2  bg-white border-r border-[#e1e3e8] poppins-medium sidebar">
          <Link href="/">
            <div className="flex items-center px-2">
              <Image
                src={logo}
                alt="cloudX"
                className="h-[65px] w-[65px]"
                priority
              />
              <h1 className="bg-gradient-to-r bg-clip-text from-[#4ca6f5] to-[#6c63ff] poppins-bold text-2xl text-transparent">
                CloudX
              </h1>
            </div>
          </Link>
          <div className="mt-4 px-5 flex flex-col gap-5">
            {/* Upload Button */}
            <button
              className="relative w-full flex justify-center items-center space-x-2 px-10 py-4 text-sm rounded-lg bg-gradient-to-r from-[#4ca6f5] to-[#6c63ff] text-white hover:from-[#6c63ff] hover:to-[#4ca6f5] hover:scale-[101%] transition-colors duration-150"
              onClick={() => setUploadBtnState(!isUploadBtnClicked)}
            >
              <CloudUploadIcon className="h-6 w-6" />
              <span>Upload</span>
            </button>
            {isUploadBtnClicked && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute w-fit bg-white border border-gray-300 rounded-lg shadow-lg  z-50 flex flex-col gap-2 p-4"
                ref={popupRef}
              >
                <button
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 rounded-lg"
                  onClick={() => document.getElementById("fileInput").click()}
                >
                  <File className="h-5 w-5 stroke-[#6c63ff]" />
                  <span className="text-[#6c63ff]">Upload Files</span>
                </button>
                <input
                  type="file"
                  id="fileInput"
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                />

                <div className="w-full h-[2px] bg-[#6c63ff]/20"></div>
                <button
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 rounded-lg"
                  onClick={() => document.getElementById("folderInput").click()}
                >
                  <Folder className="h-5 w-5 stroke-[#6c63ff]" />
                  <span className="text-[#6c63ff]">Upload Folder</span>
                </button>
                <input
                  type="file"
                  id="folderInput"
                  className="hidden"
                  multiple
                  webkitdirectory="true"
                  onChange={handleFileChange}
                />
              </motion.div>
            )}

            {/* New Folder Create Button */}
            <button
              className="relative w-full flex justify-center items-center space-x-2 px-10 py-4 text-sm rounded-lg border border-[#6c63ff]/80 hover:bg-gray-100 hover:scale-[101%] duration-150"
              onClick={() => { CreateFolder() }}
            >
              <div className="relative">
                <Folder className="h-6 w-6 stroke-[#675ffa]" />
                <div className="absolute bottom-0 right-0 bg-white rounded-full p-[2px] shadow-md">
                  <Plus className="h-3 w-3 stroke-[#675ffa]" />
                </div>
              </div>
              <span className="text-[#6c63ff]">New Folder</span>
            </button>
          </div>

          <div className="mt-4 text-lg px-4 flex flex-col w-full">
            {/* My Files Button */}
            <button className="w-full flex items-center justify-start space-x-4 pl-4 py-4 rounded-lg hover:bg-[#6c63ff]/10 duration-150" onClick={ShowMyfiles}>
              <Folder className="h-6 w-6 stroke-[#675ffa]" />
              <span className="text-[#6c63ff]">My Files</span>
            </button>

            {/* Trash Button */}
            <button className="w-full flex items-center justify-start space-x-4 pl-4 py-4 rounded-lg hover:bg-[#6c63ff]/10 duration-150" onClick={ShowTrash}>
              <Trash className="h-6 w-6 stroke-[#675ffa]" />
              <span className="text-[#6c63ff]">Trash</span>
            </button>
          </div>

          <div className="mt-5 text-lg px-4 flex flex-col w-full">
            <div className="flex px-4  justify-start items-center gap-x-2">
              <HardDrive className="stroke-[#675ffa]" />
              <span className="text-[#675ffa]">Storage</span>
            </div>
            <div className="px-4 mt-1">240 GB</div>
          </div>
        </div>
      </aside>
      <main>
        <div className="min-h-screen w-auto ml-[12vw] flex flex-col gap-6 p-6 poppins-regular">
          <header className="sticky top-0">
            <div className="w-auto h-fit bg-white border-r border-[#e1e3e8] poppins-medium p-4 rounded-xl shadow-md">
              <div className="min-w-0 h-fit p-2 bg-gray-100 flex items-center gap-x-2 rounded-lg">
                <button type="submit">
                  <Search className="stroke-gray-600" />
                </button>
                <input
                  type="search"
                  id="search"
                  placeholder="Search"
                  className="outline-none bg-none w-full"
                  onChange={(e) => searchQuery(e.target.value)}
                />
              </div>
            </div>
          </header>
          <section className="bg-white shadow-md flex-1 rounded-xl p-6">
            <div id="breadcrumb">
              <button
                id="breadcrumb-item"
                className="flex items-center gap-x-1 transition-all hover:bg-[#6c63ff]/10 text-gray-500/80 stroke-gray-500/80 hover:text-gray-500 hover:stroke-gray-500  py-1 px-2 rounded-md"
                data-path="/"
              >
                <Folder className="h-5 w-5" />
                <span role="button" onClick={handleBackClick}>{currentPath}</span>
              </button>
            </div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl">{isTrash == false ? "My Files" : "Trash"}</h2>
              <div className="flex gap-2">
                <button
                  data-view="grid"
                  title="Grid View"
                  className="p-2 rounded-lg bg-none border-none hover:bg-[#6c63ff]/10 transition-all"
                  id="gridViewBtn"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="stroke-gray-500/80 hover:stroke-[#4facfe]" />
                </button>
                <button
                  data-view="list"
                  title="List View"
                  className="p-2 rounded-lg bg-none border-none hover:bg-[#6c63ff]/10 transition-all"
                  id="listViewBtn"
                  onClick={() => setViewMode("list")}
                >
                  <List className="stroke-gray-500/80 hover:stroke-[#4facfe]" />
                </button>
              </div>
            </div>
            {isMyFiles && (
              <>
                <div
                  className="drop-zone border-2 border-dashed border-[#e2e8f0] rounded-lg p-10 text-center bg-[#f8fafc] my-5 mx-0 transition-all"
                  id="dropZone"
                >
                  <div className="flex flex-col items-center gap-3 py-5">
                    <Upload className="stroke-[#64748b]" />
                    <p className="text-[#64748b]">
                      Drag and drop files or folders here
                    </p>
                  </div>
                </div>
                {viewMode == "list" ? (
                  <div
                    className="files-grid grid gap-[1rem] md:grid-cols-1"
                    id="filesContainer"
                  >
                    {filteredFiles.length > 0 && (
                      <>
                        {
                          filteredFiles.map((item, index) => (
                            <div
                              key={index}
                              className="border-b border-gray-500/30 p-2 rounded-lg shadow-sm group flex justify-between items-center cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <div className="bg-[#675ffa]/10 w-fit h-fit p-2 rounded-md">
                                  {item.type === "folder" ? (
                                    <Folder
                                      className="stroke-[#675ffa]/80"
                                      onClick={() => handleFolderClick(item.name)}
                                    />
                                  ) : (
                                    <File className="stroke-[#675ffa]/80" />
                                  )}
                                </div>
                                {item.type === "folder" ? (
                                  <div onClick={() => handleFolderClick(item.name)}>
                                    {item.name}
                                  </div>
                                ) : (
                                  <>
                                    <div>{item.name}</div>
                                  </>
                                )}
                              </div>
                              <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button">
                                  <Download
                                    className="stroke-[#675ffa]/80 h-5 w-5"
                                    onClick={() =>
                                      downloadElement(item.type, item.name)
                                    }
                                  />
                                </button>
                                <button type="button">
                                  <Trash
                                    className="stroke-[#675ffa]/80 h-5 w-5"
                                    onClick={() => moveToTrash(item.name)}
                                  />
                                </button>
                              </div>
                            </div>
                          ))
                        }
                      </>
                    )}
                  </div>
                ) : (
                  <div
                    className="files-grid grid gap-[1rem] grid-cols-2"
                    id="filesContainer"
                  >
                    {filteredFiles.length > 0 &&
                      filteredFiles.map((item, index) => (
                        <div
                          key={index}
                          className="border-b border-gray-500/30 p-2 rounded-lg shadow-sm group flex justify-between items-center"
                        >
                          <div className="flex items-center gap-2">
                            <div className="bg-[#675ffa]/10 w-fit h-fit p-2 rounded-md">
                              {item.type === "folder" ? (
                                <Folder
                                  className="stroke-[#675ffa]/80"
                                  onClick={() => handleFolderClick(item.name)}
                                />
                              ) : (
                                <File className="stroke-[#675ffa]/80" />
                              )}
                            </div>
                            {item.type === "folder" ? (
                              <div onClick={() => handleFolderClick(item.name)}>
                                {item.name}
                              </div>
                            ) : (
                              <>
                                <div>{item.name}</div>
                              </>
                            )}
                          </div>
                          <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button">
                              <Download
                                className="stroke-[#675ffa]/80 h-5 w-5"
                                onClick={() => downloadElement(item.name)}
                              />
                            </button>
                            <button type="button">
                              <Trash
                                className="stroke-[#675ffa]/80 h-5 w-5"
                                onClick={() => moveToTrash(item.name)}
                              />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}




            {isTrash && (
              <>
                {viewMode == "list" ? (
                  <div
                    className="files-grid grid gap-[1rem] md:grid-cols-1"
                    id="filesContainer"
                  >
                    {filteredTrashFiles.length > 0 && (
                      <>
                        {
                          filteredTrashFiles.map((item, index) => (                            
                            <div
                            key={index}
                            className="border-b border-gray-500/30 p-2 rounded-lg shadow-sm group flex justify-between items-center cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <div className="bg-[#675ffa]/10 w-fit h-fit p-2 rounded-md">
                                  {item.type === "folder" ? (
                                    <Folder
                                      className="stroke-[#675ffa]/80"
                                      onClick={() => handleFolderClick(item.name)}
                                    />
                                  ) : (
                                    <File className="stroke-[#675ffa]/80" />
                                  )}
                                </div>
                                {item.type === "folder" ? (
                                  <div onClick={() => handleFolderClick(item.name)}>
                                    {item.name}
                                  </div>
                                ) : (
                                  <>
                                    <div>{item.name}</div>
                                  </>
                                )}
                              </div>
                              <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button">
                                  <Download
                                    className="stroke-[#675ffa]/80 h-5 w-5"
                                    onClick={() =>
                                      downloadElement(item.type, item.name)
                                    }
                                  />
                                </button>
                              </div>
                            </div>
                          ))
                        }
                      </>
                    )}
                  </div>
                ) : (
                  <div
                    className="files-grid grid gap-[1rem] grid-cols-2"
                    id="filesContainer"
                  >
                    {filteredFiles.length > 0 &&
                      filteredFiles.map((item, index) => (
                        <div
                          key={index}
                          className="border-b border-gray-500/30 p-2 rounded-lg shadow-sm group flex justify-between items-center"
                        >
                                                      {console.log(item.expiresIn)}

                          <div className="flex items-center gap-2">
                            <div className="bg-[#675ffa]/10 w-fit h-fit p-2 rounded-md">
                              {item.type === "folder" ? (
                                <Folder
                                  className="stroke-[#675ffa]/80"
                                  onClick={() => handleFolderClick(item.name)}
                                />
                              ) : (
                                <File className="stroke-[#675ffa]/80" />
                              )}
                            </div>
                            {item.type === "folder" ? (
                              <div onClick={() => handleFolderClick(item.name)}>
                                {item.name}
                              </div>
                            ) : (
                              <>
                                <div>{item.name}</div>
                              </>
                            )}
                          </div>
                          <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button">
                              <Download
                                className="stroke-[#675ffa]/80 h-5 w-5"
                                onClick={() => downloadElement(item.type, item.name)}
                              />
                            </button>
                            <button type="button">
                              <Trash
                                className="stroke-[#675ffa]/80 h-5 w-5"
                                onClick={() => moveToTrash(item.name)}
                              />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </section>
          {uploadProgressVisibility && (
            <div className="fixed bottom-[20px] right-[20px] bg-[#1e293b] rounded-lg p-4 z-50 min-w-[300px] transition-all">
              <div className="flex justify-between items-center mb-2">
                <p className="text-white poppins-semibold">
                  Uploading...{" "}
                  <span className="text-clip w-fit">{fileName}</span>
                </p>
                <button className="bg-none border-none text-[#94a3b8] cursor-pointer p-1 rounded-sm transition-all hover:bg-[#334155]">
                  <X />
                </button>
              </div>
              <div className="w-full h-1 bg-[#334155] rounded-xs overflow-hidden mb-2">
                <div
                  className={`h-full  bg-[#3b82f6] transition-[width] duration-300 ease-in-out`}
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="text-[#94a3b8] text-right font-[12px]">
                {uploadProgress}%
              </div>
            </div>
          )}
        </div>
      </main>
      <footer>
        <div className="bg-white border-t border-[#e1e3e8] ">
          <Footer />
        </div>
      </footer>
    </div>
  );
}
