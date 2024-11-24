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
import * as dynamoDb from "aws-cdk-lib/aws-dynamodb";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const sources = "../dist";

    const productsTable = dynamoDb.Table.fromTableName(
      this,
      "products",
      "products"
    );
    const stockTable = dynamoDb.Table.fromTableName(this, "stock", "stock");
    const layer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "dependencies",
      "arn:aws:lambda:us-east-1:686255979517:layer:dependencies:1"
    );

    const createProduct = new lambda.Function(this, "createProduct", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "handlers/create-product.createProduct",
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
      layers: [layer],
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stockTable.tableName,
      },
    });

    productsTable.grantReadWriteData(createProduct);
    stockTable.grantReadWriteData(createProduct);

    const getProductsList = new lambda.Function(this, "getProductsList", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "handlers/get-products.getProductsFromDynamoDB",
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stockTable.tableName,
      },
    });

    productsTable.grantReadWriteData(getProductsList);
    stockTable.grantReadWriteData(getProductsList);

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
      handler: "handlers/get-product-by-id.getProductByIdFromDynamoDB",
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stockTable.tableName,
      },
    });

    productsTable.grantReadWriteData(getProductsById);
    stockTable.grantReadWriteData(getProductsById);

    const api = new apigateway.RestApi(this, "ProductApi", {
      restApiName: "Product Service API",
      description: "This API serves the product list.",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const createProductIntegration = new apigateway.LambdaIntegration(
      createProduct
    );

    const getProductsIntegration = new apigateway.LambdaIntegration(
      getProductsList
    );

    const getAvailableProductsIntegration = new apigateway.LambdaIntegration(
      getAvailableProducts
    );

    const getProductByIdIntegration = new apigateway.LambdaIntegration(
      getProductsById
    );

    const productsResource = api.root.addResource("products");
    productsResource.addMethod("GET", getProductsIntegration);

    const availableProductsResource = productsResource.addResource("available");
    availableProductsResource.addMethod("GET", getAvailableProductsIntegration);

    const productByIdResource = productsResource.addResource("{productId}");
    productByIdResource.addMethod("GET", getProductByIdIntegration);

    productsResource.addMethod("POST", createProductIntegration);

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
