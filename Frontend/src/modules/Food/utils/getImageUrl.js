export const getImageUrl = (url) => {
  if (!url) return "";
  if (typeof url !== "string") {
    return url.url || url.secure_url || url.imageUrl || url.image || url.src || "";
  }

  // If it's already an absolute URL (Cloudinary, http, https, data URI, blob), return as-is
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  // Relative path — prepend backend base URL (strips /api/v1 to hit /uploads/ directly)
  let baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  if (baseUrl.endsWith("/api/v1")) {
    baseUrl = baseUrl.substring(0, baseUrl.length - 7);
  }

  let path = url.startsWith("/") ? url : `/${url}`;
  if (path.startsWith("/api/v1/uploads")) {
    path = path.substring(7); // remove /api/v1
  } else if (!path.startsWith("/uploads")) {
    path = `/uploads${path}`;
  }

  return `${baseUrl}${path}`;
};

