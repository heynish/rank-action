/** @jsxImportSource frog/jsx */

import { Button, Frog } from 'frog'
import { devtools } from 'frog/dev'
import { neynar as neynarHub } from 'frog/hubs'
import { neynar } from "frog/middlewares";
import { handle } from 'frog/next'
import { serveStatic } from 'frog/serve-static';
import { CastParamType, NeynarAPIClient } from "@neynar/nodejs-sdk";

const neynarClient = new NeynarAPIClient(`${process.env.NEYNAR_API_KEY}`);

const ADD_URL =
  "https://warpcast.com/~/add-cast-action?url=https://rank-action.vercel.app/api/rank-action";

const app = new Frog({
  assetsPath: "/",
  basePath: "/api",
  hub: neynarHub({ apiKey: `${process.env.NEYNAR_API_KEY}` }),
  //browserLocation: ADD_URL,
}).use(
  neynar({
    apiKey: `${process.env.NEYNAR_API_KEY}`,
    features: ["interactor", "cast"],
  })
);

app.frame('/', (c) => {
  return c.res({
    image: '/1.png',
    intents: [
      <Button.Link
        href={ADD_URL}
      >
        Add Global Rank
      </Button.Link>,
    ],
  })
});

// Cast action GET handler
app.get("/rank-action", async (c) => {
  return c.json({
    name: "Check Rank",
    icon: "thumbsup",
    description: "Give casts 'upthumbs' and see them on a leaderboard.",
    aboutUrl: "https://github.com/horsefacts/upthumbs",
    action: {
      type: "post",
    },
  });
});

app.post('/rank-action', async (c) => {
  try {
    const {
      trustedData: { messageBytes },
    } = await c.req.json();

    const result = await neynarClient.validateFrameAction(messageBytes);
    if (result.valid) {
      const cast = await neynarClient.lookUpCastByHashOrWarpcastUrl(
        result.action.cast.hash,
        CastParamType.Hash
      );
      const {
        cast: {
          author: { fid, username },
        },
      } = cast;

      const response = await fetch('https://graph.cast.k3l.io/scores/global/following/handles', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([username])
      })

      if (!response.ok) {
        return c.json({ message: 'Failed to call Openrank API' }, 400);
      }

      const data = await response.json();

      let message = `Rank:${data.result.rank} & ${data.result.fid}`;
      return c.json({ message });
    }
  } catch (e) {
    return c.json({ message: "Error. Try Again." }, 500);
  }
});

devtools(app, { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
