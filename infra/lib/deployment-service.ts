import { Construct } from "constructs";
import {
  aws_cloudfront_origins,
  aws_cloudfront,
  aws_s3_deployment,
  aws_s3,
  CfnOutput,
  RemovalPolicy,
} from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class DeploymentService extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const sources = "../dist";

    const getProductsList = new lambda.Function(this, "getProductsList", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "handlers.getProductsList",
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
    });

    const getAvailableProducts = new lambda.Function(
      this,
      "getAvailableProductsList",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "handlers.getAvailableProducts",
        code: lambda.Code.fromAsset(path.join(__dirname, "./")),
      }
    );

    const getProductsById = new lambda.Function(this, "getProductsById", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "handlers.getProductsById",
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
    });

    const api = new apigateway.RestApi(this, "ProductApi", {
      restApiName: "Product Service API",
      description: "This API serves the product list.",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const getProductsIntegration = new apigateway.LambdaIntegration(
      getProductsList,
      {
        requestTemplates: {
          "application/json": `{ "message": "$input.params('message')" }`,
        },
      }
    );

    const getAvailableProductsIntegration = new apigateway.LambdaIntegration(
      getAvailableProducts,
      {
        requestTemplates: { "application/json": '{ "statusCode": "200" }' },
      }
    );

    const getProductByIdIntegration = new apigateway.LambdaIntegration(
      getProductsById,
      {
        requestTemplates: { "application/json": '{ "statusCode": "200" }' },
      }
    );

    const productsResource = api.root.addResource("products");
    productsResource.addMethod("GET", getProductsIntegration, {
      methodResponses: [{ statusCode: "200" }],
    });

    const availableProductsResource = productsResource.addResource("available");
    availableProductsResource.addMethod("GET", getAvailableProductsIntegration);

    const productByIdResource = productsResource.addResource("{productId}");
    productByIdResource.addMethod("GET", getProductByIdIntegration);

    const hostingBucket = new aws_s3.Bucket(this, "FrontendBucket", {
      autoDeleteObjects: true,
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const distribution = new aws_cloudfront.Distribution(
      this,
      "CloudfrontDistribution",
      {
        defaultBehavior: {
          origin: new aws_cloudfront_origins.S3Origin(hostingBucket),
          viewerProtocolPolicy:
            aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        defaultRootObject: "index.html",
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
        ],
      }
    );
    new aws_s3_deployment.BucketDeployment(this, "BucketDeployment", {
      sources: [aws_s3_deployment.Source.asset(sources)],
      destinationBucket: hostingBucket,
      distribution,
      distributionPaths: ["/*"],
    });
    new CfnOutput(this, "CloudFrontURL", {
      value: distribution.domainName,
      description: "The distribution URL",
      exportName: "CloudfrontURL",
    });
    new CfnOutput(this, "BucketName", {
      value: hostingBucket.bucketName,
      description: "The name of the S3 bucket",
      exportName: "BucketName",
    });
  }
}
