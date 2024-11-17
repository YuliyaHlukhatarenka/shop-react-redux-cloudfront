import { S3Event, S3Handler } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import * as csv from "csv-parser";
import * as stream from "stream";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

export const BUCKET_NAME = "importservicestack-filebucketff92cf8f-o3xazo7jol1j";
export const SQS_URL =
  "https://sqs.us-east-1.amazonaws.com/686255979517/ImportServiceStack-productsqs594A7C13-3srJcK6e3uKu";

const s3Client = new S3Client({ region: "us-east-1" });
const sqsClient = new SQSClient({ region: "us-east-1" });

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
        .on("data", async (data: Record<string, string>) => {
          const sendMessageCommand = new SendMessageCommand({
            QueueUrl: SQS_URL,
            MessageBody: JSON.stringify(data),
          });
          await sqsClient.send(sendMessageCommand);
          console.log("Sent message to SQS completed:");
          console.log(data);
        })
        .on("end", () =>
          console.log("CSV file has been successfully processed.")
        )
        .on("error", (error: any) =>
          console.error("Error processing CSV file:", error)
        );
    } catch (error) {
      console.error(error);
    }
  }
};
