import { Duration, Fn } from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { AssetCode, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

interface Props {
  region: string;
  accountID: string;
  allowedDomains?: string[];
}

export class YoutubeTranscriptConstruct extends Construct {
  gateway: apigatewayv2.CfnApi;
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const lambdaFunction = new Function(this, "YoutubeTranscriptLambda", {
      functionName: "YoutubeTranscriptLambda",
      handler: "src/constructs/youtube-transcript-api.handler",
      runtime: Runtime.NODEJS_14_X,
      code: new AssetCode(
        `node_modules/@pinegraph/youtube-transcript-cdk-constructs/lib/.serverless/transcript.zip`
      ),
      memorySize: 512,
      timeout: Duration.seconds(10),
      environment: props.allowedDomains
        ? {
            ALLOWED_DOMAINS: JSON.stringify(props.allowedDomains),
          }
        : undefined,
    });

    const gateway = new apigatewayv2.CfnApi(
      this,
      "YoutubeTranscriptAPIGateway",
      {
        name: "YoutubeTranscriptAPIGateway",
        description: "Youtube Transcript API Gateway over AWS Lambda.",
        target: lambdaFunction.functionArn,
        protocolType: "HTTP",
      }
    );
    this.gateway = gateway;

    lambdaFunction.addPermission("YoutubeTranscriptAPIGatewayAccessToLambda", {
      principal: new ServicePrincipal("apigateway.amazonaws.com"),
      sourceArn: `arn:aws:execute-api:${props.region}:${
        props.accountID
      }:${Fn.ref(gateway.logicalId)}/*`,
    });
  }
}
