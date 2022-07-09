import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import { Construct } from "constructs";
interface Props {
    region: string;
    accountID: string;
    allowedDomains?: string[];
}
export declare class YoutubeTranscriptConstruct extends Construct {
    gateway: apigatewayv2.CfnApi;
    constructor(scope: Construct, id: string, props: Props);
}
export {};
