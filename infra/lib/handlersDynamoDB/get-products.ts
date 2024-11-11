import { Handler } from "aws-lambda";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";

const PRODUCTS_TABLE_NAME = "products";
const STOCK_TABLE_NAME = "stock";

const dynamoDb = DynamoDBDocument.from(new DynamoDB());

export const getProductsFromDynamoDB: Handler = async () => {
  const productsData = await dynamoDb.scan({
    TableName: PRODUCTS_TABLE_NAME,
  });

  const stocksData = await dynamoDb.scan({
    TableName: STOCK_TABLE_NAME,
  });

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
    headers: {
      "Access-Control-Allow-Origin": "*", // Adjust this according to your requirements
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(result),
  };
};
