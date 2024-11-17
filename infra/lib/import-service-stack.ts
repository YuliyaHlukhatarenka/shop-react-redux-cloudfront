import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";

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

    // Create SQS Queue
    const catalogItemsQueue = new sqs.Queue(this, "product-sqs");

    // Create an SNS topic and email subscription
    const productTopic = new sns.Topic(this, "product-topic");

    productTopic.addSubscription(
      new subscriptions.EmailSubscription("julkin@gmail.com")
    );

    // Create lambda function which is triggered by an SQS event.
    const catalogBatchProcess = new lambda.Function(
      this,
      "catalogBatchProcess",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "handlers/catalog-batch-processor.catalogBatchProcess",
        code: lambda.Code.fromAsset(path.join(__dirname, "./")),
        environment: {
          SNS_TOPIC_ARN: productTopic.topicArn,
        },
      }
    );

    catalogBatchProcess.addEventSource(
      new SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );

    productTopic.grantPublish(catalogBatchProcess);

    new cdk.CfnOutput(this, "ImportApiUrl", {
      value: api.url,
      description: "URL of the Import Service API",
    });
  }
}