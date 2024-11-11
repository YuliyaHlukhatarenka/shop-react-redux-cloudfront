import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as iam from "aws-cdk-lib/aws-iam";

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const fileBucket = new s3.Bucket(this, "fileBucket", {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const importFile = new lambda.Function(this, "importFile", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handlers/import-products-file.importProductsFile",
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
      environment: {
        BUCKET_NAME: fileBucket.bucketName,
      },
    });

    fileBucket.grantReadWrite(importFile);

    importFile.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject"],
        resources: [`${fileBucket.bucketArn}/uploaded/*`],
      })
    );

    const fileParser = new lambda.Function(this, "fileParser", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handlers/file-parser.fileParser",
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
      environment: {
        BUCKET_NAME: fileBucket.bucketName,
      },
    });

    fileBucket.grantReadWrite(fileParser);

    // Set up S3 trigger for the uploaded folder in the import bucket
    fileBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(fileParser),
      { prefix: "uploaded/" }
    );

    const api = new apigateway.RestApi(this, "ImportFilesApi", {
      restApiName: "Import Files Service API",
      description: "This API serves the import of files.",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const importProductsFileIntegration = new apigateway.LambdaIntegration(
      importFile
    );

    const productsResource = api.root.addResource("import");
    productsResource.addMethod("GET", importProductsFileIntegration);

    new cdk.CfnOutput(this, "ImportApiUrl", {
      value: api.url,
      description: "URL of the Import Service API",
    });
  }
}
