import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
} from "aws-lambda";

const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;

export const basicAuthorizer = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  const [login, password] = Buffer.from(
    event.authorizationToken.split(" ")[1],
    "base64"
  )
    .toString()
    .split(":");

  const effect = login === USERNAME && password === PASSWORD ? "Allow" : "Deny";

  return generatePolicy(effect, event.methodArn, login);
};

const generatePolicy = (
  effect: "Allow" | "Deny",
  resource: string,
  principalId: string
): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
};
