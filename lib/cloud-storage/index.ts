// Import the B2 module
const B2 = require("backblaze-b2");

import { Readable } from "stream";

// Define an interface for the input parameters
interface SaveRecordingToCloudStorageParams {
  fileStream: Readable;
  filename: string;
  mimeType: string;
  bucketId: string | undefined;
}

// Initialize the B2 client
const b2 = new B2({
  applicationKeyId: process.env.BACKBLAZE_KEY_ID,
  applicationKey: process.env.BACKBLAZE_KEY,
});

export async function saveRecordingToCloudStorage(
  params: SaveRecordingToCloudStorageParams
): Promise<any> {
  const { fileStream, filename, mimeType, bucketId } = params;

  try {
    // Authorize the B2 client
    await b2.authorize();

    // Get upload URL
    const uploadUrlResponse = await b2.getUploadUrl({ bucketId });
    const uploadUrl = uploadUrlResponse.data.uploadUrl;
    const authToken = uploadUrlResponse.data.authorizationToken;

    // Upload the file
    const uploadResponse = await b2.uploadFile({
      uploadUrl,
      uploadAuthToken: authToken,
      fileName: filename,
      data: fileStream,
      mime: mimeType,
    });

    return uploadResponse.data;
  } catch (error) {
    console.error("Error uploading file to Backblaze B2:", error);
    throw error;
  }
}

export function deleteImageFromCloudStorage({
  applicationKeyId,
  applicationKey,
  bucketId,
  imageUrl,
}: {
  applicationKeyId: string | undefined;
  applicationKey: string | undefined;
  bucketId: string | undefined;
  imageUrl: string | undefined;
}): Promise<null> {
  return new Promise(async (resolve, reject) => {
    try {
      const b2 = new B2({
        applicationKeyId: applicationKeyId,
        applicationKey: applicationKey,
      });

      await b2.authorize(); // must authorize first (authorization lasts 24 hrs)

      //get file name from image url
      let fileName = imageUrl?.split("/").pop();

      let file = await b2.listFileNames({
        bucketId: bucketId,
        startFileName: fileName,
        maxFileCount: 1,
      });

      if (file.data.files.length > 0) {
        let fileId = file.data.files[0].fileId;
        let delFile = await b2.deleteFileVersion({
          fileId: fileId,
          fileName: fileName,
        });
      }

      resolve(null);
    } catch {
      resolve(null);
    }
  });
}
