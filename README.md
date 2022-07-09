<div align="center">
  <br />
  <p>
    <a href="https://pinegraph.com/"><img src="https://pinegraph.com/img/favicon.ico" width="100px"/></a>
  </p>
  <br />
  <p>
    <a href="https://discord.gg/MVEUBBX2vB"><img src="https://img.shields.io/discord/955641113673347193?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
    <a href="https://www.npmjs.com/package/@pinegraph/youtube-transcript-cdk-constructs"><img src="https://img.shields.io/npm/v/@pinegraph/analytics-proxy-cdk-constructs.svg?maxAge=3600" alt="npm version" /></a>
  </p>
</div>

# Youtube Transcript Constructs

## What is this?

This package is an [AWS CDK construct](https://aws.amazon.com/cdk/) for hosting a proxy over Youtube's transcript API. It creates a simple API Gateway endpoint that proxies to a Youtube endpoint to get video transcriptions to get around SOP restrictions.

AWS CDK enables people to have infrastructure as code (IAC). That is, with just a few commands, you'll have a fully running and functional production ready service in the cloud.

## Problem

Youtube doesn't expose a way to retrieve transcripts over videos.

## Benefits/ Warning

By using this proxy, you'll be able to get transcripts for videos that include them. However, as this isn't an approved way to retrieve transcripts, it may break without warning in the future.

## Local Setup

You can spin up a local endpoint to use via:

1. `npm run serve`
2. In an incognito browser window, navigate to `http://localhost:3000/transcript?videoID=CGsmf_g9kho`. Where videoID is found as the query param of the youtube video (i.e. `https://www.youtube.com/watch?v=CGsmf_g9kho`.)

## Setup

1. This package assummes that you are familiar with AWS CDK and already have a CDK app created. If not, follow [this tutorial](https://docs.aws.amazon.com/cdk/v2/guide/hello_world.html).
2. Add the construct to your CDK app. See Example CDK App Code below.
3. Run `cdk deploy` from your app package.
4. Look for the API Gateway resource in the stack you included the construct in. You should now be able to invoke an endpoint like `https://[YOUR API ID].execute-api.us-east-1.amazonaws.com/?videoID=CGsmf_g9kho`

## Example CDK App Code

```
  const youtubeTranscriptProxy = new YoutubeTranscriptConstruct(
    this,
    "YoutubeTranscriptProxy",
    {
      region: props.env?.region!,
      accountID: props.env?.account!,
      allowedDomains: ["https://" + props.domainName],
    }
  );
```

## Questions?

Reach out to us on [discord](https://discord.gg/MVEUBBX2vB).

## Releasing

1. `npm run build`
2. `npm publish --access public`
