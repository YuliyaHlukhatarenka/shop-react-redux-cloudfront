import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";

import { aws_secretsmanager as secretsmanager } from "aws-cdk-lib";
const dbName = "TEST_DB";
const dbUser = "test_user";

export class CartStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dbCredentialsSecret = new secretsmanager.Secret(this, "MyDBCreds", {
      secretName: "MyDBCredsName",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: dbUser }),
        generateStringKey: "password",
        excludePunctuation: true,
      },
    });

    const vpc = new ec2.Vpc(this, "MyVPC", {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "MySubnet",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const dbInstance = new rds.DatabaseInstance(this, "RDSInstance", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_12,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      credentials: rds.Credentials.fromSecret(dbCredentialsSecret),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      databaseName: dbName,
    });

    const nestJsFunction = new lambdaNodejs.NodejsFunction(
      this,
      "NestAppLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "main.bootstrap",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../../nodejs-aws-cart-api/dist")
        ),
        bundling: {
          externalModules: [
            "@nestjs/core",
            "@nestjs/common",
            "@nestjs/platform-express",
          ],
          nodeModules: ["nestjs"],
        },
        environment: {
          DB_HOST: dbInstance.dbInstanceEndpointAddress,
          DB_PORT: dbInstance.dbInstanceEndpointPort,
          DB_NAME: dbName,
          DB_SECRET_ARN: dbCredentialsSecret.secretArn,
        },
        vpc,
        allowPublicSubnet: true,
        securityGroups: [dbInstance.connections.securityGroups[0]],
      }
    );
    dbInstance.connections.allowDefaultPortFrom(nestJsFunction);
    dbCredentialsSecret.grantRead(nestJsFunction);

    const api = new RestApi(this, "CartApi", {
      restApiName: "Cart API",
      description: "This service serves a Nest.js application.",
    });

    const lambdaIntegration = new LambdaIntegration(nestJsFunction);

    api.root.addMethod("ANY", lambdaIntegration);
  }
}
