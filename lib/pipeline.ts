import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an S3 bucket for pipeline artifacts
    const artifactBucket = new s3.Bucket(this, 'PipelineBucket');

    // Define the source output
    const sourceOutput = new codepipeline.Artifact();

    // Define the build output
    const buildOutput = new codepipeline.Artifact();

    // Create a CodeBuild project
    const project = new codebuild.PipelineProject(this, 'CDKBuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0, // The standard image to use for the build
        computeType: codebuild.ComputeType.SMALL,
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'npm install -g aws-cdk', // Install AWS CDK
              'npm install', // Install dependencies
            ],
          },
          build: {
            commands: [
              'npm run build', // Compile the TypeScript files
              'cdk synth', // Synthesize the CDK templates
            ],
          },
        },
        artifacts: {
          'base-directory': 'cdk.out', // Location of the synthesized CDK template
          files: '**/*',
        },
      }),
    });

    // Create the pipeline
    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      artifactBucket: artifactBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: 'GitHub_Source',
              owner: process.env.GITHUB_OWNER || '', // GitHub username
              repo: process.env.GITHUB_REPO || '', // repository name
              oauthToken: cdk.SecretValue.unsafePlainText(process.env.GITHUB_TOKEN || ''), // GitHub personal access token
              output: sourceOutput,
              branch: 'main', // Your repository's default branch
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'CDK_Build',
              project: project,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'CFN_Deploy',
              stackName: 'AwsDataSuiteStack', // CDK stack name
              templatePath: buildOutput.atPath('MyAppStack.template.json'),
              adminPermissions: true, // Ensure the stack has necessary permissions
            }),
          ],
        },
      ],
    });
  }
}

