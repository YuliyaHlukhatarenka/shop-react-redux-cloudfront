#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ImportServiceStack } from "../lib/import-service-stack";
import { ProductServiceStack } from "../lib/product-service-stack";

const app = new cdk.App();

new ImportServiceStack(app, "ImportServiceStack", {
  env: { account: "686255979517", region: "us-east-1" },
});

new ProductServiceStack(app, "ProductServiceStack", {
  env: { account: "686255979517", region: "us-east-1" },
});
