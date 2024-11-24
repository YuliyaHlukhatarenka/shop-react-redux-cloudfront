#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ImportServiceStack } from "../lib/import-service-stack";
import { ProductServiceStack } from "../lib/product-service-stack";
import { AuthorizationServiceStack } from "../lib/authorization-service-stack";

const app = new cdk.App();

const authorizerStack = new AuthorizationServiceStack(
  app,
  "AuthorizationServiceStack"
);
new ImportServiceStack(
  app,
  "ImportServiceStack",
  authorizerStack.authorizerFunction.functionArn
);
new ProductServiceStack(app, "ProductServiceStack");
