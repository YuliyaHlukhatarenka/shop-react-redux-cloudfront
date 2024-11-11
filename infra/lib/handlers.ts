import { products, availableProducts } from "./data";

export async function getProductsList(event: any) {
  console.log("Request Event: ", event);
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(products),
    statusCode: 200,
  };
}

export async function getAvailableProducts(event: any) {
  console.log("Request Event: ", event);
  return {
    headers: {
      "Access-Control-Allow-Origin": "*", // Adjust this according to your requirements
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(availableProducts),
    statusCode: 200,
  };
}

export async function getProductsById(event: any) {
  console.log("Request Event: ", event);
  const productId = event.pathParameters.productId;
  const product = products.find(({ id }) => id?.toString() === productId);
  return product
    ? {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      }
    : {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Product not found" }),
      };
}
