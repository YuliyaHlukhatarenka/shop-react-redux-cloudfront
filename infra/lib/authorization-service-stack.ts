import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export class AuthorizationServiceStack extends cdk.Stack {
  public readonly authorizerFunction: lambda.Function;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const userName = process.env.USERNAME;
    const password = process.env.PASSWORD;
    const credentials = `${userName}=${password}`;

    this.authorizerFunction = new NodejsFunction(this, "BasicAuthorizer", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "handlers/basic-authorizer.basicAuthorizer",
      environment: {
        CREDENTIALS: credentials,
      },
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
    });

    new cdk.CfnOutput(this, "BasicAuthorizerArn", {
      value: this.authorizerFunction.functionArn,
      exportName: "BasicAuthorizerFunctionArn",
    });
  }
}
