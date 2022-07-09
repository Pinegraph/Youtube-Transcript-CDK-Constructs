import { APIGatewayEventRequestContextV2, APIGatewayProxyEventV2 } from "aws-lambda";
export interface TranscriptResponse {
    text: string;
    duration: number;
    offset: number;
}
export interface TranscriptErrorCode {
    errorCode: "VIDEO_DOES_NOT_HAVE_TRANSCRIPT" | "DOMAIN_DOES_NOT_HAVE_ACCESS" | "MISSING_PARAMS";
    errorMessage?: string;
}
export declare function handler(event: APIGatewayProxyEventV2, context: APIGatewayEventRequestContextV2, callback: any): Promise<void>;
