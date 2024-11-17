import { SQSEvent } from "aws-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";

const PRODUCTS_TABLE = "products";
const db = DynamoDBDocument.from(new DynamoDB());

const SNS_TOPIC_ARN =
  "arn:aws:sns:us-east-1:686255979517:ImportServiceStack-producttopic023CFE50-RHBWaxcRp5mO";

export const catalogBatchProcess = async (event: SQSEvent) => {
  const snsClient = new SNSClient({ region: "us-east-1" });

  for (const record of event.Records) {
    const body = JSON.parse(record.body);

    console.log("parsed project body : ", body);

    try {
      const id = uuid();
      const { title, description = "", price = 0 } = body;
      const product = {
        TransactItems: [
          {
            Put: {
              TableName: PRODUCTS_TABLE,
              Item: {
                id,
                title,
                description,
                price,
              },
            },
          },
        ],
      };

      await db.transactWrite(product);
      console.log(`Product ${id} was created`);

      // Publish message to SNS topic
      const publishCommand = new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Message: JSON.stringify({ title, description, price }),
        Subject: "New product",
      });
      await snsClient.send(publishCommand);
    } catch (error) {
      console.error(error);
    }
  }
};
