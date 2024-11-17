#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DeployWebAppStack } from "../lib/deploy-web-app-stack";
import { ImportServiceStack } from "../lib/import-service-stack";

const app = new cdk.App();
new DeployWebAppStack(app, "DeployWebAppStack", {
  env: { account: "686255979517", region: "us-east-1" },
});

new ImportServiceStack(app, "ImportServiceStack", {
  env: { account: "686255979517", region: "us-east-1" },
});
