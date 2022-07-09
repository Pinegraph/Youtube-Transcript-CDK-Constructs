import {
  APIGatewayEventRequestContextV2,
  APIGatewayProxyEventV2,
} from "aws-lambda";
import p from "phin";

const RE_YOUTUBE =
  /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/im;

export interface TranscriptResponse {
  text: string;
  duration: number;
  offset: number;
}

function getSecureHeaders(origin?: string) {
  const headers = new Array();
  headers.push({ key: "content-security-policy", value: "default-src 'self'" });
  headers.push({
    key: "strict-transport-security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
  headers.push({ key: "x-content-type-options", value: "nosniff" });
  headers.push({ key: "x-frame-options", value: "DENY" });
  headers.push({ key: "x-xss-protection", value: "1; mode=block" });
  headers.push({ key: "access-control-allow-origin", value: origin || "*" });
  headers.push({ key: "access-control-allow-credentials", value: true });
  headers.push({ key: "access-control-allow-headers", value: "content-type" });
  return headers;
}

export interface TranscriptErrorCode {
  errorCode:
    | "VIDEO_DOES_NOT_HAVE_TRANSCRIPT"
    | "DOMAIN_DOES_NOT_HAVE_ACCESS"
    | "MISSING_PARAMS";
  errorMessage?: string;
}

const DOMAIN_DOES_NOT_HAVE_ACCESS_ERROR: TranscriptErrorCode = {
  errorCode: "DOMAIN_DOES_NOT_HAVE_ACCESS",
};

export async function handler(
  event: APIGatewayProxyEventV2,
  context: APIGatewayEventRequestContextV2,
  callback: any
) {
  const origin = event.headers.origin;
  const listOfHeaders = getSecureHeaders(origin);
  const headers: any = {};
  for (const header of listOfHeaders) {
    headers[header.key] = header.value;
  }
  if (event.requestContext.http.method === "OPTIONS") {
    callback(null, {
      isBase64Encoded: false,
      statusCode: 200,
      headers,
    });
  }
  if (process.env.ALLOWED_DOMAINS) {
    const allowedDomains: string[] = JSON.parse(process.env.ALLOWED_DOMAINS);
    if (origin && !allowedDomains.includes(origin)) {
      callback(null, {
        isBase64Encoded: false,
        statusCode: 400,
        body: JSON.stringify(DOMAIN_DOES_NOT_HAVE_ACCESS_ERROR),
        headers,
      });
    }
  }
  if (!event.queryStringParameters) {
    const error: TranscriptErrorCode = {
      errorCode: "MISSING_PARAMS",
      errorMessage: "Missing required query param of videoID.",
    };
    callback(null, {
      isBase64Encoded: false,
      statusCode: 400,
      body: JSON.stringify(error),
      headers,
    });
    return;
  }
  const body = event.queryStringParameters;
  const videoID: string | undefined = body.videoID;
  const lang: string | undefined = body.lang;
  const country: string | undefined = body.country;
  if (!videoID) {
    const error: TranscriptErrorCode = {
      errorCode: "MISSING_PARAMS",
      errorMessage: "Missing required query param of videoID.",
    };
    callback(null, {
      isBase64Encoded: false,
      statusCode: 400,
      body: JSON.stringify(error),
      headers,
    });
    return;
  }
  const identifier = retrieveVideoId(videoID);
  const { body: videoPageBody } = await p(
    `https://www.youtube.com/watch?v=${identifier}`
  );
  const innerTubeApiKey = videoPageBody
    .toString()
    .split('"INNERTUBE_API_KEY":"')[1]
    .split('"')[0];

  if (innerTubeApiKey && innerTubeApiKey.length > 0) {
    const { body }: { body: Record<string, any> } = await p({
      url: `https://www.youtube.com/youtubei/v1/get_transcript?key=${innerTubeApiKey}`,
      method: "POST",
      data: generateRequest(videoPageBody.toString(), lang, country),
      parse: "json",
    });
    if (body.responseContext) {
      if (!body.actions) {
        const error: TranscriptErrorCode = {
          errorCode: "VIDEO_DOES_NOT_HAVE_TRANSCRIPT",
        };
        callback(null, {
          isBase64Encoded: false,
          statusCode: 200,
          body: JSON.stringify(error),
          headers,
        });
        return;
      }
      const transcripts =
        body.actions[0].updateEngagementPanelAction.content.transcriptRenderer
          .body.transcriptBodyRenderer.cueGroups;

      const res: TranscriptResponse[] = transcripts.map((cue: any) => ({
        text: cue.transcriptCueGroupRenderer.cues[0].transcriptCueRenderer.cue
          .simpleText,
        duration: parseInt(
          cue.transcriptCueGroupRenderer.cues[0].transcriptCueRenderer
            .durationMs
        ),
        offset: parseInt(
          cue.transcriptCueGroupRenderer.cues[0].transcriptCueRenderer
            .startOffsetMs
        ),
      }));
      callback(null, {
        isBase64Encoded: false,
        statusCode: 200,
        body: JSON.stringify(res),
        headers,
      });
      return;
    }
  }
}

/**
 * Generate tracking params for YTB API
 * @param page
 * @param config
 */
function generateRequest(page: string, lang?: string, country?: string) {
  const params = page.split('"serializedShareEntity":"')[1]?.split('"')[0];
  const visitorData = page.split('"VISITOR_DATA":"')[1]?.split('"')[0];
  const sessionId = page.split('"sessionId":"')[1]?.split('"')[0];
  const clickTrackingParams = page
    ?.split('"clickTrackingParams":"')[1]
    ?.split('"')[0];
  return {
    context: {
      client: {
        hl: lang || "en",
        gl: country || "US",
        visitorData,
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)",
        clientName: "WEB",
        clientVersion: "2.20200925.01.00",
        osName: "Macintosh",
        osVersion: "10_15_4",
        browserName: "Chrome",
        browserVersion: "85.0f.4183.83",
        screenWidthPoints: 1440,
        screenHeightPoints: 770,
        screenPixelDensity: 2,
        utcOffsetMinutes: 120,
        userInterfaceTheme: "USER_INTERFACE_THEME_LIGHT",
        connectionType: "CONN_CELLULAR_3G",
      },
      request: {
        sessionId,
        internalExperimentFlags: [],
        consistencyTokenJars: [],
      },
      user: {},
      clientScreenNonce: generateNonce(),
      clickTracking: {
        clickTrackingParams,
      },
    },
    params,
  };
}

/**
 *  'base.js' function
 */
function generateNonce() {
  const rnd = Math.random().toString();
  const alphabet =
    "ABCDEFGHIJKLMOPQRSTUVWXYZabcdefghjijklmnopqrstuvwxyz0123456789";
  const jda = [
    alphabet + "+/=",
    alphabet + "+/",
    alphabet + "-_=",
    alphabet + "-_.",
    alphabet + "-_",
  ];
  const b = jda[3];
  const a = [];
  for (let i = 0; i < rnd.length - 1; i++) {
    a.push(rnd[i].charCodeAt(i));
  }
  let c = "";
  let d = 0;
  let m, n, q, r, f, g;
  while (d < a.length) {
    f = a[d];
    g = d + 1 < a.length;

    if (g) {
      m = a[d + 1];
    } else {
      m = 0;
    }
    n = d + 2 < a.length;
    if (n) {
      q = a[d + 2];
    } else {
      q = 0;
    }
    r = f >> 2;
    f = ((f & 3) << 4) | (m >> 4);
    m = ((m & 15) << 2) | (q >> 6);
    q &= 63;
    if (!n) {
      q = 64;
      if (!q) {
        m = 64;
      }
    }
    c += b[r] + b[f] + b[m] + b[q];
    d += 3;
  }
  return c;
}

/**
 * Retrieve video id from url or string
 * @param videoId video url or video id
 */
function retrieveVideoId(videoId: string): string | TranscriptErrorCode {
  if (videoId.length === 11) {
    return videoId;
  }
  const matchId = RE_YOUTUBE.exec(videoId);
  if (matchId && matchId.length) {
    return matchId[1];
  }
  return {
    errorCode: "VIDEO_DOES_NOT_HAVE_TRANSCRIPT",
  };
}
