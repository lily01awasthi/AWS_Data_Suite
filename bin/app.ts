#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsDataSuiteStack } from '../lib/aws_data_suite-stack';
import { PipelineStack } from '../lib/pipeline';  // Import the PipelineStack

const app = new cdk.App();

// Instantiate the AwsDataSuiteStack
new AwsDataSuiteStack(app, 'AwsDataSuiteStack', {
  env: { account: '717279701867', region: 'us-east-1' },  // Use your AWS account and region
});

// Instantiate the PipelineStack
new PipelineStack(app, 'PipelineStack');

