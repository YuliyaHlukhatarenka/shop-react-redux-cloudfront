import { S3Event, S3Handler } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import * as csv from "csv-parser";
import * as stream from "stream";

const s3Client = new S3Client({ region: "us-east-1" });
const BUCKET_NAME = process.env.BUCKET_NAME;

export const fileParser: S3Handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const { key } = record.s3.object;

    try {
      const getObjectCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(getObjectCommand);
      const s3Stream = response.Body as stream.Readable;

      s3Stream
        .pipe(csv())
        .on("data", (data) => console.log(data))
        .on("end", () =>
          console.log("CSV file has been successfully processed.")
        )
        .on("error", (error) =>
          console.error("Error processing CSV file:", error)
        );
    } catch (error) {
      console.error(error);
    }
  }
};
