import { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm } from "formidable";
const { Deepgram } = require("@deepgram/sdk");
import { connectToDatabase } from "../../lib/dbConnect";

import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    //connect to the database
    const db = await connectToDatabase(process.env.MONGO);

    //get the user
    const userId = await getUserId();

    //get the file from the request
    const { file, conversationId } = await parseFile(req);
    console.log("api", conversationId);

    //save the file to tmp storage
    await saveFileToTmpStorage(file);

    //get the transcription from service
    let transcription = await transcribeAudio(file);

    //save the transcription to the database
    await saveTranscriptionToDatabase({
      userId: userId,
      conversationId: conversationId,
      transcription: transcription,
    });

    res.status(200).json({
      status: "ok",
      conversationId: conversationId,
      transcript: transcription,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: "failed",
      conversationId: "",
      transcript: "",
    });
  }
}

const parseFile = async (req: NextApiRequest): Promise<any> => {
  const form = new IncomingForm();

  return new Promise(async (resolve, reject) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      if (
        files.audio &&
        files.audio.length > 0 &&
        fields.conversationId &&
        fields.conversationId[0]
      ) {
        resolve({
          file: files.audio[0],
          conversationId: fields.conversationId[0],
        });
      } else {
        resolve({
          file: null,
          conversationId: null,
        });
      }
    });
  });
};

const saveFileToTmpStorage = async (file: any) => {
  return new Promise(async (resolve, reject) => {
    const tempPath = file.filepath;

    fs.rename(tempPath, "/tmp/audio.webm", function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(null);
    });
  });
};

const transcribeAudio = async (file: any): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    // Assuming your file is named 'audio.webm' and located in the /tmp folder
    const filePath = "/tmp/audio.webm";
    const deepgram = new Deepgram(process.env.DEEPGRAM);

    let options = {
      smart_format: true,
      model: "nova",
    };

    const response = await deepgram.transcription.preRecorded(
      {
        stream: fs.createReadStream(filePath),
        mimetype: "audio/webm",
      },
      options
    );

    let transcription = response.results.channels[0].alternatives[0].transcript;

    resolve(transcription);
  });
};

const getUserId = async (): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    resolve("user-1");
  });
};

const saveTranscriptionToDatabase = async ({
  userId,
  conversationId,
  transcription,
}: {
  userId: string;
  conversationId: string;
  transcription: string;
}): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    const db = await connectToDatabase(process.env.MONGO);

    //search for the conversation
    let conversation = await db
      .collection("conversations")
      .findOne({ userId: userId, conversationId: conversationId });

    //if the conversation does not exist, create it
    if (conversation == null) {
      conversation = {
        userId: userId,
        conversationId: conversationId,
        transcript: transcription,
      };

      await db.collection("conversations").insertOne(conversation);
    } else {
      //if the conversation exists, append the transcription to the transcript
      conversation = await db
        .collection("conversations")
        .updateOne(
          { userId: userId, conversationId: conversationId },
          { $set: { transcript: conversation.transcript + transcription } }
        );
    }

    resolve(conversation);
  });
};
