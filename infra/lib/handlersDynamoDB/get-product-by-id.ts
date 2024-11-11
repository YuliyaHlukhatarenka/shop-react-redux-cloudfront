import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

const PRODUCTS_TABLE_NAME = "products";
const STOCK_TABLE_NAME = "stock";

const dynamoDB = new DynamoDBClient({ region: "us-east-1" });

export const getProductByIdFromDynamoDB = async (event: {
  pathParameters: { productId: any };
}) => {
  const { productId } = event.pathParameters;

  const productData = await dynamoDB.send(
    new QueryCommand({
      TableName: PRODUCTS_TABLE_NAME,
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": { S: productId },
      },
    })
  );

  if (!productData?.Items?.length) {
    return {
      statusCode: 204,
      headers: { "Content-Type": "text/plain" },
      body: "Not found",
    };
  }

  const stockData = await dynamoDB.send(
    new QueryCommand({
      TableName: STOCK_TABLE_NAME,
      KeyConditionExpression: "product_id = :product_id",
      ExpressionAttributeValues: {
        ":product_id": { S: productId },
      },
    })
  );

  const count = stockData?.Items?.length ? stockData.Items[0].count : 0;

  const result = {
    ...productData?.Items[0],
    count,
  };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  };
};
