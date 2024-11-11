import {
  DynamoDBClient,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { v4 as uuid } from "uuid";

export const productsMock = [
  {
    description: "Orange from Egypt",
    id: uuid(),
    price: 24,
    title: "Orange",
    count: 5,
  },
  {
    description: "Apple from Poland",
    id: uuid(),
    price: 15,
    title: "Apple",
    count: 4,
  },
  {
    description: "Pear from Spain",
    id: uuid(),
    price: 23,
    title: "Pear",
    count: 3,
  },
  {
    description: "Mandarin from Cyprus",
    id: uuid(),
    price: 15,
    title: "Mandarin",
    count: 2,
  },
  {
    description: "Plum from Belarus",
    id: uuid(),
    price: 23,
    title: "Plum",
    count: 1,
  },
];

export const Products = {
  RequestItems: {
    products: productsMock.map(({ description, id, price, title }) => {
      return {
        PutRequest: {
          Item: {
            id: {
              S: id,
            },
            title: {
              S: title,
            },
            description: {
              S: description,
            },
            price: {
              N: price.toString(),
            },
          },
        },
      };
    }),
  },
};

export const Stocks = {
  RequestItems: {
    stock: productsMock.map(({ id, count }) => {
      return {
        PutRequest: {
          Item: {
            product_id: {
              S: id,
            },
            count: {
              N: count.toString(),
            },
          },
        },
      };
    }),
  },
};

const dynamoDB = new DynamoDBClient({ region: "us-east-1" });

const addProducts = async () => {
  try {
    const data = await dynamoDB.send(new BatchWriteItemCommand(Products));
    console.log("Success, items inserted:", data);
  } catch (err) {
    console.error("Error", err);
  }
};

const addStock = async () => {
  try {
    const data = await dynamoDB.send(new BatchWriteItemCommand(Stocks));
    console.log("Success, items inserted:", data);
  } catch (err) {
    console.error("Error", err);
  }
};

addProducts();
addStock();
