import { Handler } from "aws-lambda";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { v4 as uuid } from "uuid";

const PRODUCTS_TABLE_NAME = "products";

const db = DynamoDBDocument.from(new DynamoDB());

export const createProduct: Handler = async (event) => {
  const id = uuid();
  try {
    const { title, description = "", price = 0 } = JSON.parse(event.body);
    const product = {
      TransactItems: [
        {
          Put: {
            TableName: PRODUCTS_TABLE_NAME,
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

    const result = await db.transactWrite(product);
    console.log("Product added:", JSON.stringify(result, null, 2));
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    };
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error adding of product");
  }
};
