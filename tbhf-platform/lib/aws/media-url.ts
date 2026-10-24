/** Where the website serves a stored file (safe to import in browser code). */
export const mediaUrl = (bucket: string, path: string) =>
  `/media/${bucket}/${String(path).replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/")}`;
