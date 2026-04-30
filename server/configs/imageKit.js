import ImageKit from "imagekit";

let imagekit = null;

try {
  if (
    process.env.IMAGEKIT_PUBLIC_KEY &&
    process.env.IMAGEKIT_PRIVATE_KEY &&
    process.env.IMAGEKIT_URL_ENDPOINT
  ) {
    imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });
    console.log("ImageKit initialized successfully");
  } else {
    console.warn("⚠️  ImageKit keys missing in .env — image upload features will be disabled.");
  }
} catch (error) {
  console.warn("⚠️  ImageKit initialization failed:", error.message);
}

export default imagekit;