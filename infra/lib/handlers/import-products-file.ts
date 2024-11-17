import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayProxyEvent } from "aws-lambda";

const s3Client = new S3Client({ region: "us-east-1" });
const BUCKET_NAME = process.env.BUCKET_NAME;

export const importProductsFile = async (event: {
  queryStringParameters: { fileName: APIGatewayProxyEvent };
}) => {
  const fileName = event.queryStringParameters?.fileName;

  if (!fileName) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "File name is not defined",
      }),
    };
  }

  try {
    const fileKey = `uploaded/${fileName}`;

    const signedUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
      })
    );

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
      body: JSON.stringify({ signedUrl }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to generate signed URL" }),
    };
  }
};
