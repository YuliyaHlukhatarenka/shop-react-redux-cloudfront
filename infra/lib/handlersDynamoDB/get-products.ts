import { Handler } from "aws-lambda";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const PRODUCTS_TABLE_NAME = "products";
const STOCK_TABLE_NAME = "stock";

const dynamoDB = new DynamoDBClient({ region: "us-east-1" });

export const getProductsFromDynamoDB: Handler = async () => {
  const productsData = await dynamoDB.send(
    new ScanCommand({
      TableName: PRODUCTS_TABLE_NAME,
    })
  );

  const stocksData = await dynamoDB.send(
    new ScanCommand({
      TableName: STOCK_TABLE_NAME,
    })
  );

  const result = productsData?.Items
    ? productsData.Items.map((product) => ({
        ...product,
        count: stocksData?.Items
          ? stocksData.Items.find(
              ({ product_id }) => product_id === product?.id
            )?.count || 0
          : 0,
      }))
    : [];
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  };
};
