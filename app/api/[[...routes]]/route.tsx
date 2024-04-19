/** @jsxImportSource frog/jsx */

import { Button, Frog } from 'frog'
import { devtools } from 'frog/dev'
import { neynar as neynarHub } from 'frog/hubs'
import { neynar } from "frog/middlewares";
import { handle } from 'frog/next'
import { serveStatic } from 'frog/serve-static';
import { CastParamType, NeynarAPIClient } from "@neynar/nodejs-sdk";
import { addUser, incrementUserTotalLoads } from '../../core/addUser'


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

app.frame('/', async (c) => {
  const { buttonValue, verified, frameData } = c;
  if (buttonValue === "First") {
    if (!verified) {
      console.log("Is verified");
      return c.res({
        image: '/notverified.png',
        intents: [
          <Button value="First">My Rank</Button>,
          <Button.Link
            href={ADD_URL}
          >
            Add Action
          </Button.Link>,
        ],
      });
    }
    const username = c.var.interactor?.username;
    const address = c.var.interactor?.verifiedAddresses.ethAddresses[0];
    const following = c.var.interactor?.viewerContext?.following;
    const userData = {
      username: username || "",
      fid: frameData?.fid || 0,
      address: address || "",
      loads: 1,
      following: following || false,
      recasted: false,
    };
    const totalLoads = await incrementUserTotalLoads(frameData?.fid || 0);
    if (!totalLoads) addUser(userData);

    const response = await fetch('https://graph.cast.k3l.io/scores/global/following/handles', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([username])
    })

    if (!response.ok) {
      return c.res({
        image: '/tryagain.png',
        intents: [
          <Button value="First">My Rank</Button>,
          <Button.Link
            href={ADD_URL}
          >
            Add Action
          </Button.Link>,
        ],
      })
    }

    const data = await response.json();
    console.log('data', data);
    const url = `${process.env.NEXT_PUBLIC_HOST}/api/rank?rank=${data.result[0].rank}&percentile=${data.result[0].percentile}`

    return c.res({
      action: '/',
      image: url,
      intents: [
        <Button.Link
          href={ADD_URL}
        >
          Add Action
        </Button.Link>,
      ],
    })
  }
  return c.res({
    image: '/1.png',
    intents: [
      <Button value="First">My Rank</Button>,
      <Button.Link
        href={ADD_URL}
      >
        Add Action
      </Button.Link>,
    ],
  })
});

// Cast action GET handler
app.get("/rank-action", async (c) => {
  return c.json({
    name: "Global Profile Rank",
    icon: "milestone",
    description: "Global rank of any farcaster account based on Karma3Labs OpenRank APIs for Global Profile Ranking.",
    aboutUrl: "https://docs.karma3labs.com/farcaster/global-profile-ranking-api",
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

      const address = c.var.interactor?.verifiedAddresses.ethAddresses[0];
      const following = c.var.interactor?.viewerContext?.following;
      const userData = {
        username: username || "",
        fid: fid || 0,
        address: address || "",
        loads: 1,
        following: following || false,
        recasted: false,
      };
      const totalLoads = await incrementUserTotalLoads(fid || 0);
      if (!totalLoads) addUser(userData);

      const response = await fetch('https://graph.cast.k3l.io/scores/global/following/handles', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([username])
      })

      if (!response.ok) {
        return c.json({ message: 'Failed to call Openrank API' });
      }

      const data = await response.json();
      console.log('data', data);

      let message = `Rank: ${data.result[0].rank}, Percentile: ${data.result[0].percentile}`;
      return c.json({ message });
    }
  } catch (e) {
    return c.json({ message: "Error. Try Again." });
  }
});

devtools(app, { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
