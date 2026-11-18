const sourceLimit = 8 * 1024 * 1024;
const photoSize = 288;
const formats = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function prepareProfilePhoto(file: File) {
  if (!formats.has(file.type) && !(file.type === "" && /\.(jpe?g|png|webp)$/i.test(file.name))) {
    throw new Error("Choose a JPG, PNG, or WebP photo.");
  }
  if (!file.size || file.size > sourceLimit) throw new Error("Choose a photo up to 8 MB.");

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    try {
      await image.decode();
    } catch {
      throw new Error("This photo could not be opened. Try another file.");
    }
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = photoSize;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the photo.");
    const edge = Math.min(image.naturalWidth, image.naturalHeight);
    context.fillStyle = "#edf3f1";
    context.fillRect(0, 0, photoSize, photoSize);
    context.drawImage(image, (image.naturalWidth - edge) / 2, (image.naturalHeight - edge) / 2,
      edge, edge, 0, 0, photoSize, photoSize);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((photo) => photo ? resolve(photo) : reject(new Error("Could not resize this photo.")), "image/jpeg", .88);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
